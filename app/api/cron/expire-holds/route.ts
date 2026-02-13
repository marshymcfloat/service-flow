import { NextResponse, connection } from "next/server";
import { getCurrentDateTimePH } from "@/lib/date-utils";
import { prisma } from "@/prisma/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { publishEvent } from "@/lib/services/outbox";
import {
  isCronAuthorized,
  unauthorizedCronResponse,
} from "@/lib/security/cron-auth";

/**
 * Expires HOLD bookings that have passed their hold_expires_at time.
 * This releases time slots back to availability for other customers.
 *
 * Configure this to run every 1-2 minutes via cron-job.org or similar.
 */
export async function GET(request: Request) {
  await connection();
  try {
    if (!isCronAuthorized(request)) {
      console.error("Invalid cron credentials");
      return unauthorizedCronResponse();
    }

    const now = getCurrentDateTimePH();

    const expiredHolds = await prisma.booking.findMany({
      where: {
        status: "HOLD",
        hold_expires_at: {
          lt: now,
        },
      },
      select: {
        id: true,
        business_id: true,
      },
    });

    for (const booking of expiredHolds) {
      await prisma.$transaction(async (tx) => {
        const cancelResult = await tx.booking.updateMany({
          where: {
            id: booking.id,
            status: "HOLD",
            hold_expires_at: { lt: now },
          },
          data: {
            status: "CANCELLED",
            hold_expires_at: null,
          },
        });

        if (cancelResult.count === 0) {
          return;
        }

        await tx.bookingPayment.updateMany({
          where: {
            booking_id: booking.id,
            status: "PENDING",
          },
          data: {
            status: "EXPIRED",
          },
        });

        await tx.voucher.updateMany({
          where: {
            used_by_id: booking.id,
          },
          data: {
            used_by_id: null,
            is_active: true,
          },
        });

        await publishEvent(tx as Prisma.TransactionClient, {
          type: "BOOKING_CANCELLED",
          aggregateType: "Booking",
          aggregateId: String(booking.id),
          businessId: booking.business_id,
          payload: {
            bookingId: booking.id,
            reason: "HOLD_EXPIRED",
            status: "CANCELLED",
          },
        });
      });
    }

    return NextResponse.json({
      success: true,
      expired: expiredHolds.length,
      processedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Expire holds cron error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
