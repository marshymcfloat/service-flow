import { getCachedBusinessBySlug } from "@/lib/data/cached";

import { authOptions } from "@/lib/next auth/options";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import OwnerDashboard from "./OwnerDashboard";
import { prisma } from "@/prisma/prisma";
import { getEndOfDayPH, getStartOfDayPH } from "@/lib/date-utils";

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

  const allSuccessfulBookings = await prisma.booking.findMany({
    where: {
      business_id: business?.id,
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
      business_id: business?.id,
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
      business_id: business?.id,
    },
    include: {
      customer: true,
      availed_services: {
        include: {
          service: true,
          served_by: {
            include: { user: true },
          },
        },
      },
      vouchers: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return (
    <OwnerDashboard
      businessName={business?.name || ""}
      businessSlug={businessSlug}
      totalSales={totalSales}
      bookingsToday={bookingsTodayCount}
      presentEmployeesToday={presentEmployeesToday}
      bookings={allSuccessfulBookings}
      allBookings={allBookings}
    />
  );
}
