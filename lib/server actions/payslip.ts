"use server";

import { prisma } from "@/prisma/prisma";
import {
  AttendanceStatus,
  AvailedServiceStatus,
  BookingStatus,
  PayslipStatus,
} from "@/prisma/generated/prisma/client";
import { getStartOfDayPH } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";

export async function getPayslipDataAction(employeeId: number) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: true,
      },
    });

    if (!employee) throw new Error("Employee not found");

    const lastPayslip = await prisma.payslip.findFirst({
      where: { employee_id: employeeId },
      orderBy: { ending_date: "desc" },
    });

    const startingDate = lastPayslip
      ? lastPayslip.ending_date
      : new Date(getStartOfDayPH(employee.user.created_at).getTime() - 1);

    const { getEndOfDayPH } = await import("@/lib/date-utils");
    const endingDate = getEndOfDayPH(new Date());

    const attendanceRecords = await prisma.employeeAttendance.findMany({
      where: {
        employee_id: employeeId,
        status: AttendanceStatus.PRESENT,
        date: {
          gt: startingDate,
          lte: endingDate,
        },
      },
    });

    const daysPresent = attendanceRecords.length;
    const basicSalary = daysPresent * employee.daily_rate;

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
  try {
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
