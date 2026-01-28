"use server";

import { prisma } from "@/prisma/prisma";

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
  availableEmployeeCount: number;
}

export interface GetAvailableSlotsParams {
  businessSlug: string;
  date: Date;
  serviceDurationMinutes: number;
  slotIntervalMinutes?: number; // defaults to 30
}

/**
 * Get available time slots for a given date at a business
 * Takes into account:
 * - Business hours for that day
 * - Existing bookings that would overlap
 * - Employee availability
 */
export async function getAvailableSlots({
  businessSlug,
  date,
  serviceDurationMinutes,
  slotIntervalMinutes = 30,
}: GetAvailableSlotsParams): Promise<TimeSlot[]> {
  // 1. Get business and its hours for this day
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      business_hours: true,
      employees: true,
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
  const businessHours = business.business_hours.find(
    (h) => h.day_of_week === dayOfWeek,
  );

  // If no hours configured or closed that day, return empty
  if (!businessHours || businessHours.is_closed) {
    return [];
  }

  // 2. Parse open/close times
  // Use local date (server time) instead of ISO (UTC) to avoid timezone shifts
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  const openTime = new Date(`${dateStr}T${businessHours.open_time}:00`);
  const closeTime = new Date(`${dateStr}T${businessHours.close_time}:00`);

  // Get current time to filter out past slots
  const now = new Date();

  const nowYear = now.getFullYear();
  const nowMonth = String(now.getMonth() + 1).padStart(2, "0");
  const nowDay = String(now.getDate()).padStart(2, "0");
  const nowStr = `${nowYear}-${nowMonth}-${nowDay}`;

  const isToday = dateStr === nowStr;

  // 3. Get all bookings for this date that have scheduled times
  const dayStart = new Date(dateStr);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateStr);
  dayEnd.setHours(23, 59, 59, 999);

  const existingBookings = await prisma.booking.findMany({
    where: {
      business_id: business.id,
      scheduled_at: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        notIn: ["CANCELLED", "REJECTED", "REFUNDED"],
      },
    },
    include: {
      availed_services: {
        include: {
          served_by: true,
        },
      },
    },
  });

  // 4. Generate time slots
  const slots: TimeSlot[] = [];
  const totalEmployees = business.employees.length;

  let currentSlotStart = new Date(openTime);

  while (currentSlotStart < closeTime) {
    const slotEnd = new Date(
      currentSlotStart.getTime() + serviceDurationMinutes * 60 * 1000,
    );

    // Don't create slots that extend past closing time
    if (slotEnd > closeTime) {
      break;
    }

    // Skip slots that are in the past (for today)
    if (isToday && currentSlotStart <= now) {
      currentSlotStart = new Date(
        currentSlotStart.getTime() + slotIntervalMinutes * 60 * 1000,
      );
      continue;
    }

    // 5. Count how many employees are busy during this slot
    let busyEmployees = 0;

    for (const booking of existingBookings) {
      if (!booking.scheduled_at || !booking.estimated_end) continue;

      const bookingStart = booking.scheduled_at;
      const bookingEnd = booking.estimated_end;

      // Check if this booking overlaps with our slot
      const overlaps = currentSlotStart < bookingEnd && slotEnd > bookingStart;

      if (overlaps) {
        // Count unique employees serving this booking
        const employeeIds = new Set(
          booking.availed_services
            .filter((s) => s.served_by_id)
            .map((s) => s.served_by_id),
        );
        busyEmployees += employeeIds.size || 1; // At least 1 employee if booking exists
      }
    }

    const availableEmployeeCount = Math.max(0, totalEmployees - busyEmployees);

    slots.push({
      startTime: new Date(currentSlotStart),
      endTime: new Date(slotEnd),
      available: availableEmployeeCount > 0,
      availableEmployeeCount,
    });

    // Move to next slot
    currentSlotStart = new Date(
      currentSlotStart.getTime() + slotIntervalMinutes * 60 * 1000,
    );
  }

  return slots;
}

/**
 * Get employees who are available for a specific time slot
 */
export async function getAvailableEmployees({
  businessSlug,
  startTime,
  endTime,
}: {
  businessSlug: string;
  startTime: Date;
  endTime: Date;
}) {
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      employees: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  // Find bookings that overlap with the requested time
  const overlappingBookings = await prisma.booking.findMany({
    where: {
      business_id: business.id,
      scheduled_at: { lte: endTime },
      estimated_end: { gte: startTime },
      status: {
        notIn: ["CANCELLED", "REJECTED", "REFUNDED"],
      },
    },
    include: {
      availed_services: true,
    },
  });

  // Get IDs of busy employees
  const busyEmployeeIds = new Set<number>();
  for (const booking of overlappingBookings) {
    for (const service of booking.availed_services) {
      if (service.served_by_id) {
        busyEmployeeIds.add(service.served_by_id);
      }
    }
  }

  // Return employees with availability status
  return business.employees.map((emp) => ({
    id: emp.id,
    name: emp.user.name,
    available: !busyEmployeeIds.has(emp.id),
  }));
}

/**
 * Get business hours for a business
 */
export async function getBusinessHours(businessSlug: string) {
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      business_hours: {
        orderBy: { day_of_week: "asc" },
      },
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  return business.business_hours;
}
