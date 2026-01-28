"use server";

import { createPayMongoCheckoutSession } from "./paymongo";
import { prisma } from "@/prisma/prisma";
import { PaymentMethod, PaymentType } from "@/lib/zod schemas/bookings";
import { headers } from "next/headers";

interface CreateBookingParams {
  customerId?: string;
  customerName: string;
  businessSlug: string;
  scheduledAt: Date;
  employeeId?: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  services: {
    id: number;
    name: string;
    price: number;
    quantity: number;
    duration?: number;
    claimedByCurrentEmployee?: boolean;
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
}: CreateBookingParams & { currentEmployeeId?: number }) {
  try {
    // Calculate totals
    const total = services.reduce((sum, s) => s.price * s.quantity + sum, 0);
    const amountToPay = paymentType === "DOWNPAYMENT" ? total * 0.5 : total;

    // Calculate total duration for estimated end time
    const totalDuration = services.reduce(
      (sum, s) => sum + (s.duration || 30) * s.quantity,
      0,
    );
    const estimatedEnd = new Date(
      scheduledAt.getTime() + totalDuration * 60 * 1000,
    );

    // For CASH payments, create booking directly
    if (paymentMethod === "CASH") {
      // Find business
      const business = await prisma.business.findUnique({
        where: { slug: businessSlug },
      });

      if (!business) {
        throw new Error("Business not found");
      }

      // Handle customer
      let finalCustomerId = customerId;
      if (!finalCustomerId) {
        const newCustomer = await prisma.customer.create({
          data: {
            name: customerName,
            business_id: business.id,
          },
        });
        finalCustomerId = newCustomer.id;
      }

      // Create booking with PENDING status for cash
      const booking = await prisma.booking.create({
        data: {
          business_id: business.id,
          customer_id: finalCustomerId,
          grand_total: total,
          total_discount: 0,
          payment_method: "CASH",
          status: "PENDING",
          scheduled_at: scheduledAt,
          estimated_end: estimatedEnd,
          downpayment: paymentType === "DOWNPAYMENT" ? amountToPay : null,
          availed_services: {
            create: services.map((s, index) => {
              const serviceDuration = s.duration || 30;
              const previousDurations = services
                .slice(0, index)
                .reduce(
                  (sum, prev) => sum + (prev.duration || 30) * prev.quantity,
                  0,
                );

              const serviceStart = new Date(
                scheduledAt.getTime() + previousDurations * 60 * 1000,
              );
              const serviceEnd = new Date(
                serviceStart.getTime() +
                  serviceDuration * s.quantity * 60 * 1000,
              );

              // Determine claiming status
              const isClaimed =
                s.claimedByCurrentEmployee && !!currentEmployeeId;
              const serverId = isClaimed ? currentEmployeeId : employeeId;
              const status = isClaimed ? "CLAIMED" : "PENDING";
              const claimedAt = isClaimed ? new Date() : null;

              return {
                service_id: s.id,
                price: s.price,
                discount: 0,
                final_price: s.price,
                commission_base: s.price,
                served_by_id: serverId,
                status: status,
                claimed_at: claimedAt,
                scheduled_at: serviceStart,
                estimated_end: serviceEnd,
              };
            }),
          },
        },
      });

      // Return a confirmation URL or null for cash (no redirect needed)
      return `/app/${businessSlug}/bookings/${booking.id}?created=true`;
    }

    // For QRPH payments, create PayMongo checkout session
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
      scheduledAt: scheduledAt.toISOString(),
      estimatedEnd: estimatedEnd.toISOString(),
      // Pass both preferred employee and current employee (creator)
      employeeId: employeeId?.toString(),
      currentEmployeeId: currentEmployeeId?.toString(),
      paymentMethod,
      paymentType,
      services: JSON.stringify(
        services.map((s) => ({
          id: s.id,
          price: s.price,
          quantity: s.quantity,
          duration: s.duration || 30,
          claimedByCurrentEmployee: s.claimedByCurrentEmployee,
        })),
      ),
    };

    // Dynamically determine base URL to handle dev ports (e.g. 3001) correctly
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    // Fallback to env var if needed, but headers usually work best in dev
    // const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutUrl = await createPayMongoCheckoutSession({
      line_items,
      description: `${paymentType === "DOWNPAYMENT" ? "Downpayment for " : ""}Booking for ${customerName}`,
      metadata,
      success_url: `${baseUrl}/${businessSlug}/booking/success`,
      cancel_url: `${baseUrl}/${businessSlug}/booking?canceled=true`,
    });

    return checkoutUrl;
  } catch (err) {
    console.error("Error creating booking:", err);
    throw err;
  }
}
