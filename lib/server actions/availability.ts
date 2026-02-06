"use server";

import { prisma } from "@/prisma/prisma";

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
  availableEmployeeCount: number;
}

export interface SelectedServiceInput {
  id: number;
  quantity?: number;
}

export interface GetAvailableSlotsParams {
  businessSlug: string;
  date: Date;
  services: SelectedServiceInput[];
  slotIntervalMinutes?: number;
}

import { getCachedBusinessWithHoursAndEmployees } from "@/lib/data/cached";

export async function getAvailableSlots({
  businessSlug,
  date,
  services,
  slotIntervalMinutes = 30,
}: GetAvailableSlotsParams): Promise<TimeSlot[]> {
  const business = await getCachedBusinessWithHoursAndEmployees(businessSlug);

  if (!business) {
    throw new Error("Business not found");
  }

  if (!services || services.length === 0) {
    return [];
  }

  const dayOfWeek = date.getDay();

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

  const now = new Date();
  const phNow = getPHDateComponents(now);
  const nowStr = `${phNow.year}-${phNow.month}-${phNow.day}`;
  const phNowDate = new Date(
    `${nowStr}T${phNow.hour}:${phNow.minute}:${phNow.second}+08:00`,
  );

  const isToday = dateStr === nowStr;

  const dayStart = new Date(`${dateStr}T00:00:00+08:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const resolveBusinessHours = (category: string) => {
    const normalizedCategory = category.toLowerCase();
    let businessHours = business.business_hours.find(
      (h) =>
        h.day_of_week === dayOfWeek &&
        h.category.toLowerCase() === normalizedCategory,
    );

    if (!businessHours) {
      businessHours = business.business_hours.find(
        (h) =>
          h.day_of_week === dayOfWeek &&
          h.category.toLowerCase() === "general",
      );
    }

    return businessHours ?? null;
  };

  const buildWindowsForHours = (hours: {
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }) => {
    if (hours.is_closed) return [] as { start: Date; end: Date }[];

    const openTime = new Date(`${dateStr}T${hours.open_time}:00+08:00`);
    const closeTime = new Date(`${dateStr}T${hours.close_time}:00+08:00`);

    if (hours.open_time === hours.close_time) {
      return [{ start: dayStart, end: dayEnd }];
    }

    if (openTime < closeTime) {
      return [{ start: openTime, end: closeTime }];
    }

    return [
      { start: openTime, end: dayEnd },
      { start: dayStart, end: closeTime },
    ];
  };

  const sumWindowMinutes = (windows: { start: Date; end: Date }[]) =>
    windows.reduce(
      (total, window) =>
        total + (window.end.getTime() - window.start.getTime()) / 60000,
      0,
    );

  const selectedServiceRecords = await prisma.service.findMany({
    where: {
      id: { in: services.map((s) => s.id) },
      business_id: business.id,
    },
    select: {
      id: true,
      category: true,
      duration: true,
    },
  });

  const serviceRecordMap = new Map(
    selectedServiceRecords.map((service) => [service.id, service]),
  );

  const hoursCache = new Map<
    string,
    { windows: { start: Date; end: Date }[]; windowMinutes: number }
  >();

  const getHoursMeta = (category: string) => {
    const key = category.toLowerCase();
    const cached = hoursCache.get(key);
    if (cached) return cached;

    const hours = resolveBusinessHours(category);
    if (!hours) {
      const empty = { windows: [], windowMinutes: 0 };
      hoursCache.set(key, empty);
      return empty;
    }

    const windows = buildWindowsForHours(hours);
    const windowMinutes = sumWindowMinutes(windows);
    const meta = { windows, windowMinutes };
    hoursCache.set(key, meta);
    return meta;
  };

  const serviceEntries = services.flatMap((serviceInput) => {
    const record = serviceRecordMap.get(serviceInput.id);
    if (!record) return [];
    const quantity = Math.max(1, Number(serviceInput.quantity) || 1);
    const duration = record.duration || 30;
    return Array.from({ length: quantity }).map(() => ({
      id: record.id,
      category: record.category,
      duration,
      hoursMeta: getHoursMeta(record.category),
    }));
  });

  if (serviceEntries.length === 0) {
    return [];
  }

  if (serviceEntries.some((entry) => entry.hoursMeta.windowMinutes <= 0)) {
    return [];
  }

  const orderedServices = [...serviceEntries].sort((a, b) => {
    // Auto-order by constraint: tighter windows first, then longer duration.
    if (a.hoursMeta.windowMinutes !== b.hoursMeta.windowMinutes) {
      return a.hoursMeta.windowMinutes - b.hoursMeta.windowMinutes;
    }
    if (a.duration !== b.duration) {
      return b.duration - a.duration;
    }
    return a.id - b.id;
  });

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

  const bookingIntervals = existingBookings
    .map((booking) => {
      if (!booking.scheduled_at || !booking.estimated_end) return null;
      const busyIds = booking.availed_services
        .filter((s) => s.served_by_id)
        .map((s) => s.served_by_id!)
        .filter((id, index, arr) => arr.indexOf(id) === index);
      return {
        start: booking.scheduled_at,
        end: booking.estimated_end,
        busyIds,
      };
    })
    .filter(Boolean) as { start: Date; end: Date; busyIds: number[] }[];

  const slots: TimeSlot[] = [];
  const qualifiedEmployeesByCategory = new Map<string, number[]>();
  const getQualifiedEmployeeIds = (category: string) => {
    const key = category.toLowerCase();
    const cached = qualifiedEmployeesByCategory.get(key);
    if (cached) return cached;

    const ids = business.employees
      .filter(
        (emp) =>
          emp.specialties.length === 0 ||
          emp.specialties.some((s) => s.toLowerCase() === key),
      )
      .map((emp) => emp.id);
    qualifiedEmployeesByCategory.set(key, ids);
    return ids;
  };

  const isWithinWindows = (
    start: Date,
    end: Date,
    windows: { start: Date; end: Date }[],
  ) => windows.some((window) => start >= window.start && end <= window.end);

  const earliestWindowStart = Math.min(
    ...orderedServices.flatMap((entry) =>
      entry.hoursMeta.windows.map((window) => window.start.getTime()),
    ),
  );
  const latestWindowEnd = Math.max(
    ...orderedServices.flatMap((entry) =>
      entry.hoursMeta.windows.map((window) => window.end.getTime()),
    ),
  );

  let currentSlotStart = new Date(
    Math.max(dayStart.getTime(), earliestWindowStart),
  );
  const slotEndLimit = new Date(
    Math.min(dayEnd.getTime(), latestWindowEnd),
  );

  while (currentSlotStart < slotEndLimit) {
    if (isToday && currentSlotStart <= phNowDate) {
      currentSlotStart = new Date(
        currentSlotStart.getTime() + slotIntervalMinutes * 60 * 1000,
      );
      continue;
    }

    let cursor = new Date(currentSlotStart);
    let availableEmployeeCount = Number.POSITIVE_INFINITY;
    let slotFits = true;

    for (const service of orderedServices) {
      const serviceEnd = new Date(
        cursor.getTime() + service.duration * 60 * 1000,
      );

      if (!isWithinWindows(cursor, serviceEnd, service.hoursMeta.windows)) {
        slotFits = false;
        break;
      }

      const qualifiedEmployeeIds = getQualifiedEmployeeIds(service.category);
      if (qualifiedEmployeeIds.length === 0) {
        slotFits = false;
        break;
      }

      const busyQualifiedIds = new Set<number>();
      for (const booking of bookingIntervals) {
        const overlaps = cursor < booking.end && serviceEnd > booking.start;
        if (!overlaps) continue;
        booking.busyIds.forEach((id) => {
          if (qualifiedEmployeeIds.includes(id)) {
            busyQualifiedIds.add(id);
          }
        });
      }

      const availableForSegment = Math.max(
        0,
        qualifiedEmployeeIds.length - busyQualifiedIds.size,
      );
      availableEmployeeCount = Math.min(
        availableEmployeeCount,
        availableForSegment,
      );
      if (availableEmployeeCount <= 0) {
        slotFits = false;
        break;
      }

      cursor = serviceEnd;
    }

    if (slotFits) {
      const slotEnd = cursor;
      slots.push({
        startTime: new Date(currentSlotStart),
        endTime: new Date(slotEnd),
        available: availableEmployeeCount > 0,
        availableEmployeeCount:
          availableEmployeeCount === Number.POSITIVE_INFINITY
            ? 0
            : availableEmployeeCount,
      });
    }

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
