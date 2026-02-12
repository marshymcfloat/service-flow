import { prisma } from "@/prisma/prisma";
import { publishEvent } from "./outbox";
import {
  BookingPaymentType,
  PaymentStatus,
  Prisma,
} from "@/prisma/generated/prisma/client";
import {
  BookingServiceInput,
  buildBookingPricingSnapshot,
} from "./booking-pricing";
import { getQrHoldExpiresAt } from "@/lib/payments/config";
import { getCurrentDateTimePH } from "@/lib/date-utils";

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
  phone?: string;
  voucherCode?: string;
  totalDiscount?: number;
  paymentConfirmed?: boolean;
  paymongoCheckoutSessionId?: string;
  paymongoPaymentIntentId?: string;
  paymongoPaymentMethodId?: string;
  paymongoPaymentId?: string;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const resolvePaymentStatus = (
  grandTotal: number,
  amountPaid: number,
): PaymentStatus => {
  const roundedGrandTotal = roundMoney(grandTotal);
  const roundedAmountPaid = roundMoney(Math.max(0, amountPaid));

  if (roundedAmountPaid >= roundedGrandTotal) {
    return PaymentStatus.PAID;
  }

  if (roundedAmountPaid > 0) {
    return PaymentStatus.PARTIALLY_PAID;
  }

  return PaymentStatus.UNPAID;
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
  phone,
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
        const shouldUpdateEmail = email && !existingCustomer.email;
        const shouldUpdatePhone = phone && !existingCustomer.phone;

        // Fill missing contact details from booking input.
        if (shouldUpdateEmail || shouldUpdatePhone) {
          await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              ...(shouldUpdateEmail ? { email } : {}),
              ...(shouldUpdatePhone ? { phone } : {}),
            },
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
        const shouldUpdateEmail = email && !existingCustomer.email;
        const shouldUpdatePhone = phone && !existingCustomer.phone;

        // Fill missing contact details from booking input.
        if (shouldUpdateEmail || shouldUpdatePhone) {
          await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              ...(shouldUpdateEmail ? { email } : {}),
              ...(shouldUpdatePhone ? { phone } : {}),
            },
          });
        }
      } else {
        const newCustomer = await tx.customer.create({
          data: {
            name: customerName,
            email: email,
            phone: phone,
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
        ? getQrHoldExpiresAt()
        : null;

    const finalVoucherDiscount = pricing.voucherDiscount;
    const grandTotal = pricing.grandTotal;
    const downpaymentAmount = isDownpayment
      ? pricing.downpaymentAmount
      : null;
    const principalAmountForInitialPayment = isDownpayment
      ? downpaymentAmount || 0
      : grandTotal;
    const amountPaid =
      isOnlinePayment && paymentConfirmed
        ? principalAmountForInitialPayment
        : !isOnlinePayment && isDownpayment
          ? principalAmountForInitialPayment
          : 0;
    const paymentStatus = resolvePaymentStatus(grandTotal, amountPaid);

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
        payment_status: paymentStatus,
        amount_paid: amountPaid,
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
            const claimedAt = isClaimed ? getCurrentDateTimePH() : null;

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

    if (isOnlinePayment) {
      const paymentTypeForRecord: BookingPaymentType = isDownpayment
        ? BookingPaymentType.DOWNPAYMENT
        : BookingPaymentType.FULL;

      await tx.bookingPayment.create({
        data: {
          booking_id: booking.id,
          type: paymentTypeForRecord,
          status: paymentConfirmed ? "SUCCEEDED" : "PENDING",
          payment_method: "QRPH",
          amount_principal: principalAmountForInitialPayment,
          amount_charged: pricing.amountToPay,
          paymongo_payment_intent_id: paymongoPaymentIntentId,
          paymongo_payment_method_id: paymongoPaymentMethodId,
          paymongo_payment_id: paymongoPaymentId,
          expires_at: paymentConfirmed ? null : holdExpiresAt,
          paid_at: paymentConfirmed ? getCurrentDateTimePH() : null,
        },
      });
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
