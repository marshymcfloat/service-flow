import EmployeeDashboard from "./EmployeeDashboard";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";
import { redirect } from "next/navigation";
import { getEndOfDayPH, getStartOfDayPH } from "@/lib/date-utils";
import {
  getCachedBusinessBySlug,
  getCachedServices,
  getCachedPackages,
} from "@/lib/data/cached";

export default async function EmployeeDashboardDataContainer({
  businessSlug,
}: {
  businessSlug: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/");
  }

  const business = await getCachedBusinessBySlug(businessSlug);

  const employee = await prisma.employee.findFirst({
    where: {
      user: {
        email: session.user.email,
      },
      business_id: business?.id,
    },
    include: {
      user: true,
    },
  });

  if (!employee || !business) {
    return <div>Error loading dashboard</div>;
  }
  const startOfToday = getStartOfDayPH();
  const endOfToday = getEndOfDayPH();

  const servedHistory = await prisma.availedService.findMany({
    where: {
      served_by_id: employee.id,
      status: { in: ["CLAIMED", "SERVING", "COMPLETED"] },
    },
    include: {
      service: true,
      package: true,
      booking: {
        select: {
          customer: true,
          scheduled_at: true,
          created_at: true,
          downpayment: true,
          downpayment_status: true,
          grand_total: true,
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
        status: "ACCEPTED",
      },
      status: "PENDING",
    },
    include: {
      service: true,
      package: true,
      booking: {
        select: {
          customer: true,
          scheduled_at: true,
          created_at: true,
          downpayment: true,
          downpayment_status: true,
          grand_total: true,
        },
      },
    },
    orderBy: {
      scheduled_at: "asc",
    },
    take: 20,
  });

  const todayBookings = await prisma.booking.findMany({
    where: {
      business_id: business.id,
      status: { not: "CANCELLED" },
      OR: [
        {
          scheduled_at: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        {
          scheduled_at: null,
          created_at: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      ],
    },
    select: {
      id: true,
      status: true,
      payment_status: true,
      payment_method: true,
      grand_total: true,
      amount_paid: true,
      created_at: true,
      scheduled_at: true,
      paymongo_payment_intent_id: true,
      customer: {
        select: {
          name: true,
          email: true,
        },
      },
      availed_services: {
        select: {
          id: true,
          service: {
            select: {
              name: true,
              category: true,
            },
          },
        },
      },
    },
    orderBy: [{ scheduled_at: "asc" }, { created_at: "desc" }],
    take: 50,
  });

  const services = await getCachedServices(business.id);
  const packages = await getCachedPackages(business.id);
  const categories = Array.from(new Set(services.map((s) => s.category)));

  const { checkAttendanceStatusAction, getAttendanceCountAction } =
    await import("@/lib/server actions/attendance");
  const attendanceResult = await checkAttendanceStatusAction(employee.id);
  const todayAttendance = attendanceResult.success
    ? attendanceResult.data
    : null;

  const lastPayslip = await prisma.payslip.findFirst({
    where: { employee_id: employee.id },
    orderBy: { ending_date: "desc" },
  });

  const { getActiveSaleEvents } =
    await import("@/lib/server actions/sale-event");
  const saleEventsResult = await getActiveSaleEvents(businessSlug);
  const saleEvents = (saleEventsResult.success && saleEventsResult.data) || [];

  // Start from the day AFTER the last payslip
  const salaryStartDate = lastPayslip
    ? lastPayslip.ending_date
    : getStartOfDayPH(employee.user.created_at);

  const attendanceCountResult = await getAttendanceCountAction(
    employee.id,
    salaryStartDate,
    new Date(),
  );
  const daysPresent = attendanceCountResult.success
    ? (attendanceCountResult.data ?? 0)
    : 0;

  // Calculate attendance-based salary
  const attendanceSalary = daysPresent * (employee.daily_rate || 0);

  // Calculate unpaid commissions since last payslip
  const unpaidCommissions = await prisma.availedService.findMany({
    where: {
      served_by_id: employee.id,
      status: "COMPLETED",
      completed_at: {
        gt: salaryStartDate,
      },
    },
    select: {
      price: true,
      commission_base: true,
    },
  });

  const totalCommissions = unpaidCommissions.reduce((acc, curr) => {
    const base = curr.commission_base ?? curr.price;
    return acc + (base * (employee.commission_percentage || 0)) / 100;
  }, 0);

  const totalEstimatedSalary = attendanceSalary + totalCommissions;

  const { getUserLeaveRequests } = await import("@/app/actions/leave-request");
  const leaveRequestsResult = await getUserLeaveRequests(employee.id);
  const leaveRequests = leaveRequestsResult.success
    ? leaveRequestsResult.data || []
    : [];

  return (
    <EmployeeDashboard
      businessName={business.name}
      businessSlug={businessSlug}
      businessId={business.id}
      servedHistory={servedHistory}
      pendingServices={pendingServices}
      currentEmployeeSpecialties={employee.specialties ?? []}
      currentEmployeeId={employee.id}
      currentEmployeeCommission={employee.commission_percentage}
      currentEmployeeSalary={totalEstimatedSalary}
      todayAttendance={todayAttendance}
      todayBookings={todayBookings}
      services={services}
      packages={packages}
      categories={categories}
      saleEvents={saleEvents}
      leaveRequests={leaveRequests}
    />
  );
}
