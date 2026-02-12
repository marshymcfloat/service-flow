import { NextResponse, connection } from "next/server";

import {
  createInvoiceForSubscription,
  ensureBusinessSubscription,
  ensureDefaultPlans,
  isManualCollectionOnly,
  moveDueSubscriptionsToGracePeriod,
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

    await ensureDefaultPlans();
    const businesses = await prisma.business.findMany({
      select: { id: true },
    });

    for (const business of businesses) {
      await ensureBusinessSubscription(business.id);
    }

    const now = getCurrentDateTimePH();
    const dueSubscriptions = await prisma.businessSubscription.findMany({
      where: {
        current_period_end: { lte: now },
        status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] },
      },
      select: { id: true },
    });

    let invoicesCreated = 0;
    for (const sub of dueSubscriptions) {
      const invoice = await createInvoiceForSubscription(sub.id, "SCHEDULED_RENEWAL");
      if (invoice.status === "OPEN" || invoice.status === "PAID") {
        invoicesCreated += 1;
      }
    }

    const graceTransitions = await moveDueSubscriptionsToGracePeriod();
    return NextResponse.json({
      success: true,
      checkedBusinesses: businesses.length,
      dueSubscriptions: dueSubscriptions.length,
      invoicesCreated,
      graceTransitions,
      processedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Subscription renewal cron failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
