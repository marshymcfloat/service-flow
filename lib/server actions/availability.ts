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
}

import { getCachedBusinessWithHoursAndEmployees } from "@/lib/data/cached";

export async function getAvailableSlots({
  businessSlug,
  date,
  serviceDurationMinutes,
  slotIntervalMinutes = 30,
}: GetAvailableSlotsParams): Promise<TimeSlot[]> {
  const business = await getCachedBusinessWithHoursAndEmployees(businessSlug);

  if (!business) {
    throw new Error("Business not found");
  }

  const dayOfWeek = date.getDay();
  const businessHours = business.business_hours.find(
    (h) => h.day_of_week === dayOfWeek,
  );

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
  const totalEmployees = business.employees.length;

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
        const employeeIds = new Set(
          booking.availed_services
            .filter((s) => s.served_by_id)
            .map((s) => s.served_by_id),
        );
        busyEmployees += employeeIds.size || 1;
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
}: {
  businessSlug: string;
  startTime: Date;
  endTime: Date;
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

  return business.employees.map((emp) => ({
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
