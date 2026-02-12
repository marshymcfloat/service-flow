"use server";

import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import {
  getCurrentDateTimePH,
  getEndOfDayPH,
  getMonthRangePH,
  getStartOfDayPH,
} from "../date-utils";
import { requireAuth } from "@/lib/auth/guards";
import { Role } from "@/prisma/generated/prisma/enums";

const MAX_DISTANCE_METERS = 100;

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function checkAttendanceStatusAction(
  employeeId: number,
  date: Date = getCurrentDateTimePH(),
) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { session, businessSlug } = auth;

  if (session.user.role === Role.EMPLOYEE) {
    const userEmployee = await prisma.employee.findUnique({
      where: { user_id: session.user.id },
    });

    if (!userEmployee || userEmployee.id !== employeeId) {
      return {
        success: false,
        error: "Unauthorized access to attendance record",
      };
    }
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { business: { select: { slug: true } } },
  });

  if (!employee || employee.business.slug !== businessSlug) {
    return { success: false, error: "Employee not found or unauthorized" };
  }

  try {
    const startOfDay = getStartOfDayPH(date);
    const endOfDay = getEndOfDayPH(date);

    const attendance = await prisma.employeeAttendance.findFirst({
      where: {
        employee_id: employeeId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return { success: true, data: attendance };
  } catch (error) {
    console.error("Error checking attendance:", error);
    return { success: false, error: "Failed to check status" };
  }
}

export async function clockInAction(
  employeeId: number,
  latitude: number,
  longitude: number,
  businessSlug: string,
) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { session } = auth;

  // Clock in is strictly for the employee themselves
  const userEmployee = await prisma.employee.findUnique({
    where: { user_id: session.user.id },
  });

  if (!userEmployee || userEmployee.id !== employeeId) {
    return {
      success: false,
      error: "Unauthorized: You can only clock in for yourself.",
    };
  }

  // Ensure they are clocking into the correct business
  if (auth.businessSlug !== businessSlug) {
    return { success: false, error: "Unauthorized business context" };
  }

  try {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      select: { latitude: true, longitude: true },
    });

    if (
      !business ||
      business.latitude === null ||
      business.longitude === null
    ) {
      return {
        success: false,
        error: "Business location not set. Contact owner.",
      };
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      business.latitude,
      business.longitude,
    );

    // Skip distance check in development mode
    if (
      process.env.NODE_ENV !== "development" &&
      distance > MAX_DISTANCE_METERS
    ) {
      return {
        success: false,
        error: `You are too far from the workplace (${Math.round(distance)}m away). Max allowed: ${MAX_DISTANCE_METERS}m.`,
      };
    }

    const existing = await checkAttendanceStatusAction(employeeId);
    if (existing.success && existing.data) {
      return { success: false, error: "Already clocked in today." };
    }

    const now = getCurrentDateTimePH();
    const datePH = getStartOfDayPH(now);

    const attendance = await prisma.employeeAttendance.create({
      data: {
        employee_id: employeeId,
        date: datePH,
        time_in: now,
        status: "PRESENT",
        location_verified: true,
        latitude,
        longitude,
      },
    });

    revalidatePath(`/${businessSlug}`);
    return { success: true, data: attendance };
  } catch (error) {
    console.error("Error clocking in:", error);
    return { success: false, error: "Failed to clock in" };
  }
}

export async function clockOutAction(employeeId: number) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { session } = auth;

  // Clock out is strictly for the employee themselves
  const userEmployee = await prisma.employee.findUnique({
    where: { user_id: session.user.id },
  });

  if (!userEmployee || userEmployee.id !== employeeId) {
    return {
      success: false,
      error: "Unauthorized: You can only clock out for yourself.",
    };
  }

  try {
    const now = getCurrentDateTimePH();
    const startOfDay = getStartOfDayPH(now);
    const endOfDay = getEndOfDayPH(now);

    const attendance = await prisma.employeeAttendance.findFirst({
      where: {
        employee_id: employeeId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (!attendance) {
      return { success: false, error: "No attendance record found for today." };
    }

    if (attendance.time_out) {
      return { success: false, error: "Already clocked out." };
    }

    const updated = await prisma.employeeAttendance.update({
      where: { id: attendance.id },
      data: {
        time_out: now,
      },
    });

    revalidatePath("/[businessSlug]");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error clocking out:", error);

    return { success: false, error: "Failed to clock out" };
  }
}

export async function getMonthlyAttendanceAction(
  employeeId: number,
  year: number,
  month: number,
) {
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

  // Ensure employee belongs to business
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { business: { select: { slug: true } } },
  });
  if (!employee || employee.business.slug !== businessSlug) {
    return { success: false, error: "Employee not found or unauthorized" };
  }

  try {
    const { startDate, endDate } = getMonthRangePH(year, month);

    const attendance = await prisma.employeeAttendance.findMany({
      where: {
        employee_id: employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return { success: true, data: attendance };
  } catch (error) {
    console.error("Error fetching monthly attendance:", error);
    return { success: false, error: "Failed to fetch monthly attendance" };
  }
}

export async function getAttendanceCountAction(
  employeeId: number,
  startDate: Date,
  endDate: Date,
) {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: "Unauthorized" };
  // Similar checks could be applied here if needed

  try {
    const count = await prisma.employeeAttendance.count({
      where: {
        employee_id: employeeId,
        status: "PRESENT",
        date: {
          gt: startDate,
          lte: endDate,
        },
      },
    });
    return { success: true, data: count };
  } catch (error) {
    console.error("Error fetching attendance count:", error);
    return { success: false, error: "Failed to fetch attendance count" };
  }
}
