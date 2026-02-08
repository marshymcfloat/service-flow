"use server";

import { createBookingInDb } from "@/lib/services/booking";

import { createPayMongoQrPaymentIntent } from "./paymongo";
import { prisma } from "@/prisma/prisma";
import { PaymentMethod, PaymentType } from "@/lib/zod schemas/bookings";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendBookingConfirmation } from "@/lib/email/send-booking-details";

interface CreateBookingParams {
  customerId?: string;
  customerName: string;
  businessSlug: string;
  scheduledAt: Date;
  employeeId?: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  email?: string;
  services: {
    id: number;
    name: string;
    price: number;
    quantity: number;
    duration?: number;
    claimedByCurrentEmployee?: boolean;
    packageId?: number;
    originalPrice?: number;
  }[];
  voucherCode?: string;
  isWalkIn?: boolean;
}

export type CreateBookingResult =
  | { type: "redirect"; url: string }
  | {
      type: "qrph";
      paymentIntentId: string;
      paymentMethodId: string;
      bookingId: number;
      qrImage: string;
      expiresAt?: string;
    }
  | { type: "internal"; url: string };

export async function createBooking({
  customerId,
  customerName,
  businessSlug,
  scheduledAt,
  employeeId,
  currentEmployeeId,
  paymentMethod,
  paymentType,
  services,
  email,
  voucherCode,
  isWalkIn = false,
}: CreateBookingParams & {
  currentEmployeeId?: number;
}): Promise<CreateBookingResult> {
  try {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: {
        sale_events: {
          where: {
            start_date: { lte: scheduledAt },
            end_date: { gte: scheduledAt },
          },
          include: {
            applicable_services: true,
            applicable_packages: true,
          },
        },
      },
    });

    if (!business) {
      throw new Error("Business not found");
    }

    // 1. Calculate prices and commissions based on active sales
    const processedServices = services.map((service) => {
      let finalPrice = service.originalPrice || service.price;
      let discount = 0;
      let discountReason = null;

      // Find applicable sale
      const applicableSale = business.sale_events.find(
        (sale) =>
          sale.applicable_services.some((s) => s.id === service.id) ||
          (service.packageId &&
            sale.applicable_packages.some((p) => p.id === service.packageId)),
      );

      if (applicableSale) {
        if (applicableSale.discount_type === "PERCENTAGE") {
          discount =
            (service.originalPrice || service.price) *
            (applicableSale.discount_value / 100);
        } else {
          discount = applicableSale.discount_value;
        }
        finalPrice = Math.max(
          0,
          (service.originalPrice || service.price) - discount,
        );
        discountReason = `SALE_EVENT: ${applicableSale.title}`;
      }

      // Determine commission base
      const commissionBase =
        business.commission_calculation_basis === "ORIGINAL_PRICE"
          ? service.originalPrice || service.price // Original price before sale
          : finalPrice; // Discounted price

      return {
        ...service,
        price: finalPrice, // Update price to be the final price for the booking
        originalPrice: service.originalPrice || service.price, // Keep track of original
        discount,
        discountReason,
        commissionBase,
      };
    });

    // 2. Verify voucher if provided (applied on top of sales?)
    // Usually vouchers are applied on the GRAND TOTAL.
    // Let's calculate total from processedServices
    const subtotal = processedServices.reduce(
      (sum, s) => s.price * s.quantity + sum,
      0,
    );

    let voucherDiscount = 0;
    if (voucherCode) {
      const { verifyVoucherAction } = await import("./vouchers");
      const result = await verifyVoucherAction(
        voucherCode,
        businessSlug,
        subtotal,
      );

      if (result.success && result.data) {
        voucherDiscount = result.data.discountAmount;
      }
    }

    const totalAfterDiscounts = Math.max(0, subtotal - voucherDiscount);
    let amountToPay =
      paymentType === "DOWNPAYMENT"
        ? totalAfterDiscounts * 0.5
        : totalAfterDiscounts;

    // Add 1.5% convenience fee for QR payments
    if (paymentMethod === "QRPH") {
      amountToPay += amountToPay * 0.015;
    }

    const totalDuration = services.reduce(
      (sum, s) => sum + (s.duration || 30) * s.quantity,
      0,
    );
    const estimatedEnd = new Date(
      scheduledAt.getTime() + totalDuration * 60 * 1000,
    );

    if (paymentMethod === "CASH") {
      const booking = await createBookingInDb({
        businessSlug,
        customerId,
        customerName,
        services: processedServices, // Pass processed services
        scheduledAt,
        estimatedEnd,
        employeeId,
        currentEmployeeId,
        paymentMethod: "CASH",
        paymentType,
        email,
        voucherCode,
        totalDiscount: voucherDiscount, // Only voucher discount goes here for now?
        // Wait, createBookingInDb needs to know about per-service details too.
        // I will need to update createBookingInDb signature to accept the extra fields.
      });

      if (!isWalkIn) {
        await sendBookingConfirmation(booking.id);
      }

      revalidatePath(`/app/${businessSlug}`);
      return {
        type: "internal",
        url: `/app/${businessSlug}/bookings/${booking.id}?created=true`,
      };
    }

    if (!email) {
      throw new Error("Email is required for QR payments");
    }

    const metadata = {
      businessSlug,
      businessName: business.name,
      customerId,
      customerName,
      email,
      scheduledAt: scheduledAt.toISOString(),
      estimatedEnd: estimatedEnd.toISOString(),
      employeeId: employeeId?.toString(),
      currentEmployeeId: currentEmployeeId?.toString(),
      paymentMethod,
      paymentType,
      voucherCode,
      isWalkIn: isWalkIn ? "true" : "false",
      services: JSON.stringify(
        processedServices.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          quantity: s.quantity,
          duration: s.duration || 30,
          claimedByCurrentEmployee: s.claimedByCurrentEmployee,
          packageId: s.packageId,
          originalPrice: s.originalPrice,
          discount: s.discount,
          discountReason: s.discountReason,
          commissionBase: s.commissionBase,
        })),
      ),
    };

    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    const paymongoDescription = `${business.name} (${business.slug}) - ${paymentType === "DOWNPAYMENT" ? "Downpayment for " : ""}Booking for ${customerName}`;

    const qrPayment = await createPayMongoQrPaymentIntent({
      amount: Math.round(amountToPay * 100),
      description: paymongoDescription,
      metadata,
      billing: {
        name: customerName,
        email,
      },
      returnUrl: `${baseUrl}/${businessSlug}/booking/success`,
      expirySeconds: 600,
    });

    const booking = await createBookingInDb({
      businessSlug,
      customerId,
      customerName,
      services: processedServices,
      scheduledAt,
      estimatedEnd,
      employeeId,
      currentEmployeeId,
      paymentMethod: "QRPH",
      paymentType,
      email,
      voucherCode,
      totalDiscount: voucherDiscount,
      paymongoPaymentIntentId: qrPayment.paymentIntentId,
      paymongoPaymentMethodId: qrPayment.paymentMethodId,
    });

    revalidatePath(`/app/${businessSlug}`);

    return {
      type: "qrph",
      paymentIntentId: qrPayment.paymentIntentId,
      paymentMethodId: qrPayment.paymentMethodId,
      bookingId: booking.id,
      qrImage: qrPayment.qrImage,
      expiresAt: qrPayment.expiresAt,
    };
  } catch (err) {
    console.error("Error creating booking:", err);
    throw err;
  }
}
