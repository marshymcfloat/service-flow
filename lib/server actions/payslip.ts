"use server";

import { prisma } from "@/prisma/prisma";
import {
  AttendanceStatus,
  AvailedServiceStatus,
  BookingStatus,
  PayslipStatus,
} from "@/prisma/generated/prisma/client";
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

    // 1. Determine Date Range
    const lastPayslip = await prisma.payslip.findFirst({
      where: { employee_id: employeeId },
      orderBy: { ending_date: "desc" },
    });

    // Use strict PH time logic?
    // Actually, timestamps in DB are UTC. We just need to make sure we compare correctly.
    // If last payslip ended at T, we start from T (exclusive) or T + 1ms.
    // We will use > last_payslip.ending_date.

    const startingDate = lastPayslip
      ? lastPayslip.ending_date
      : employee.user.created_at; // Or some default start

    // For safety, if no payslip, use 1st of current month or join date?
    // Plan said: derived from employee.created_at. Correct.

    const endingDate = new Date(); // Now

    // 2. Fetch Attendance (Days Present) within range
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
    const basicSalary = daysPresent * employee.daily_rate; // Using new daily_rate

    // 3. Fetch Commissions (Completed services by this employee in range)
    // We look for AvailedService where served_by_id = employeeId AND completed_at in range
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
          basic_salary: basicSalary,
          commission_services_count: commissionServices.length,
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
        status: PayslipStatus.PENDING, // Or PAID? Usually pending first.
      },
    });

    revalidatePath("/app/[businessSlug]/payroll");
    return { success: true, data: payslip };
  } catch (error) {
    console.error("Error creating payslip:", error);
    return { success: false, error: "Failed to create payslip" };
  }
}
