"use server";

import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

// Maximum distance in meters
const MAX_DISTANCE_METERS = 100;

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
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
  date: Date = new Date(),
) {
  try {
    // Correct way to filter by date range for "today"
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

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

    if (distance > MAX_DISTANCE_METERS) {
      return {
        success: false,
        error: `You are too far from the workplace (${Math.round(distance)}m away). Max allowed: ${MAX_DISTANCE_METERS}m.`,
      };
    }

    // Check if already clocked in today
    const existing = await checkAttendanceStatusAction(employeeId);
    if (existing.success && existing.data) {
      return { success: false, error: "Already clocked in today." };
    }

    const attendance = await prisma.employeeAttendance.create({
      data: {
        employee_id: employeeId,
        date: new Date(),
        time_in: new Date(),
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
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

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
        time_out: new Date(),
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
  month: number, // 0-11
) {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

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
