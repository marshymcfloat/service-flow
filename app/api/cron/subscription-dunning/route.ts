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

const CHECKOUT_RETRY_CONCURRENCY = 15;
const OVERDUE_BATCH_SIZE = 250;

async function runInChunks<T>(
  items: T[],
  chunkSize: number,
  task: (item: T) => Promise<void>,
) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.allSettled(chunk.map((item) => task(item)));
  }
}

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
      orderBy: {
        due_at: "asc",
      },
      take: OVERDUE_BATCH_SIZE,
    });

    let retryCheckoutCount = 0;
    await runInChunks(
      openOverdueInvoices,
      CHECKOUT_RETRY_CONCURRENCY,
      async (invoice) => {
        await createCheckoutForInvoice(invoice.id);
        retryCheckoutCount += 1;
      },
    );

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
