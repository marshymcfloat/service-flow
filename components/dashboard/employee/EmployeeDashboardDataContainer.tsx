import React from "react";
import EmployeeDashboard from "./EmployeeDashboard";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";
import { redirect } from "next/navigation";

export default async function EmployeeDashboardDataContainer({
  businessSlug,
}: {
  businessSlug: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/");
  }

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true, name: true },
  });

  const employee = await prisma.employee.findFirst({
    where: {
      user: {
        email: session.user.email,
      },
      business_id: business?.id,
    },
  });

  if (!employee || !business) {
    return <div>Error loading dashboard</div>;
  }

  const servedHistory = await prisma.availedService.findMany({
    where: {
      served_by_id: employee.id,
      status: { in: ["CLAIMED", "SERVING", "COMPLETED"] },
    },
    include: {
      service: true,
      booking: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: {
      updated_at: "desc",
    },
    take: 10,
  });

  const pendingServices = await prisma.availedService.findMany({
    where: {
      booking: {
        business_id: business.id,
      },
      status: "PENDING",
    },
    include: {
      service: true,
      booking: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: {
      scheduled_at: "asc",
    },
    take: 20,
  });

  const { checkAttendanceStatusAction } =
    await import("@/lib/server actions/attendance");
  const attendanceResult = await checkAttendanceStatusAction(employee.id);
  const todayAttendance = attendanceResult.success
    ? attendanceResult.data
    : null;

  return (
    <EmployeeDashboard
      businessName={business.name}
      businessSlug={businessSlug}
      servedHistory={servedHistory}
      pendingServices={pendingServices}
      currentEmployeeId={employee.id}
      currentEmployeeCommission={employee.commission_percentage}
      currentEmployeeSalary={employee.salary}
      todayAttendance={todayAttendance}
    />
  );
}
