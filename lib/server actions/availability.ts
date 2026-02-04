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
  slotIntervalMinutes?: number;
  category?: string;
}

import { getCachedBusinessWithHoursAndEmployees } from "@/lib/data/cached";

export async function getAvailableSlots({
  businessSlug,
  date,
  serviceDurationMinutes,
  slotIntervalMinutes = 30,
  category = "GENERAL",
}: GetAvailableSlotsParams): Promise<TimeSlot[]> {
  const business = await getCachedBusinessWithHoursAndEmployees(businessSlug);

  if (!business) {
    throw new Error("Business not found");
  }

  const dayOfWeek = date.getDay();
  // Try to find category-specific hours, fallback to GENERAL
  let businessHours = business.business_hours.find(
    (h) => h.day_of_week === dayOfWeek && h.category === category
  );

  if (!businessHours) {
     businessHours = business.business_hours.find(
      (h) => h.day_of_week === dayOfWeek && h.category === "GENERAL"
    );
  }

  if (!businessHours || businessHours.is_closed) {
    return [];
  }

  const TIMEZONE_OFFSET = 8 * 60;

  const getPHDateComponents = (d: Date) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) =>
      parts.find((p) => p.type === type)?.value || "";

    return {
      year: getPart("year"),
      month: getPart("month"),
      day: getPart("day"),
      hour: getPart("hour"),
      minute: getPart("minute"),
    };
  };

  const phDate = getPHDateComponents(date);
  const dateStr = `${phDate.year}-${phDate.month}-${phDate.day}`;

  const openTimeStr = `${dateStr}T${businessHours.open_time}:00+08:00`;
  const closeTimeStr = `${dateStr}T${businessHours.close_time}:00+08:00`;

  const openTime = new Date(openTimeStr);
  const closeTime = new Date(closeTimeStr);

  const now = new Date();
  const phNow = getPHDateComponents(now);
  const nowStr = `${phNow.year}-${phNow.month}-${phNow.day}`;

  const isToday = dateStr === nowStr;

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
        not: "CANCELLED",
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

  const slots: TimeSlot[] = [];

  // Filter employees based on specialty
  // If no specialties list, assume generalist (can do everything)
  // If specialties exists, must include category
  const qualifiedEmployees = business.employees.filter(emp => 
    emp.specialties.length === 0 || emp.specialties.includes(category)
  );

  const totalEmployees = qualifiedEmployees.length;

  // Optim: If no employees can perform this category, no slots
  if (totalEmployees === 0) return [];

  let currentSlotStart = new Date(openTime);

  while (currentSlotStart < closeTime) {
    const slotEnd = new Date(
      currentSlotStart.getTime() + serviceDurationMinutes * 60 * 1000,
    );

    if (slotEnd > closeTime) {
      break;
    }

    if (isToday && currentSlotStart <= now) {
      currentSlotStart = new Date(
        currentSlotStart.getTime() + slotIntervalMinutes * 60 * 1000,
      );
      continue;
    }

    let busyEmployees = 0;

    for (const booking of existingBookings) {
      if (!booking.scheduled_at || !booking.estimated_end) continue;

      const bookingStart = booking.scheduled_at;
      const bookingEnd = booking.estimated_end;

      const overlaps = currentSlotStart < bookingEnd && slotEnd > bookingStart;

      if (overlaps) {
        // Count how many QUALIFIED employees are busy
        const busyQualifiedIds = new Set(
          booking.availed_services
             // Only count employees who are actually served_by someone
            .filter((s) => s.served_by_id)
             // Check if the busy employee is one of our qualified employees
             // (Though strictly, if they are busy, they are busy, regardless of task)
             // But we only subtract from totalEmployees (which is qualified count)
             // So we need to see if any of *our qualified pool* is busy.
            .map((s) => s.served_by_id!)
            .filter(id => qualifiedEmployees.some(qe => qe.id === id))
        );
        busyEmployees += busyQualifiedIds.size;
      }
    }

    const availableEmployeeCount = Math.max(0, totalEmployees - busyEmployees);

    slots.push({
      startTime: new Date(currentSlotStart),
      endTime: new Date(slotEnd),
      available: availableEmployeeCount > 0,
      availableEmployeeCount,
    });

    currentSlotStart = new Date(
      currentSlotStart.getTime() + slotIntervalMinutes * 60 * 1000,
    );
  }

  return slots;
}

export async function getAvailableEmployees({
  businessSlug,
  startTime,
  endTime,
  category = "GENERAL"
}: {
  businessSlug: string;
  startTime: Date;
  endTime: Date;
  category?: string;
}) {
  const business = await getCachedBusinessWithHoursAndEmployees(businessSlug);

  if (!business) {
    throw new Error("Business not found");
  }

  const overlappingBookings = await prisma.booking.findMany({
    where: {
      business_id: business.id,
      scheduled_at: { lte: endTime },
      estimated_end: { gte: startTime },
      status: {
        not: "CANCELLED",
      },
    },
    include: {
      availed_services: true,
    },
  });

  const busyEmployeeIds = new Set<number>();
  for (const booking of overlappingBookings) {
    for (const service of booking.availed_services) {
      if (service.served_by_id) {
        busyEmployeeIds.add(service.served_by_id);
      }
    }
  }

  // Filter by specialty
  const qualifiedEmployees = business.employees.filter(emp => 
    emp.specialties.length === 0 || emp.specialties.includes(category)
  );

  return qualifiedEmployees.map((emp) => ({
    id: emp.id,
    name: emp.user.name,
    available: !busyEmployeeIds.has(emp.id),
  }));
}

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
