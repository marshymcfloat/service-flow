"use server";

import { createBookingInDb } from "@/lib/services/booking";

import { createPayMongoCheckoutSession } from "./paymongo";
import { prisma } from "@/prisma/prisma";
import { PaymentMethod, PaymentType } from "@/lib/zod schemas/bookings";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

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
}

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
}: CreateBookingParams & { currentEmployeeId?: number }) {
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
      let finalPrice = service.price;
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
          discount = service.price * (applicableSale.discount_value / 100);
        } else {
          discount = applicableSale.discount_value;
        }
        finalPrice = Math.max(0, service.price - discount);
        discountReason = `SALE_EVENT: ${applicableSale.title}`;
      }

      // Determine commission base
      const commissionBase =
        business.commission_calculation_basis === "ORIGINAL_PRICE"
          ? service.price // Original price before sale
          : finalPrice; // Discounted price

      return {
        ...service,
        price: finalPrice, // Update price to be the final price for the booking
        originalPrice: service.price, // Keep track of original
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
    const amountToPay =
      paymentType === "DOWNPAYMENT"
        ? totalAfterDiscounts * 0.5
        : totalAfterDiscounts;

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

      revalidatePath(`/app/${businessSlug}`);
      return `/app/${businessSlug}/bookings/${booking.id}?created=true`;
    }

    let line_items;

    if (voucherDiscount > 0 || processedServices.some((s) => s.discount > 0)) {
      // If ANY discount exists (Sale OR Voucher), use single line item
      line_items = [
        {
          name: `Booking for ${customerName}${voucherCode ? ` (Voucher: ${voucherCode})` : ""}`,
          amount: Math.round(amountToPay * 100),
          currency: "PHP",
          quantity: 1,
          description: `Services: ${processedServices
            .map(
              (s) =>
                `${s.name}${s.discount > 0 ? ` (${s.discountReason})` : ""}`,
            )
            .join(", ")}`,
        },
      ];
    } else {
      line_items = processedServices.map((service) => ({
        name: service.name,
        amount: Math.round(
          service.price * (paymentType === "DOWNPAYMENT" ? 0.5 : 1) * 100,
        ),
        currency: "PHP",
        quantity: service.quantity,
      }));
    }

    const metadata = {
      businessSlug,
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

    const checkoutUrl = await createPayMongoCheckoutSession({
      line_items,
      description: `${paymentType === "DOWNPAYMENT" ? "Downpayment for " : ""}Booking for ${customerName}`,
      metadata,
      success_url: `${baseUrl}/${businessSlug}/booking/success`,
      cancel_url: `${baseUrl}/${businessSlug}/booking?canceled=true`,
      allowed_payment_methods:
        currentEmployeeId && paymentMethod === "QRPH"
          ? ["qrph"]
          : ["qrph", "gcash", "card"],
    });

    return checkoutUrl;
  } catch (err) {
    console.error("Error creating booking:", err);
    throw err;
  }
}
