import {
  AvailedServiceStatus,
  BookingStatus,
  PaymentStatus,
  Prisma,
} from "@/prisma/generated/prisma/client";

/**
 * Promote booking to COMPLETED when all services are done and payment is settled.
 * This keeps booking status consistent regardless of whether service completion
 * or payment settlement happened first.
 */
export async function promoteBookingToCompletedIfEligible(
  tx: Prisma.TransactionClient,
  bookingId: number,
) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      payment_status: true,
    },
  });

  if (!booking) return false;
  if (booking.status === BookingStatus.CANCELLED) return false;
  if (booking.status === BookingStatus.COMPLETED) return false;
  if (booking.payment_status !== PaymentStatus.PAID) return false;

  const remainingUnserved = await tx.availedService.count({
    where: {
      booking_id: bookingId,
      status: {
        notIn: [AvailedServiceStatus.COMPLETED, AvailedServiceStatus.CANCELLED],
      },
    },
  });

  if (remainingUnserved > 0) return false;

  await tx.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.COMPLETED },
  });

  return true;
}
