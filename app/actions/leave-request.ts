"use server";

import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

import {
  LeaveRequestStatus,
  AttendanceStatus,
  LeaveType,
} from "@/prisma/generated/prisma/enums";
import { createLeaveRequestSchema } from "@/app/types/details";
import { getStartOfDayPH } from "@/lib/date-utils";

export async function createLeaveRequest(
  data: {
    employee_id: number;
    business_id: string;
    start_date: Date;
    end_date: Date;
    reason: string;
    type: LeaveType;
    businessSlug: string;
  },
  prevState?: any,
) {
  try {
    const validatedData = createLeaveRequestSchema.safeParse(data);

    if (!validatedData.success) {
      return { success: false, error: validatedData.error.message };
    }

    // Ensure dates are in Philippine Time (start of day)
    const startDatePH = getStartOfDayPH(data.start_date);
    const endDatePH = getStartOfDayPH(data.end_date);

    // Validate dates
    if (endDatePH < startDatePH) {
      return { success: false, error: "End date must be after start date" };
    }

    const startYear = startDatePH.getFullYear();
    const endYear = endDatePH.getFullYear();
    const currentYear = new Date().getFullYear();

    if (startYear < currentYear || endYear > currentYear + 1) {
      return {
        success: false,
        error: "Leave requests must be within the current or next year",
      };
    }

    // Check for overlapping requests
    const existingRequests = await prisma.leaveRequest.findMany({
      where: {
        employee_id: data.employee_id,
        status: { not: "REJECTED" },
        OR: [
          {
            start_date: { lte: endDatePH },
            end_date: { gte: startDatePH },
          },
        ],
      },
    });

    if (existingRequests.length > 0) {
      return {
        success: false,
        error: "You already have a leave request for these dates.",
      };
    }

    await prisma.leaveRequest.create({
      data: {
        employee_id: data.employee_id,
        business_id: data.business_id,
        start_date: startDatePH,
        end_date: endDatePH,
        reason: data.reason,
        type: data.type,
      },
    });

    revalidatePath(`/app/${data.businessSlug}/attendance`);
    revalidatePath(`/app/${data.businessSlug}/leave-requests`);
    return { success: true };
  } catch (error) {
    console.error("Failed to create leave request:", error);
    return { success: false, error: "Failed to create leave request" };
  }
}

export async function cancelLeaveRequest(requestId: number) {
  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { business: true },
    });

    if (!leaveRequest) {
      return { success: false, error: "Leave request not found" };
    }

    if (leaveRequest.status !== "PENDING") {
      return {
        success: false,
        error: "Only pending leave requests can be cancelled",
      };
    }

    await prisma.leaveRequest.delete({
      where: { id: requestId },
    });

    revalidatePath(`/app/${leaveRequest.business.slug}/attendance`);
    return { success: true };
  } catch (error) {
    console.error("Failed to cancel leave request:", error);
    return { success: false, error: "Failed to cancel leave request" };
  }
}

export async function updateLeaveRequestStatus(
  requestId: number,
  status: LeaveRequestStatus,
  adminComment?: string,
  isPaid?: boolean,
) {
  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { employee: true, business: true },
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
        is_paid: isPaid ?? false,
      },
    });

    // Side effect: If APPROVED, create attendance records
    if (status === "APPROVED") {
      const dates = [];
      let currentDate = getStartOfDayPH(leaveRequest.start_date);
      const endDate = getStartOfDayPH(leaveRequest.end_date);

      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate = getStartOfDayPH(currentDate);
      }

      for (const date of dates) {
        const existing = await prisma.employeeAttendance.findFirst({
          where: {
            employee_id: leaveRequest.employee_id,
            date: date,
          },
        });

        if (existing) {
          await prisma.employeeAttendance.update({
            where: { id: existing.id },
            data: {
              status: AttendanceStatus.LEAVE,
              is_paid_leave: isPaid ?? false,
            },
          });
        } else {
          try {
            await prisma.employeeAttendance.create({
              data: {
                employee_id: leaveRequest.employee_id,
                date: date,
                status: AttendanceStatus.LEAVE,
                is_paid_leave: isPaid ?? false,
              },
            });
          } catch (e) {
            // Ignore unique constraint violation if race condition occurs
          }
        }
      }
    }

    revalidatePath(`/app/${leaveRequest.business.slug}/attendance`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update leave request status:", error);
    return { success: false, error: "Failed to update leave request status" };
  }
}

export async function getLeaveRequests(businessId: string) {
  try {
    const requests = await prisma.leaveRequest.findMany({
      where: { business_id: businessId },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return { success: true, data: requests };
  } catch (error) {
    console.error("Failed to fetch leave requests:", error);
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
    console.error("Failed to fetch user leave requests:", error);
    return { success: false, error: "Failed to fetch user leave requests" };
  }
}
