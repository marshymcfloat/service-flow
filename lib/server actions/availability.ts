"use server";

import {
  getCachedBusinessBySlug,
  getCachedBusinessWithHoursAndEmployees,
} from "@/lib/data/cached";
import { authOptions } from "@/lib/next auth/options";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { getBookingPolicyByBusinessSlug } from "@/lib/services/booking-policy";
import { recordBookingMetric } from "@/lib/services/booking-metrics";
import {
  computeSlots,
  listAlternativeSlots,
} from "@/lib/services/booking-availability";
import type {
  SelectedServiceInput,
  TimeSlot,
} from "@/lib/services/booking-availability";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";

export interface GetAvailableSlotsParams {
  businessSlug: string;
  date: Date;
  services: SelectedServiceInput[];
  slotIntervalMinutes?: number;
}

const MANILA_TIME_ZONE = "Asia/Manila";
const ATTENDANCE_ACTIVE_STATUSES = ["PRESENT", "LATE"] as const;

type AttendanceWindow = {
  timeIn: Date;
  timeOut: Date | null;
};

function getPHDateComponents(d: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
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
}

function toPHDateString(d: Date) {
  const parts = getPHDateComponents(d);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getPHDayBounds(date: Date) {
  const dateStr = toPHDateString(date);
  const dayStart = new Date(`${dateStr}T00:00:00+08:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dateStr, dayStart, dayEnd };
}

function isEmployeeClockedInForWindow(
  windowsByEmployee: Map<number, AttendanceWindow[]>,
  employeeId: number,
  start: Date,
  end: Date,
) {
  const windows = windowsByEmployee.get(employeeId);
  if (!windows || windows.length === 0) return false;

  return windows.some(
    (window) =>
      window.timeIn.getTime() <= start.getTime() &&
      (!window.timeOut || window.timeOut.getTime() >= end.getTime()),
  );
}

async function getAttendanceWindowsForDay({
  businessId,
  dayStart,
  dayEnd,
}: {
  businessId: string;
  dayStart: Date;
  dayEnd: Date;
}) {
  const records = await prisma.employeeAttendance.findMany({
    where: {
      employee: { business_id: businessId },
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        in: [...ATTENDANCE_ACTIVE_STATUSES],
      },
      time_in: {
        not: null,
      },
    },
    select: {
      employee_id: true,
      time_in: true,
      time_out: true,
    },
  });

  const windowsByEmployee = new Map<number, AttendanceWindow[]>();
  for (const record of records) {
    if (!record.time_in) continue;
    const windows = windowsByEmployee.get(record.employee_id) || [];
    windows.push({ timeIn: record.time_in, timeOut: record.time_out });
    windowsByEmployee.set(record.employee_id, windows);
  }

  return windowsByEmployee;
}

function buildWindowsForHours({
  dateStr,
  openTime,
  closeTime,
}: {
  dateStr: string;
  openTime: string;
  closeTime: string;
}) {
  const start = new Date(`${dateStr}T${openTime}:00+08:00`);
  const end = new Date(`${dateStr}T${closeTime}:00+08:00`);

  if (openTime === closeTime) {
    const dayStart = new Date(`${dateStr}T00:00:00+08:00`);
    return [{ start: dayStart, end: new Date(dayStart.getTime() + 86400000) }];
  }

  if (start < end) return [{ start, end }];

  const dayStart = new Date(`${dateStr}T00:00:00+08:00`);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  return [
    { start, end: dayEnd },
    { start: dayStart, end },
  ];
}

async function applyAvailabilityRateLimit(businessSlug: string, kind: string) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return;

  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for") || "";
  const clientIp = forwardedFor.split(",")[0]?.trim() || "unknown";
  const limiter = await rateLimit(`public-availability:${kind}:${businessSlug}:${clientIp}`, {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });

  if (!limiter.success) {
    logger.warn("[BookingAvailability] Rate limited", {
      businessSlug,
      kind,
      clientIp,
    });
    throw new Error("Too many availability requests. Please try again shortly.");
  }
}

async function getBusinessIdBySlug(businessSlug: string) {
  const business = await getCachedBusinessBySlug(businessSlug);
  return business?.id;
}

export async function getAvailableSlots({
  businessSlug,
  date,
  services,
  slotIntervalMinutes,
}: GetAvailableSlotsParams): Promise<TimeSlot[]> {
  const startedAt = Date.now();
  await applyAvailabilityRateLimit(businessSlug, "slots");
  try {
    const policy = await getBookingPolicyByBusinessSlug(prisma, businessSlug);
    const slots = await computeSlots({
      businessSlug,
      date,
      services,
      slotIntervalMinutes,
    });
    const strictWindowApplied =
      toPHDateString(date) === toPHDateString(new Date()) &&
      policy.sameDayAttendanceStrictMinutes > 0;
    const tentativeCount = slots.filter(
      (slot) => slot.confidence === "TENTATIVE",
    ).length;
    const confirmedCount = slots.length - tentativeCount;

    const businessId = await getBusinessIdBySlug(businessSlug);
    if (businessId) {
      await recordBookingMetric({
        businessId,
        action: "BOOKING_SLOT_LOOKUP",
        outcome: "SUCCESS",
        metadata: {
          slotsReturned: slots.length,
          hasCapacity: slots.length > 0,
          strictWindowApplied,
          tentativeCount,
          confirmedCount,
          latencyMs: Date.now() - startedAt,
        },
      });
    }
    logger.info("[BookingAvailability] Slot lookup completed", {
      businessSlug,
      slotsReturned: slots.length,
      latencyMs: Date.now() - startedAt,
    });
    return slots;
  } catch (error) {
    const businessId = await getBusinessIdBySlug(businessSlug);
    if (businessId) {
      await recordBookingMetric({
        businessId,
        action: "BOOKING_SLOT_LOOKUP",
        outcome: "FAILED",
        reason: error instanceof Error ? error.message : "UNKNOWN",
        metadata: {
          latencyMs: Date.now() - startedAt,
        },
      });
    }
    logger.warn("[BookingAvailability] Slot lookup failed", {
      businessSlug,
      latencyMs: Date.now() - startedAt,
      reason: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getAlternativeSlots({
  businessSlug,
  scheduledAt,
  services,
  limit = 6,
}: {
  businessSlug: string;
  scheduledAt: Date;
  services: SelectedServiceInput[];
  limit?: number;
}) {
  const startedAt = Date.now();
  await applyAvailabilityRateLimit(businessSlug, "alternatives");
  const alternatives = await listAlternativeSlots({
    businessSlug,
    scheduledAt,
    services,
    limit,
  });
  logger.info("[BookingAvailability] Alternative slot lookup completed", {
    businessSlug,
    alternativesReturned: alternatives.length,
    latencyMs: Date.now() - startedAt,
  });
  return alternatives;
}

export async function getAvailableProviders({
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
  await applyAvailabilityRateLimit(businessSlug, "providers");

  const business = await getCachedBusinessWithHoursAndEmployees(businessSlug);
  if (!business) {
    throw new Error("Business not found");
  }

  const policy = await getBookingPolicyByBusinessSlug(prisma, businessSlug);
  const dayDiff =
    (getPHDayBounds(startTime).dayStart.getTime() -
      getPHDayBounds(new Date()).dayStart.getTime()) /
    86400000;

  if (dayDiff < 0 || dayDiff >= policy.bookingHorizonDays) {
    return [];
  }
  if (!policy.bookingV2Enabled && dayDiff > 0) {
    return [];
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

  const selectedDateStr = toPHDateString(startTime);
  const todayDateStr = toPHDateString(new Date());
  const nowParts = getPHDateComponents(new Date());
  const phNow = new Date(
    `${todayDateStr}T${nowParts.hour}:${nowParts.minute}:${nowParts.second}+08:00`,
  );
  const strictCutoff = new Date(
    phNow.getTime() + policy.sameDayAttendanceStrictMinutes * 60000,
  );
  const shouldFilterByAttendance =
    selectedDateStr === todayDateStr && startTime.getTime() < strictCutoff.getTime();
  const { dayStart, dayEnd } = getPHDayBounds(startTime);
  const attendanceWindowsByEmployee = shouldFilterByAttendance
    ? await getAttendanceWindowsForDay({
        businessId: business.id,
        dayStart,
        dayEnd,
      })
    : new Map<number, AttendanceWindow[]>();

  const qualifiedEmployees = business.employees.filter((employee) => {
    if (employee.specialties.length === 0) return true;
    return employee.specialties.some((specialty) =>
      normalizedCategories.includes(specialty.toLowerCase()),
    );
  });

  return qualifiedEmployees.map((employee) => ({
    id: employee.id,
    name: employee.user.name,
    available:
      !busyEmployeeIds.has(employee.id) &&
      (!shouldFilterByAttendance ||
        isEmployeeClockedInForWindow(
          attendanceWindowsByEmployee,
          employee.id,
          startTime,
          endTime,
        )),
    specialties: employee.specialties,
    type: "EMPLOYEE" as const,
  }));
}

export async function checkCategoryAvailability({
  businessSlug,
  category = "GENERAL",
  date,
  enforceAttendanceForToday = true,
}: {
  businessSlug: string;
  category?: string;
  date?: Date;
  enforceAttendanceForToday?: boolean;
}): Promise<{
  hasBusinessHours: boolean;
  businessHoursPassed: boolean;
  qualifiedEmployeeCount: number;
  ownerAvailable: boolean;
  availabilitySource: "ATTENDANCE" | "ROSTER";
  businessHours?: { open_time: string; close_time: string; is_closed: boolean };
}> {
  const business = await getCachedBusinessWithHoursAndEmployees(businessSlug);
  if (!business) {
    throw new Error("Business not found");
  }

  const checkDate = date || new Date();
  const dayOfWeek = checkDate.getDay();
  const normalizedCategory = category.toLowerCase();
  const dateStr = toPHDateString(checkDate);
  const now = new Date();
  const nowStr = toPHDateString(now);
  const nowParts = getPHDateComponents(now);
  const phNowDate = new Date(
    `${nowStr}T${nowParts.hour}:${nowParts.minute}:${nowParts.second}+08:00`,
  );
  const isToday = dateStr === nowStr;

  let businessHours = business.business_hours.find(
    (h) =>
      h.day_of_week === dayOfWeek && h.category.toLowerCase() === normalizedCategory,
  );

  if (!businessHours) {
    businessHours = business.business_hours.find(
      (h) => h.day_of_week === dayOfWeek && h.category.toLowerCase() === "general",
    );
  }

  const hasBusinessHours = !!businessHours && !businessHours.is_closed;
  let businessHoursPassed = false;
  if (hasBusinessHours && businessHours && isToday) {
    const windows = buildWindowsForHours({
      dateStr,
      openTime: businessHours.open_time,
      closeTime: businessHours.close_time,
    });
    businessHoursPassed = !windows.some(
      (window) => phNowDate >= window.start && phNowDate < window.end,
    );
  }

  const qualifiedEmployees = business.employees.filter(
    (employee) =>
      employee.specialties.length === 0 ||
      employee.specialties.some((specialty) => specialty.toLowerCase() === normalizedCategory),
  );

  const ownerAvailable = business.owners.some(
    (owner) =>
      owner.specialties.length === 0 ||
      owner.specialties.some((specialty) => specialty.toLowerCase() === normalizedCategory),
  );

  const applyAttendance =
    enforceAttendanceForToday && isToday && qualifiedEmployees.length > 0;
  let qualifiedEmployeeCount = qualifiedEmployees.length;

  if (applyAttendance) {
    const { dayStart, dayEnd } = getPHDayBounds(checkDate);
    const attendanceWindowsByEmployee = await getAttendanceWindowsForDay({
      businessId: business.id,
      dayStart,
      dayEnd,
    });
    qualifiedEmployeeCount = qualifiedEmployees.filter((employee) =>
      isEmployeeClockedInForWindow(
        attendanceWindowsByEmployee,
        employee.id,
        phNowDate,
        phNowDate,
      ),
    ).length;
  }

  return {
    hasBusinessHours,
    businessHoursPassed,
    qualifiedEmployeeCount,
    ownerAvailable,
    availabilitySource: applyAttendance ? "ATTENDANCE" : "ROSTER",
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
