"use server";

import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

import {
  LeaveRequestStatus,
  AttendanceStatus,
} from "@/prisma/generated/prisma/enums";
export async function createLeaveRequest(data: {
  employee_id: number;
  business_id: string;
  start_date: Date;
  end_date: Date;
  reason: string;
}) {
  try {
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employee_id: data.employee_id,
        business_id: data.business_id,
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason,
        status: "PENDING",
      },
    });

    revalidatePath(`/app/${data.business_id}/attendance`);
    revalidatePath(`/app/${data.business_id}/leave-requests`); // If we have a dedicated page, or just revalidate the layout?
    return { success: true, data: leaveRequest };
  } catch (error) {
    console.error("Failed to create leave request:", error);
    return { success: false, error: "Failed to create leave request" };
  }
}

export async function updateLeaveRequestStatus(
  requestId: number,
  status: LeaveRequestStatus,
  adminComment?: string,
) {
  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });

    if (!leaveRequest) {
      throw new Error("Leave request not found");
    }

    // Update status
    await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status,
        admin_comment: adminComment,
      },
    });

    // Side effect: If APPROVED, create attendance records
    if (status === "APPROVED") {
      const dates = [];
      let currentDate = new Date(leaveRequest.start_date);
      const endDate = new Date(leaveRequest.end_date);

      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Create attendance for each day
      for (const date of dates) {
        // Check if attendance already exists
        const existing = await prisma.employeeAttendance.findFirst({
          where: {
            employee_id: leaveRequest.employee_id,
            date: date,
          },
        });

        if (existing) {
          // Update existing to LEAVE if it's not present/worked? Or just overwrite?
          // User said: "Automatically create/upsert EmployeeAttendance records ... with status OFF (or new LEAVE status)"
          await prisma.employeeAttendance.update({
            where: { id: existing.id },
            data: {
              status: AttendanceStatus.LEAVE,
            },
          });
        } else {
          await prisma.employeeAttendance.create({
            data: {
              employee_id: leaveRequest.employee_id,
              date: date,
              status: AttendanceStatus.LEAVE,
            },
          });
        }
      }
    }

    revalidatePath(`/app/${leaveRequest.business_id}/attendance`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update leave request:", error);
    return { success: false, error: "Failed to update leave request" };
  }
}

export async function getLeaveRequests(businessId: string) {
  try {
    const requests = await prisma.leaveRequest.findMany({
      where: { business_id: businessId },
      include: { employee: { include: { user: true } } },
      orderBy: { created_at: "desc" },
    });
    return { success: true, data: requests };
  } catch (error) {
    console.error("Failed to fetch leave requests", error);
    return { success: false, error: "Failed to fetch leave requests" };
  }
}

export async function getUserLeaveRequests(employeeId: number) {
  try {
    const requests = await prisma.leaveRequest.findMany({
      where: { employee_id: employeeId },
      orderBy: { created_at: "desc" },
    });
    return { success: true, data: requests };
  } catch (error) {
    console.error("Failed to fetch user leave requests", error);
    return { success: false, error: "Failed to fetch user leave requests" };
  }
}
