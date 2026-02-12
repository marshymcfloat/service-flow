"use server";

import { prisma } from "@/prisma/prisma";
import {
  AttendanceStatus,
  AvailedServiceStatus,
  PayslipStatus,
} from "@/prisma/generated/prisma/client";
import { getCurrentDateTimePH, getStartOfDayPH } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { Role } from "@/prisma/generated/prisma/enums";

export async function getPayslipDataAction(employeeId: number) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { session, businessSlug } = auth;

  // 1. Employee Self-Check
  if (session.user.role === Role.EMPLOYEE) {
    const userEmployee = await prisma.employee.findUnique({
      where: { user_id: session.user.id },
    });
    if (!userEmployee || userEmployee.id !== employeeId) {
      return {
        success: false,
        error: "Unauthorized: You can only view your own payslips.",
      };
    }
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: true,
        business: { select: { slug: true } },
      },
    });

    if (!employee) throw new Error("Employee not found");

    // 2. Owner Business Check
    if (employee.business.slug !== businessSlug) {
      return {
        success: false,
        error: "Unauthorized: Employee belongs to another business.",
      };
    }

    const lastPaidPayslip = await prisma.payslip.findFirst({
      where: {
        employee_id: employeeId,
        status: PayslipStatus.PAID,
      },
      orderBy: { ending_date: "desc" },
    });

    const startingDate = lastPaidPayslip
      ? lastPaidPayslip.ending_date
      : new Date(getStartOfDayPH(employee.user.created_at).getTime() - 1);

    const endingDate = getCurrentDateTimePH();

    const attendanceRecords = await prisma.employeeAttendance.findMany({
      where: {
        employee_id: employeeId,
        OR: [
          {
            status: AttendanceStatus.PRESENT,
            OR: [
              {
                time_in: {
                  gt: startingDate,
                  lte: endingDate,
                },
              },
              {
                time_in: null,
                date: {
                  gt: startingDate,
                  lte: endingDate,
                },
              },
            ],
          },
          {
            status: AttendanceStatus.LEAVE,
            is_paid_leave: true,
            date: {
              gt: startingDate,
              lte: endingDate,
            },
          },
        ],
      },
    });

    const daysPresent = attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT,
    ).length;
    const paidLeaveDays = attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.LEAVE && r.is_paid_leave,
    ).length;

    const basicSalary = (daysPresent + paidLeaveDays) * employee.daily_rate;

    const commissionServices = await prisma.availedService.findMany({
      where: {
        served_by_id: employeeId,
        status: AvailedServiceStatus.COMPLETED,
        completed_at: {
          gt: startingDate,
          lte: endingDate,
        },
      },
      select: {
        id: true,
        commission_base: true,
        price: true,
        package_id: true,
        package: {
          select: {
            name: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    let commissionTotal = 0;
    commissionServices.forEach((service) => {
      const base = service.commission_base ?? service.price;
      commissionTotal += (base * employee.commission_percentage) / 100;
    });

    const totalSalary = basicSalary + commissionTotal;

    return {
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: employee.user.name,
          daily_rate: employee.daily_rate,
          commission_percentage: employee.commission_percentage,
        },
        period: {
          start: startingDate,
          end: endingDate,
        },
        breakdown: {
          days_present: daysPresent,
          paid_leave_days: paidLeaveDays,
          attendance_dates: attendanceRecords.map((r) => r.date),
          basic_salary: basicSalary,
          commission_services_count: commissionServices.length,
          commission_services: commissionServices,
          commission_total: commissionTotal,
        },
        total_salary: totalSalary,
      },
    };
  } catch (error) {
    console.error("Error calculating payslip:", error);
    return { success: false, error: "Failed to calculate payslip" };
  }
}

export async function createPayslipAction(data: {
  employeeId: number;
  startingDate: Date;
  endingDate: Date;
  daysPresent: number;
  totalSalary: number;
  deduction?: number;
  comment?: string;
}) {
  const auth = await requireAuth({ write: true });
  if (!auth.success) return auth;
  const { session, businessSlug } = auth;

  // STRICT: Only Owners can generate payslips
  if (session.user.role !== Role.OWNER) {
    return {
      success: false,
      error: "Unauthorized: Only owners can create payslips.",
    };
  }

  try {
    // Verify employee belongs to business
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { business: { select: { slug: true } } },
    });

    if (!employee || employee.business.slug !== businessSlug) {
      return {
        success: false,
        error: "Unauthorized operation on employee from another business.",
      };
    }
    const payslip = await prisma.payslip.create({
      data: {
        employee_id: data.employeeId,
        starting_date: data.startingDate,
        ending_date: data.endingDate,
        total_salary: data.totalSalary,
        deduction: data.deduction || 0,
        comment: data.comment,
        status: PayslipStatus.PAID,
      },
    });

    revalidatePath("/app/[businessSlug]/payroll");
    return { success: true, data: payslip };
  } catch (error) {
    console.error("Error creating payslip:", error);
    return { success: false, error: "Failed to create payslip" };
  }
}

export async function getPayslipHistoryAction(employeeId: number) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { session, businessSlug } = auth;

  if (session.user.role === Role.EMPLOYEE) {
    const userEmployee = await prisma.employee.findUnique({
      where: { user_id: session.user.id },
    });
    if (!userEmployee || userEmployee.id !== employeeId) {
      return { success: false, error: "Unauthorized" };
    }
  }

  // Cross-tenant check
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { business: { select: { slug: true } } },
  });
  if (!employee || employee.business.slug !== businessSlug) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const payslips = await prisma.payslip.findMany({
      where: { employee_id: employeeId },
      orderBy: { ending_date: "desc" },
    });
    return { success: true, data: payslips };
  } catch (error) {
    console.error("Error fetching payslip history:", error);
    return { success: false, error: "Failed to fetch payslip history" };
  }
}
