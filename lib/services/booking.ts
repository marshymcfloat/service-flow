import { prisma } from "@/prisma/prisma";
import { publishEvent } from "./outbox";
import { Prisma } from "@/prisma/generated/prisma/client";

export type BookingServiceParams = {
  businessSlug: string;
  customerId?: string;
  customerName: string;
  services: {
    id: number;
    name: string;
    price: number;
    quantity: number;
    duration?: number;
    claimedByCurrentEmployee?: boolean;
    packageId?: number;
    originalPrice?: number;
    discount?: number;
    discountReason?: string | null;
    commissionBase?: number;
  }[];
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
  estimatedEnd,
  employeeId,
  currentEmployeeId,
  paymentMethod,

  paymentType,
  email,
  voucherCode,
  totalDiscount = 0,
  paymentConfirmed = false,
  paymongoCheckoutSessionId,
  paymongoPaymentIntentId,
  paymongoPaymentMethodId,
  paymongoPaymentId,
}: BookingServiceParams) {
  return await prisma.$transaction(async (tx) => {
    const business = await tx.business.findUnique({
      where: { slug: businessSlug },
    });

    if (!business) {
      throw new Error(`Business with slug ${businessSlug} not found`);
    }

    let finalCustomerId = customerId;

    // Logic to handle existing customer update or lookup
    if (finalCustomerId) {
      const existingCustomer = await tx.customer.findUnique({
        where: { id: finalCustomerId },
      });

      if (existingCustomer) {
        // Update email if provided and not set
        if (email && !existingCustomer.email) {
          await prisma.customer.update({
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

    // Fetch active sale events for validation
    const now = new Date();
    const activeSaleEvents = await tx.saleEvent.findMany({
      where: {
        business: { slug: businessSlug },
        start_date: { lte: now },
        end_date: { gte: now },
      },
      include: {
        applicable_services: { select: { id: true } },
        applicable_packages: { select: { id: true } },
      },
    });

    // Recalculate prices and validate
    const validatedServices = services.map((service) => {
      let finalPrice = service.originalPrice || service.price;
      let discountAmount = 0;
      let discountReason = service.discountReason;

      // Check for applicable sale events
      const applicableEvent = activeSaleEvents
        .filter((event) => {
          if (service.packageId) {
            return event.applicable_packages.some(
              (p) => p.id === service.packageId,
            );
          }
          return event.applicable_services.some((s) => s.id === service.id);
        })
        .sort((a, b) => {
          // Sort by highest discount value (approximation for mixed types)
          const valA =
            a.discount_type === "PERCENTAGE"
              ? (service.originalPrice || service.price) *
                (a.discount_value / 100)
              : a.discount_value;
          const valB =
            b.discount_type === "PERCENTAGE"
              ? (service.originalPrice || service.price) *
                (b.discount_value / 100)
              : b.discount_value;
          return valB - valA;
        })[0];

      if (applicableEvent) {
        let eventDiscount = 0;
        if (applicableEvent.discount_type === "PERCENTAGE") {
          eventDiscount =
            ((service.originalPrice || service.price) *
              applicableEvent.discount_value) /
            100;
        } else {
          eventDiscount = applicableEvent.discount_value;
        }

        // Ensure we don't discount more than the price
        eventDiscount = Math.min(
          eventDiscount,
          service.originalPrice || service.price,
        );

        if (eventDiscount > 0) {
          finalPrice = (service.originalPrice || service.price) - eventDiscount;
          discountAmount = eventDiscount;
          discountReason = applicableEvent.title;
        }
      }

      return {
        ...service,
        price: finalPrice, // Override with server-calculated price
        originalPrice: service.originalPrice || service.price,
        discount: discountAmount,
        discountReason,
      };
    });

    // Use validated services (server-calculated prices) for the total
    const total = validatedServices.reduce(
      (acc, s) => acc + s.price * s.quantity,
      0,
    );

    let voucherId: number | undefined;
    let discountAmount = 0;

    // Check voucher against the VALIDATED total (already sale-discounted)
    const totalToCheck = total;

    if (voucherCode) {
      const voucher = await tx.voucher.findUnique({
        where: { code: voucherCode },
        include: { business: true },
      });

      if (!voucher) {
        throw new Error(`Voucher code ${voucherCode} not found`);
      }

      if (voucher.business.slug !== businessSlug) {
        throw new Error("Voucher not valid for this business");
      }

      if (!voucher.is_active) {
        throw new Error("Voucher is not active");
      }

      if (new Date() > voucher.expires_at) {
        throw new Error("Voucher has expired");
      }

      if (voucher.used_by_id) {
        throw new Error("Voucher has already been used");
      }

      if (total < voucher.minimum_amount) {
        throw new Error(
          `Minimum spend of ${voucher.minimum_amount} required to use this voucher`,
        );
      }

      if (voucher.type === "PERCENTAGE") {
        discountAmount = (total * voucher.value) / 100;
      } else {
        discountAmount = voucher.value;
      }

      // Ensure discount doesn't exceed total
      discountAmount = Math.min(discountAmount, total);
      voucherId = voucher.id;
    } else if (totalDiscount > 0) {
      // Logic for pre-calculated voucher discount
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

    // Use calculated discountAmount if this function calculated it, otherwise use passed totalDiscount
    const finalVoucherDiscount =
      discountAmount > 0 ? discountAmount : totalDiscount;

    const grandTotal = Math.max(0, total - finalVoucherDiscount);
    const downpaymentAmount = isDownpayment ? grandTotal * 0.5 : null;

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
        estimated_end: estimatedEnd,
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
            const originalPrice = s.originalPrice || s.price;
            const finalPrice = s.price;
            const discount = s.discount || originalPrice - finalPrice;
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

    if (voucherId) {
      await tx.voucher.update({
        where: { id: voucherId },
        data: {
          used_by: { connect: { id: booking.id } },
          is_active: false, // Mark as inactive after use
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
        estimatedEnd: estimatedEnd.toISOString(),
        grandTotal,
        status: bookingStatus,
      },
    });

    return booking;
  });
}
