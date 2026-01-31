"use server";

import { prisma } from "@/prisma/prisma";

import { AttendanceStatus } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { getEndOfDayPH, getStartOfDayPH } from "@/lib/date-utils";

export async function getDailyAttendance(businessId: string, date: Date) {
  try {
    const employees = await prisma.employee.findMany({
      where: { business_id: businessId },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });

    const startOfDay = getStartOfDayPH(date);
    const endOfDay = getEndOfDayPH(date);

    const attendanceRecords = await prisma.employeeAttendance.findMany({
      where: {
        employee: { business_id: businessId },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const data = employees.map((emp) => {
      const record = attendanceRecords.find((r) => r.employee_id === emp.id);
      return {
        employee: emp,
        attendance: record || null,
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch daily attendance:", error);
    return { success: false, error: "Failed to fetch attendance" };
  }
}

export async function updateAttendanceStatus(
  employeeId: number,
  date: Date,
  status: AttendanceStatus,
) {
  try {
    const startOfDay = getStartOfDayPH(date);
    const endOfDay = getEndOfDayPH(date);

    const existing = await prisma.employeeAttendance.findFirst({
      where: {
        employee_id: employeeId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existing) {
      await prisma.employeeAttendance.update({
        where: { id: existing.id },
        data: { status },
      });
    } else {
      await prisma.employeeAttendance.create({
        data: {
          employee_id: employeeId,
          date: startOfDay,
          status,
        },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to update attendance status:", error);
    return { success: false, error: "Failed to update status" };
  }
}
