import { NextResponse, connection } from "next/server";
import { prisma } from "@/prisma/prisma";
import { PaymentStatus, Prisma } from "@/prisma/generated/prisma/client";
import { getPayMongoPaymentIntentById } from "@/lib/server actions/paymongo";
import { promoteBookingToCompletedIfEligible } from "@/lib/services/booking-status";
import { publishEvent } from "@/lib/services/outbox";
import { getCurrentDateTimePH } from "@/lib/date-utils";
import {
  isCronAuthorized,
  unauthorizedCronResponse,
} from "@/lib/security/cron-auth";

const BATCH_SIZE = 50;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

function resolvePaymentStatus(
  grandTotal: number,
  amountPaid: number,
): PaymentStatus {
  const roundedGrandTotal = roundMoney(grandTotal);
  const roundedAmountPaid = roundMoney(Math.max(0, amountPaid));

  if (roundedAmountPaid >= roundedGrandTotal) {
    return PaymentStatus.PAID;
  }

  if (roundedAmountPaid > 0) {
    return PaymentStatus.PARTIALLY_PAID;
  }

  return PaymentStatus.UNPAID;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseIntentSnapshot(paymentIntent: unknown) {
  if (!isRecord(paymentIntent)) {
    return { status: null, amountCents: null, currency: null };
  }

  const attrs = isRecord(paymentIntent.attributes) ? paymentIntent.attributes : null;
  const status = typeof attrs?.status === "string" ? attrs.status.toLowerCase() : null;
  const amountCents = typeof attrs?.amount === "number" ? attrs.amount : null;
  const currency =
    typeof attrs?.currency === "string" ? attrs.currency.toUpperCase() : null;

  return { status, amountCents, currency };
}

async function cancelHeldBooking(
  tx: Prisma.TransactionClient,
  booking: { id: number; business_id: string; status: string },
  reason: string,
) {
  if (booking.status !== "HOLD") return;

  const cancelResult = await tx.booking.updateMany({
    where: {
      id: booking.id,
      status: "HOLD",
    },
    data: {
      status: "CANCELLED",
      hold_expires_at: null,
    },
  });

  if (cancelResult.count === 0) return;

  await tx.voucher.updateMany({
    where: {
      used_by_id: booking.id,
    },
    data: {
      used_by_id: null,
      is_active: true,
    },
  });

  await publishEvent(tx, {
    type: "BOOKING_CANCELLED",
    aggregateType: "Booking",
    aggregateId: String(booking.id),
    businessId: booking.business_id,
    payload: {
      bookingId: booking.id,
      reason,
      status: "CANCELLED",
    },
  });
}

export async function GET(request: Request) {
  await connection();
  try {
    if (!isCronAuthorized(request)) {
      console.error("Invalid cron credentials");
      return unauthorizedCronResponse();
    }

    const now = getCurrentDateTimePH();

    const pendingAttempts = await prisma.bookingPayment.findMany({
      where: {
        status: "PENDING",
        payment_method: "QRPH",
        paymongo_payment_intent_id: {
          not: null,
        },
      },
      orderBy: {
        created_at: "asc",
      },
      take: BATCH_SIZE,
      include: {
        booking: {
          select: {
            id: true,
            business_id: true,
            status: true,
            grand_total: true,
            amount_paid: true,
            hold_expires_at: true,
          },
        },
      },
    });

    const summary = {
      scanned: pendingAttempts.length,
      succeeded: 0,
      expired: 0,
      failed: 0,
      canceled: 0,
      mismatched: 0,
      skipped: 0,
      errors: 0,
      processedAt: now.toISOString(),
    };

    for (const attempt of pendingAttempts) {
      try {
        const intent = await getPayMongoPaymentIntentById(
          attempt.paymongo_payment_intent_id!,
        );
        const snapshot = parseIntentSnapshot(intent);

        if (snapshot.currency && snapshot.currency !== "PHP") {
          await prisma.bookingPayment.update({
            where: { id: attempt.id },
            data: {
              status: "FAILED",
              metadata: {
                reason: "UNEXPECTED_CURRENCY",
                currency: snapshot.currency,
              },
            },
          });
          summary.mismatched += 1;
          continue;
        }

        if (snapshot.status === "succeeded") {
          const expectedChargedCents = Math.round(attempt.amount_charged * 100);
          if (
            snapshot.amountCents !== null &&
            Math.abs(snapshot.amountCents - expectedChargedCents) > 1
          ) {
            await prisma.bookingPayment.update({
              where: { id: attempt.id },
              data: {
                status: "FAILED",
                metadata: {
                  reason: "AMOUNT_MISMATCH",
                  expectedChargedCents,
                  paidAmountCents: snapshot.amountCents,
                },
              },
            });
            summary.mismatched += 1;
            continue;
          }

          await prisma.$transaction(async (tx) => {
            const currentAttempt = await tx.bookingPayment.findUnique({
              where: { id: attempt.id },
              include: {
                booking: {
                  select: {
                    id: true,
                    business_id: true,
                    status: true,
                    grand_total: true,
                    amount_paid: true,
                    hold_expires_at: true,
                  },
                },
              },
            });

            if (!currentAttempt || currentAttempt.status !== "PENDING") return;

            const nextAmountPaid = Math.min(
              currentAttempt.booking.grand_total,
              roundMoney(
                currentAttempt.booking.amount_paid + currentAttempt.amount_principal,
              ),
            );
            const nextPaymentStatus = resolvePaymentStatus(
              currentAttempt.booking.grand_total,
              nextAmountPaid,
            );

            await tx.bookingPayment.update({
              where: { id: currentAttempt.id },
              data: {
                status: "SUCCEEDED",
                paid_at: getCurrentDateTimePH(),
              },
            });

            await tx.booking.update({
              where: { id: currentAttempt.booking.id },
              data: {
                status:
                  currentAttempt.booking.status === "HOLD"
                    ? "ACCEPTED"
                    : currentAttempt.booking.status,
                hold_expires_at:
                  currentAttempt.booking.status === "HOLD"
                    ? null
                    : currentAttempt.booking.hold_expires_at,
                amount_paid: nextAmountPaid,
                payment_status: nextPaymentStatus,
              },
            });

            if (currentAttempt.booking.status === "HOLD") {
              await publishEvent(tx, {
                type: "BOOKING_CONFIRMED",
                aggregateType: "Booking",
                aggregateId: String(currentAttempt.booking.id),
                businessId: currentAttempt.booking.business_id,
                payload: {
                  bookingId: currentAttempt.booking.id,
                  status: "ACCEPTED",
                },
              });
            }

            await promoteBookingToCompletedIfEligible(
              tx,
              currentAttempt.booking.id,
            );
          });

          summary.succeeded += 1;
          continue;
        }

        if (snapshot.status === "failed" || snapshot.status === "canceled") {
          const nextStatus = snapshot.status === "failed" ? "FAILED" : "CANCELED";
          await prisma.$transaction(async (tx) => {
            const currentAttempt = await tx.bookingPayment.findUnique({
              where: { id: attempt.id },
              include: {
                booking: {
                  select: {
                    id: true,
                    business_id: true,
                    status: true,
                  },
                },
              },
            });

            if (!currentAttempt || currentAttempt.status !== "PENDING") return;

            await tx.bookingPayment.update({
              where: { id: currentAttempt.id },
              data: {
                status: nextStatus,
              },
            });

            await cancelHeldBooking(
              tx,
              currentAttempt.booking,
              `PAYMENT_${nextStatus}`,
            );
          });

          if (nextStatus === "FAILED") summary.failed += 1;
          else summary.canceled += 1;
          continue;
        }

        const isLocalExpired =
          attempt.expires_at && attempt.expires_at.getTime() <= Date.now();
        if (snapshot.status === "expired" || isLocalExpired) {
          await prisma.$transaction(async (tx) => {
            const currentAttempt = await tx.bookingPayment.findUnique({
              where: { id: attempt.id },
              include: {
                booking: {
                  select: {
                    id: true,
                    business_id: true,
                    status: true,
                  },
                },
              },
            });

            if (!currentAttempt || currentAttempt.status !== "PENDING") return;

            await tx.bookingPayment.update({
              where: { id: currentAttempt.id },
              data: {
                status: "EXPIRED",
              },
            });

            await cancelHeldBooking(tx, currentAttempt.booking, "QR_EXPIRED");
          });
          summary.expired += 1;
          continue;
        }

        summary.skipped += 1;
      } catch (error) {
        summary.errors += 1;
        console.error(
          `Failed to reconcile payment intent ${attempt.paymongo_payment_intent_id}:`,
          error,
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error("Reconcile payments cron error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
