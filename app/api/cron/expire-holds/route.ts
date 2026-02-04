import { NextResponse, connection } from "next/server";
import { prisma } from "@/prisma/prisma";

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

    // Find and cancel expired holds
    const expiredHolds = await prisma.booking.updateMany({
      where: {
        status: "HOLD",
        hold_expires_at: {
          lt: now,
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    console.log(`Expired ${expiredHolds.count} hold bookings`);

    return NextResponse.json({
      success: true,
      expired: expiredHolds.count,
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
