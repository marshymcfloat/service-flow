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
}: CreateBookingParams & { currentEmployeeId?: number }) {
  try {
    const total = services.reduce((sum, s) => s.price * s.quantity + sum, 0);
    const amountToPay = paymentType === "DOWNPAYMENT" ? total * 0.5 : total;

    const totalDuration = services.reduce(
      (sum, s) => sum + (s.duration || 30) * s.quantity,
      0,
    );
    const estimatedEnd = new Date(
      scheduledAt.getTime() + totalDuration * 60 * 1000,
    );

    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
    });

    if (!business) {
      throw new Error("Business not found");
    }

    if (paymentMethod === "CASH") {
      const booking = await createBookingInDb({
        businessSlug,
        customerId,
        customerName,
        services,
        scheduledAt,
        estimatedEnd,
        employeeId,
        currentEmployeeId,
        paymentMethod: "CASH",
        paymentType,
        email,
      });

      revalidatePath(`/app/${businessSlug}`);
      return `/app/${businessSlug}/bookings/${booking.id}?created=true`;
    }

    const line_items = services.map((service) => ({
      name: service.name,
      amount: Math.round(
        service.price * (paymentType === "DOWNPAYMENT" ? 0.5 : 1) * 100,
      ),
      currency: "PHP",
      quantity: service.quantity,
    }));

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
      services: JSON.stringify(
        services.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          quantity: s.quantity,
          duration: s.duration || 30,
          claimedByCurrentEmployee: s.claimedByCurrentEmployee,
          packageId: s.packageId,
          originalPrice: s.originalPrice,
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

    // Note: In production, the webhook will create the booking after payment confirmation.
    // For local development, use ngrok or Vercel preview deployments to test webhooks.

    return checkoutUrl;
  } catch (err) {
    console.error("Error creating booking:", err);
    throw err;
  }
}
