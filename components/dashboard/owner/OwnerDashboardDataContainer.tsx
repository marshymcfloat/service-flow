import { getCachedBusinessBySlug } from "@/lib/data/cached";

import { authOptions } from "@/lib/next auth/options";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import OwnerDashboard from "./OwnerDashboard";
import { prisma } from "@/prisma/prisma";
import { getEndOfDayPH, getStartOfDayPH } from "@/lib/date-utils";
import { getThisWeeksFlowRemindersCount } from "@/lib/data/flow-reminder-queries";

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
    />
  );
}
