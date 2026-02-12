import { NextResponse, connection } from "next/server";

import {
  createCheckoutForInvoice,
  isManualCollectionOnly,
  suspendExpiredGraceSubscriptions,
} from "@/features/billing/subscription-service";
import { getCurrentDateTimePH } from "@/lib/date-utils";
import {
  isCronAuthorized,
  unauthorizedCronResponse,
} from "@/lib/security/cron-auth";
import { prisma } from "@/prisma/prisma";

export async function GET(request: Request) {
  await connection();
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  try {
    if (isManualCollectionOnly()) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "MANUAL_COLLECTION_MODE",
        processedAt: getCurrentDateTimePH().toISOString(),
      });
    }

    const now = getCurrentDateTimePH();
    const suspendedCount = await suspendExpiredGraceSubscriptions();

    const openOverdueInvoices = await prisma.subscriptionInvoice.findMany({
      where: {
        status: "OPEN",
        due_at: {
          lte: now,
        },
      },
      select: {
        id: true,
      },
      take: 100,
    });

    let retryCheckoutCount = 0;
    for (const invoice of openOverdueInvoices) {
      try {
        await createCheckoutForInvoice(invoice.id);
        retryCheckoutCount += 1;
      } catch {
        // Keep moving; a failed checkout generation should not stop the batch.
      }
    }

    return NextResponse.json({
      success: true,
      suspendedCount,
      retriedCheckouts: retryCheckoutCount,
      processedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Subscription dunning cron failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
