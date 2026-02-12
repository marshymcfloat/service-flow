import { NextResponse, connection } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/prisma";
import {
  isCronAuthorized,
  unauthorizedCronResponse,
} from "@/lib/security/cron-auth";
import { detectAndEmitFutureBookingConflicts } from "@/lib/services/booking-conflicts";

const BUSINESS_BATCH_SIZE = 60;

export async function GET(request: Request) {
  await connection();
  try {
    if (!isCronAuthorized(request)) {
      return unauthorizedCronResponse();
    }

    const businesses = await prisma.business.findMany({
      where: {
        booking_v2_enabled: true,
      },
      select: {
        id: true,
        slug: true,
      },
      orderBy: {
        created_at: "asc",
      },
      take: BUSINESS_BATCH_SIZE,
    });

    const perBusiness: {
      businessId: string;
      businessSlug: string;
      scanned: number;
      conflicts: number;
    }[] = [];

    let totalScanned = 0;
    let totalConflicts = 0;

    for (const business of businesses) {
      const result = await detectAndEmitFutureBookingConflicts({
        businessId: business.id,
        trigger: "MANUAL_REVALIDATION",
      });
      totalScanned += result.scanned;
      totalConflicts += result.conflicts;
      perBusiness.push({
        businessId: business.id,
        businessSlug: business.slug,
        scanned: result.scanned,
        conflicts: result.conflicts,
      });
    }

    logger.info("[BookingConflictsCron] Completed", {
      businesses: businesses.length,
      totalScanned,
      totalConflicts,
    });

    return NextResponse.json({
      success: true,
      businesses: businesses.length,
      totalScanned,
      totalConflicts,
      perBusiness,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[BookingConflictsCron] Failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
