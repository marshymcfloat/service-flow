import { prisma } from "@/prisma/prisma";
import { publishEvent } from "./outbox";
import { Prisma } from "@/prisma/generated/prisma/client";
import {
  BookingServiceInput,
  buildBookingPricingSnapshot,
} from "./booking-pricing";

export type BookingServiceParams = {
  businessSlug: string;
  customerId?: string;
  customerName: string;
  services: (BookingServiceInput & {
    name?: string;
    price?: number;
    originalPrice?: number;
    discount?: number;
    discountReason?: string | null;
    commissionBase?: number;
  })[];
  scheduledAt: Date;
  estimatedEnd: Date;
  employeeId?: number | null;
  currentEmployeeId?: number | null;
  paymentMethod: "CASH" | "QRPH";

  paymentType: "FULL" | "DOWNPAYMENT";
  email?: string;
  voucherCode?: string;
  totalDiscount?: number;
  paymentConfirmed?: boolean;
  paymongoCheckoutSessionId?: string;
  paymongoPaymentIntentId?: string;
  paymongoPaymentMethodId?: string;
  paymongoPaymentId?: string;
};

export async function createBookingInDb({
  businessSlug,
  customerId,
  customerName,
  services,
  scheduledAt,
  employeeId,
  currentEmployeeId,
  paymentMethod,

  paymentType,
  email,
  voucherCode,
  paymentConfirmed = false,
  paymongoCheckoutSessionId,
  paymongoPaymentIntentId,
  paymongoPaymentMethodId,
  paymongoPaymentId,
}: BookingServiceParams) {
  return await prisma.$transaction(async (tx) => {
    const pricing = await buildBookingPricingSnapshot({
      db: tx,
      businessSlug,
      scheduledAt,
      services,
      paymentMethod,
      paymentType,
      voucherCode,
    });
    const { business } = pricing;
    const validatedServices = pricing.services;

    let finalCustomerId = customerId;

    // Logic to handle existing customer update or lookup
    if (finalCustomerId) {
      const existingCustomer = await tx.customer.findUnique({
        where: { id: finalCustomerId },
      });

      if (existingCustomer) {
        // Update email if provided and not set
        if (email && !existingCustomer.email) {
          await tx.customer.update({
            where: { id: existingCustomer.id },
            data: { email },
          });
        }
      }
    } else {
      const existingCustomer = await tx.customer.findFirst({
        where: {
          AND: [
            { business_id: business.id },
            { name: { equals: customerName, mode: "insensitive" } },
          ],
        },
      });

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id;
        // Update email if provided and not set
        if (email && !existingCustomer.email) {
          await tx.customer.update({
            where: { id: existingCustomer.id },
            data: { email },
          });
        }
      } else {
        const newCustomer = await tx.customer.create({
          data: {
            name: customerName,
            email: email,
            business_id: business.id,
          },
        });
        finalCustomerId = newCustomer.id;
      }
    }

    const isDownpayment = paymentType === "DOWNPAYMENT";
    const isOnlinePayment = paymentMethod === "QRPH";

    // Use HOLD status for online payments (will be confirmed after payment)
    // Use ACCEPTED for cash payments (immediate confirmation)
    const bookingStatus =
      isOnlinePayment && !paymentConfirmed ? "HOLD" : "ACCEPTED";
    const holdExpiresAt =
      bookingStatus === "HOLD"
        ? new Date(Date.now() + 10 * 60 * 1000) // 10 minute hold
        : null;

    const finalVoucherDiscount = pricing.voucherDiscount;
    const grandTotal = pricing.grandTotal;
    const downpaymentAmount = isDownpayment
      ? pricing.downpaymentAmount
      : null;

    const booking = await tx.booking.create({
      data: {
        business_id: business.id,
        customer_id: finalCustomerId,
        grand_total: grandTotal,
        total_discount: finalVoucherDiscount, // Store total discount (voucher only?)
        payment_method: paymentMethod,
        paymongo_checkout_session_id: paymongoCheckoutSessionId,
        paymongo_payment_intent_id: paymongoPaymentIntentId,
        paymongo_payment_method_id: paymongoPaymentMethodId,
        paymongo_payment_id: paymongoPaymentId,
        status: bookingStatus,
        hold_expires_at: holdExpiresAt,
        scheduled_at: scheduledAt,
        estimated_end: pricing.estimatedEnd,
        downpayment: downpaymentAmount,
        availed_services: {
          create: validatedServices.map((s, index) => {
            const serviceDuration = s.duration || 30;
            const previousDurations = validatedServices
              .slice(0, index)
              .reduce(
                (sum, prev) => sum + (prev.duration || 30) * prev.quantity,
                0,
              );

            const serviceStart = new Date(
              scheduledAt.getTime() + previousDurations * 60 * 1000,
            );
            const serviceEnd = new Date(
              serviceStart.getTime() + serviceDuration * s.quantity * 60 * 1000,
            );

            const isClaimed = s.claimedByCurrentEmployee && !!currentEmployeeId;
            const serverId = isClaimed ? currentEmployeeId : employeeId;
            const status = isClaimed ? "CLAIMED" : "PENDING";
            const claimedAt = isClaimed ? new Date() : null;

            // Logic for packages
            const originalPrice = s.originalPrice;
            const finalPrice = s.price;
            const discount = s.discount;
            const discountReason =
              s.discountReason || (discount > 0 ? "PACKAGE_OR_MANUAL" : null);

            return {
              service_id: s.id,
              price: originalPrice,
              discount: discount,
              discount_reason: discountReason,
              final_price: finalPrice,
              commission_base: s.commissionBase || finalPrice,
              served_by_id: serverId,
              served_by_type: serverId ? "EMPLOYEE" : null,
              status: status,
              claimed_at: claimedAt,
              scheduled_at: serviceStart,
              estimated_end: serviceEnd,
              package_id: s.packageId,
            };
          }),
        },
      },
    });

    if (pricing.voucher?.id) {
      const reserveVoucher = await tx.voucher.updateMany({
        where: {
          id: pricing.voucher.id,
          is_active: true,
          used_by_id: null,
        },
        data: {
          used_by_id: booking.id,
          is_active: false,
        },
      });

      if (reserveVoucher.count === 0) {
        throw new Error("Voucher is no longer available");
      }
    }

    // Publish outbox event for async processing (emails, etc.)
    const eventType =
      bookingStatus === "ACCEPTED" ? "BOOKING_CONFIRMED" : "BOOKING_CREATED";

    await publishEvent(tx as Prisma.TransactionClient, {
      type: eventType,
      aggregateType: "Booking",
      aggregateId: String(booking.id),
      businessId: business.id,
      payload: {
        bookingId: booking.id,
        customerName,
        email,
        scheduledAt: scheduledAt.toISOString(),
        estimatedEnd: pricing.estimatedEnd.toISOString(),
        grandTotal,
        status: bookingStatus,
      },
    });

    return booking;
  });
}
