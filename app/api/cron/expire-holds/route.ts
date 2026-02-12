import { NextResponse, connection } from "next/server";
import { prisma } from "@/prisma/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { publishEvent } from "@/lib/services/outbox";

/**
 * Expires HOLD bookings that have passed their hold_expires_at time.
 * This releases time slots back to availability for other customers.
 *
 * Configure this to run every 1-2 minutes via cron-job.org or similar.
 */
export async function GET(request: Request) {
  await connection();
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": "Basic realm='Secure Area'" },
      });
    }

    const [scheme, encoded] = authHeader.split(" ");

    if (scheme !== "Basic" || !encoded) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const decoded = Buffer.from(encoded, "base64").toString();
    const [user, pass] = decoded.split(":");

    const validUser = process.env.CRON_USER || "admin";
    const validPass = process.env.CRON_PASSWORD;

    if (!validPass || user !== validUser || pass !== validPass) {
      console.error("Invalid cron credentials");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const now = new Date();

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
