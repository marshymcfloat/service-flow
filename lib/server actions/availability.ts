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
  const normalizedCategory = category.toLowerCase();
  let businessHours = business.business_hours.find(
    (h) =>
      h.day_of_week === dayOfWeek &&
      h.category.toLowerCase() === normalizedCategory,
  );

  if (!businessHours) {
    businessHours = business.business_hours.find(
      (h) =>
        h.day_of_week === dayOfWeek && h.category.toLowerCase() === "general",
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
      second: getPart("second"),
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
  const phNowDate = new Date(
    `${nowStr}T${phNow.hour}:${phNow.minute}:${phNow.second}+08:00`,
  );

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
  const qualifiedEmployees = business.employees.filter(
    (emp) =>
      emp.specialties.length === 0 ||
      emp.specialties.some((s) => s.toLowerCase() === normalizedCategory),
  );

  const totalEmployees = qualifiedEmployees.length;

  if (totalEmployees === 0) return [];

  let currentSlotStart = new Date(openTime);

  while (currentSlotStart < closeTime) {
    const slotEnd = new Date(
      currentSlotStart.getTime() + serviceDurationMinutes * 60 * 1000,
    );

    if (slotEnd > closeTime) {
      break;
    }

    if (isToday && currentSlotStart <= phNowDate) {
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
        const busyQualifiedIds = new Set(
          booking.availed_services
            .filter((s) => s.served_by_id)
            .map((s) => s.served_by_id!)
            .filter((id) => qualifiedEmployees.some((qe) => qe.id === id)),
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
  category = "GENERAL",
  categories,
}: {
  businessSlug: string;
  startTime: Date;
  endTime: Date;
  category?: string;
  categories?: string[];
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

  const normalizedCategories =
    categories && categories.length > 0
      ? categories.map((c) => c.toLowerCase())
      : [category.toLowerCase()];

  const qualifiedEmployees = business.employees.filter((emp) => {
    if (emp.specialties.length === 0) return true;
    return emp.specialties.some((s) =>
      normalizedCategories.includes(s.toLowerCase()),
    );
  });

  return qualifiedEmployees.map((emp) => ({
    id: emp.id,
    name: emp.user.name,
    available: !busyEmployeeIds.has(emp.id),
    specialties: emp.specialties,
  }));
}

export async function checkCategoryAvailability({
  businessSlug,
  category = "GENERAL",
  date,
}: {
  businessSlug: string;
  category?: string;
  date?: Date;
}): Promise<{
  hasBusinessHours: boolean;
  businessHoursPassed: boolean;
  qualifiedEmployeeCount: number;
  businessHours?: { open_time: string; close_time: string; is_closed: boolean };
}> {
  const business = await getCachedBusinessWithHoursAndEmployees(businessSlug);

  if (!business) {
    throw new Error("Business not found");
  }

  const checkDate = date || new Date();
  const dayOfWeek = checkDate.getDay();

  const normalizedCategory = category.toLowerCase();
  let businessHours = business.business_hours.find(
    (h) =>
      h.day_of_week === dayOfWeek &&
      h.category.toLowerCase() === normalizedCategory,
  );

  if (!businessHours) {
    businessHours = business.business_hours.find(
      (h) =>
        h.day_of_week === dayOfWeek && h.category.toLowerCase() === "general",
    );
  }

  const hasBusinessHours = !!businessHours && !businessHours.is_closed;

  let businessHoursPassed = false;
  if (hasBusinessHours && businessHours) {
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
        second: getPart("second"),
      };
    };

    const phDate = getPHDateComponents(checkDate);
    const dateStr = `${phDate.year}-${phDate.month}-${phDate.day}`;

    const now = new Date();
    const phNow = getPHDateComponents(now);
    const nowStr = `${phNow.year}-${phNow.month}-${phNow.day}`;
    const phNowDate = new Date(
      `${nowStr}T${phNow.hour}:${phNow.minute}:${phNow.second}+08:00`,
    );

    const isToday = dateStr === nowStr;

    if (isToday) {
      const openTimeStr = `${dateStr}T${businessHours.open_time}:00+08:00`;
      const openTime = new Date(openTimeStr);
      const closeTimeStr = `${dateStr}T${businessHours.close_time}:00+08:00`;
      const closeTime = new Date(closeTimeStr);
      businessHoursPassed = phNowDate < openTime || phNowDate >= closeTime;
    }
  }

  const qualifiedEmployees = business.employees.filter(
    (emp) =>
      emp.specialties.length === 0 ||
      emp.specialties.some((s) => s.toLowerCase() === normalizedCategory),
  );

  return {
    hasBusinessHours,
    businessHoursPassed,
    qualifiedEmployeeCount: qualifiedEmployees.length,
    businessHours: businessHours
      ? {
          open_time: businessHours.open_time,
          close_time: businessHours.close_time,
          is_closed: businessHours.is_closed,
        }
      : undefined,
  };
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
