"use server";

import { createBookingInDb } from "@/lib/services/booking";

import { createPayMongoQrPaymentIntent } from "./paymongo";
import { prisma } from "@/prisma/prisma";
import { PaymentMethod, PaymentType } from "@/lib/zod schemas/bookings";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { buildBookingPricingSnapshot } from "@/lib/services/booking-pricing";
import { createBookingSuccessToken } from "@/lib/security/booking-success-token";
import { rateLimit } from "@/lib/rate-limit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";
import { getQrExpirySeconds } from "@/lib/payments/config";

interface CreateBookingParams {
  customerId?: string;
  customerName: string;
  businessSlug: string;
  scheduledAt: Date;
  employeeId?: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  email?: string;
  phone?: string;
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
      successToken: string;
      expiresAt?: string;
    }
  | { type: "internal"; url: string };

function getPublicAppUrl() {
  const configuredAppUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

  if (!configuredAppUrl) {
    return "http://localhost:3000";
  }

  try {
    const url = new URL(configuredAppUrl);
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid absolute URL");
  }
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
  phone,
  voucherCode,
  isWalkIn = false,
}: CreateBookingParams & {
  currentEmployeeId?: number;
}): Promise<CreateBookingResult> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for") || "";
    const clientIp = forwardedFor.split(",")[0]?.trim() || "unknown";
    const session = await getServerSession(authOptions);

    if (!session) {
      const limiter = rateLimit(`public-booking:${businessSlug}:${clientIp}`, {
        windowMs: 10 * 60 * 1000,
        maxRequests: 8,
      });

      if (!limiter.success) {
        throw new Error(
          "Too many booking attempts. Please wait a few minutes and try again.",
        );
      }
    }

    const pricing = await buildBookingPricingSnapshot({
      db: prisma,
      businessSlug,
      scheduledAt,
      services,
      paymentMethod,
      paymentType,
      voucherCode,
    });
    const processedServices = pricing.services;
    const amountToPay = pricing.amountToPay;
    const estimatedEnd = pricing.estimatedEnd;

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
        phone,
        voucherCode: pricing.voucher?.code,
        totalDiscount: pricing.voucherDiscount,
      });

      if (!isWalkIn) {
        // Email is handled via Outbox (BOOKING_CONFIRMED event)
        // await sendBookingConfirmation(booking.id);
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
      businessName: pricing.business.name,
      customerId,
      customerName,
      email,
      phone,
      scheduledAt: scheduledAt.toISOString(),
      estimatedEnd: estimatedEnd.toISOString(),
      employeeId: employeeId?.toString(),
      currentEmployeeId: currentEmployeeId?.toString(),
      paymentMethod,
      paymentType,
      voucherCode: pricing.voucher?.code,
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

    const publicAppUrl = getPublicAppUrl();
    const returnUrl = new URL(
      `/${businessSlug}/booking/success`,
      `${publicAppUrl}/`,
    ).toString();

    const paymongoDescription = `${pricing.business.name} (${pricing.business.slug}) - ${paymentType === "DOWNPAYMENT" ? "Downpayment for " : ""}Booking for ${customerName}`;

    const qrPayment = await createPayMongoQrPaymentIntent({
      amount: Math.round(amountToPay * 100),
      description: paymongoDescription,
      metadata,
      billing: {
        name: customerName,
        email,
        phone,
      },
      returnUrl,
      expirySeconds: getQrExpirySeconds(),
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
      phone,
      voucherCode: pricing.voucher?.code,
      totalDiscount: pricing.voucherDiscount,
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
      successToken: createBookingSuccessToken({
        bookingId: booking.id,
        businessSlug,
      }),
      expiresAt: qrPayment.expiresAt,
    };
  } catch (err) {
    console.error("Error creating booking:", err);
    throw err;
  }
}
