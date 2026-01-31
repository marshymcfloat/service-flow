import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";
import { Role } from "@/prisma/generated/prisma/enums";
import { OwnerAttendanceClient } from "@/components/dashboard/attendance/OwnerAttendanceClient";
import { EmployeeLeaveClient } from "@/components/dashboard/attendance/EmployeeLeaveClient";
import {
  getLeaveRequests,
  getUserLeaveRequests,
} from "@/app/actions/leave-request";
import { getDailyAttendance } from "@/app/actions/attendance";
import { Loader2 } from "lucide-react";
import { prisma } from "@/prisma/prisma";

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { businessSlug } = await params;
  const { date: dateParam } = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Verify access to this business
  if (session.user.businessSlug !== businessSlug) {
    // Or handle if they are owner of multiple? But schema implies 1:1 or specific relation.
    // For now strict check.
    redirect("/app");
  }

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
  });

  if (!business) {
    notFound();
  }

  const role = session.user.role;

  if (role === Role.OWNER) {
    const requestsResult = await getLeaveRequests(business.id);
    const requests = requestsResult.success ? requestsResult.data || [] : [];

    // Parse date or default to today
    const date = dateParam ? new Date(dateParam) : new Date();
    // Validate date?

    const attendanceResult = await getDailyAttendance(business.id, date);
    const dailyAttendance = attendanceResult.success
      ? attendanceResult.data || []
      : [];

    return (
      <OwnerAttendanceClient
        businessId={business.id}
        businessSlug={businessSlug}
        leaveRequests={requests}
        initialDailyAttendance={dailyAttendance}
        currentDate={date}
      />
    );
  } else if (role === Role.EMPLOYEE) {
    const employee = await prisma.employee.findUnique({
      where: { user_id: session.user.id },
    });

    if (!employee) {
      return <div>Employee profile not found.</div>;
    }

    const requestsResult = await getUserLeaveRequests(employee.id);
    const requests = requestsResult.success ? requestsResult.data || [] : [];

    return (
      <EmployeeLeaveClient
        employeeId={employee.id}
        businessId={business.id}
        requests={requests}
      />
    );
  } else {
    return <div>Access Denied</div>;
  }
}
