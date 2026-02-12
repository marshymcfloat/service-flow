import { getCachedBusinessBySlug } from "@/lib/data/cached";

import { authOptions } from "@/lib/next auth/options";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import OwnerDashboard from "./OwnerDashboard";
import { prisma } from "@/prisma/prisma";
import {
  getCurrentDateTimePH,
  getEndOfDayPH,
  getStartOfDayPH,
} from "@/lib/date-utils";
import { getThisWeeksFlowRemindersCount } from "@/lib/data/flow-reminder-queries";

function toObjectRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export default async function OwnerDashboardDataContainer({
  businessSlug,
}: {
  businessSlug: string;
}) {
  const startOfToday = getStartOfDayPH();
  const endOfToday = getEndOfDayPH();

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  const business = await getCachedBusinessBySlug(businessSlug);
  if (!business) {
    return <div>Error loading dashboard</div>;
  }

  const owner = await prisma.owner.findFirst({
    where: {
      user_id: session.user.id,
      business_id: business.id,
    },
    select: {
      id: true,
    },
  });

  if (!owner) {
    return <div>Error loading dashboard</div>;
  }

  const allSuccessfulBookings = await prisma.booking.findMany({
    where: {
      business_id: business.id,
      status: {
        not: "CANCELLED",
      },
    },
    select: {
      id: true,
      created_at: true,
      grand_total: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  const totalSales = allSuccessfulBookings.reduce(
    (acc, curr) => (acc = curr.grand_total + acc),
    0,
  );

  const bookingsTodayCount = await prisma.booking.count({
    where: {
      business_id: business.id,
      created_at: {
        gte: startOfToday,
        lte: endOfToday,
      },
      status: {
        not: "CANCELLED",
      },
    },
  });

  const presentEmployeesToday = await prisma.employeeAttendance.count({
    where: { date: { gte: startOfToday, lte: endOfToday } },
  });

  const allBookings = await prisma.booking.findMany({
    where: {
      business_id: business.id,
    },
    include: {
      customer: true,
      availed_services: {
        include: {
          service: true,
          served_by: {
            include: { user: true },
          },
          served_by_owner: {
            include: { user: true },
          },
        },
      },
      vouchers: true,
    },
    orderBy: {
      created_at: "desc",
    },
    take: 1000,
  });

  const pendingServices = await prisma.availedService.findMany({
    where: {
      booking: {
        business_id: business.id,
        status: { in: ["ACCEPTED"] },
      },
      status: "PENDING",
    },
    select: {
      id: true,
      price: true,
      scheduled_at: true,
      package_id: true,
      package: {
        select: {
          name: true,
        },
      },
      service: {
        select: {
          name: true,
          duration: true,
        },
      },
      booking: {
        select: {
          customer: {
            select: {
              name: true,
            },
          },
          scheduled_at: true,
          created_at: true,
        },
      },
    },
    orderBy: {
      scheduled_at: "asc",
    },
    take: 20,
  });

  const ownerClaimedServices = await prisma.availedService.findMany({
    where: {
      served_by_owner_id: owner.id,
      status: { in: ["CLAIMED", "SERVING"] },
      booking: {
        business_id: business.id,
        status: { in: ["ACCEPTED"] },
      },
    },
    select: {
      id: true,
      price: true,
      scheduled_at: true,
      claimed_at: true,
      status: true,
      package_id: true,
      package: {
        select: {
          name: true,
        },
      },
      service: {
        select: {
          name: true,
          duration: true,
        },
      },
      booking: {
        select: {
          customer: {
            select: {
              name: true,
            },
          },
          scheduled_at: true,
          created_at: true,
        },
      },
    },
    orderBy: {
      scheduled_at: "asc",
    },
    take: 20,
  });

  const payrollData = await prisma.payslip.findMany({
    where: {
      employee: {
        business_id: business.id,
      },
      status: "PAID",
    },
    select: {
      id: true,
      total_salary: true,
      starting_date: true,
      ending_date: true,
      employee: {
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      ending_date: "desc",
    },
  });

  const flowRemindersThisWeek = await getThisWeeksFlowRemindersCount(
    business.id,
  );

  const metricWindowStart = new Date(
    getCurrentDateTimePH().getTime() - 7 * 24 * 60 * 60 * 1000,
  );
  const bookingMetricLogs = await prisma.auditLog.findMany({
    where: {
      business_id: business.id,
      entity_type: "BookingMetric",
      created_at: {
        gte: metricWindowStart,
      },
      action: {
        in: [
          "BOOKING_SLOT_LOOKUP",
          "BOOKING_SUBMIT_ATTEMPT",
          "BOOKING_SUBMIT_SUCCESS",
          "BOOKING_SUBMIT_REJECTION",
          "PUBLIC_BOOKING_STARTED",
          "PUBLIC_BOOKING_COMPLETED",
        ],
      },
    },
    select: {
      action: true,
      changes: true,
    },
  });

  let slotLookupTotal = 0;
  let slotLookupSuccess = 0;
  let submitAttempts = 0;
  let submitSuccess = 0;
  let slotJustTakenRejections = 0;
  let publicStarted = 0;
  let publicCompleted = 0;

  for (const log of bookingMetricLogs) {
    const changes = toObjectRecord(log.changes);
    const outcome = String(changes.outcome || "");
    const reason = String(changes.reason || "");

    if (log.action === "BOOKING_SLOT_LOOKUP") {
      slotLookupTotal += 1;
      if (outcome === "SUCCESS") {
        slotLookupSuccess += 1;
      }
    } else if (log.action === "BOOKING_SUBMIT_ATTEMPT") {
      submitAttempts += 1;
    } else if (log.action === "BOOKING_SUBMIT_SUCCESS") {
      submitSuccess += 1;
    } else if (
      log.action === "BOOKING_SUBMIT_REJECTION" &&
      reason === "SLOT_JUST_TAKEN"
    ) {
      slotJustTakenRejections += 1;
    } else if (log.action === "PUBLIC_BOOKING_STARTED") {
      publicStarted += 1;
    } else if (log.action === "PUBLIC_BOOKING_COMPLETED") {
      publicCompleted += 1;
    }
  }

  const slotLookupSuccessRate =
    slotLookupTotal > 0 ? (slotLookupSuccess / slotLookupTotal) * 100 : 0;
  const bookingSubmitSuccessRate =
    submitAttempts > 0 ? (submitSuccess / submitAttempts) * 100 : 0;
  const conflictRejectionRate =
    submitAttempts > 0 ? (slotJustTakenRejections / submitAttempts) * 100 : 0;
  const publicConversionRate =
    publicStarted > 0 ? (publicCompleted / publicStarted) * 100 : 0;

  const rawConflictSignals = await prisma.outboxMessage.findMany({
    where: {
      business_id: business.id,
      event_type: "BOOKING_STAFFING_CONFLICT_DETECTED",
      created_at: {
        gte: metricWindowStart,
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: 6,
    select: {
      id: true,
      aggregate_id: true,
      payload: true,
      created_at: true,
    },
  });

  const staffingConflictAlerts = rawConflictSignals.map((signal) => {
    const payload = toObjectRecord(signal.payload);
    return {
      id: signal.id,
      bookingId: Number.parseInt(signal.aggregate_id, 10),
      customerName: String(payload.customerName || "Customer"),
      scheduledAt: String(payload.scheduledAt || ""),
      trigger: String(payload.trigger || "MANUAL_REVALIDATION"),
      reason: String(payload.reason || "Staffing conflict detected."),
      detectedAt: signal.created_at,
    };
  });

  return (
    <OwnerDashboard
      businessName={business.name}
      businessSlug={businessSlug}
      totalSales={totalSales}
      bookingsToday={bookingsTodayCount}
      presentEmployeesToday={presentEmployeesToday}
      bookings={allSuccessfulBookings}
      allBookings={allBookings}
      pendingServices={pendingServices}
      ownerClaimedServices={ownerClaimedServices}
      payroll={payrollData}
      flowRemindersThisWeek={flowRemindersThisWeek}
      bookingMetrics={{
        slotLookupSuccessRate,
        bookingSubmitSuccessRate,
        conflictRejectionRate,
        publicConversionRate,
        slotLookupTotal,
        submitAttempts,
        publicStarted,
        publicCompleted,
      }}
      staffingConflictAlerts={staffingConflictAlerts}
    />
  );
}
