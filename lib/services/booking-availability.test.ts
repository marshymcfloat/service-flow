import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BookingAvailabilityError,
  computeSlots,
  validateBookingOrThrow,
} from "./booking-availability";

const prismaMock = vi.hoisted(() => ({
  service: { findMany: vi.fn() },
  booking: { findMany: vi.fn() },
  employeeAttendance: { findMany: vi.fn() },
}));

const cachedMock = vi.hoisted(() => ({
  getCachedBusinessWithHoursAndEmployees: vi.fn(),
}));

const policyMock = vi.hoisted(() => ({
  getBookingPolicyByBusinessSlug: vi.fn(),
}));

vi.mock("@/prisma/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/data/cached", () => cachedMock);
vi.mock("./booking-policy", () => policyMock);
vi.mock("@/lib/date-utils", () => ({
  getCurrentDateTimePH: vi.fn(() => new Date("2026-02-12T08:00:00+08:00")),
}));

const baseBusiness = {
  id: "biz_1",
  business_hours: [
    {
      day_of_week: 4,
      category: "GENERAL",
      open_time: "09:00",
      close_time: "18:00",
      is_closed: false,
    },
    {
      day_of_week: 5,
      category: "GENERAL",
      open_time: "09:00",
      close_time: "18:00",
      is_closed: false,
    },
  ],
  employees: [{ id: 1, specialties: [], user: { name: "Alex" } }],
  owners: [],
};

describe("booking-availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cachedMock.getCachedBusinessWithHoursAndEmployees.mockResolvedValue(
      baseBusiness,
    );
    policyMock.getBookingPolicyByBusinessSlug.mockResolvedValue({
      bookingHorizonDays: 14,
      minLeadMinutes: 30,
      slotIntervalMinutes: 30,
      sameDayAttendanceStrictMinutes: 120,
      allowPublicFullPayment: true,
      allowPublicDownpayment: true,
      defaultPublicPaymentType: "FULL",
      bookingV2Enabled: true,
    });
    prismaMock.service.findMany.mockResolvedValue([
      { id: 1, category: "GENERAL", duration: 30 },
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.employeeAttendance.findMany.mockResolvedValue([
      {
        employee_id: 1,
        time_in: new Date("2026-02-12T00:00:00+08:00"),
        time_out: null,
      },
    ]);
  });

  it("returns tentative roster slots for future dates", async () => {
    const slots = await computeSlots({
      businessSlug: "demo-business",
      date: new Date("2026-02-13T00:00:00+08:00"),
      services: [{ id: 1, quantity: 1 }],
      now: new Date("2026-02-12T08:00:00+08:00"),
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].source).toBe("ROSTER");
    expect(slots[0].confidence).toBe("TENTATIVE");
  });

  it("returns no confirmed slots in strict window when attendance is empty", async () => {
    prismaMock.employeeAttendance.findMany.mockResolvedValue([]);

    const slots = await computeSlots({
      businessSlug: "demo-business",
      date: new Date("2026-02-12T00:00:00+08:00"),
      services: [{ id: 1, quantity: 1 }],
      now: new Date("2026-02-12T08:00:00+08:00"),
    });

    const strictWindowEnd = new Date("2026-02-12T10:00:00+08:00").getTime();
    const strictWindowSlots = slots.filter(
      (slot) => slot.startTime.getTime() < strictWindowEnd,
    );

    expect(strictWindowSlots).toEqual([]);
  });

  it("returns tentative same-day slots outside strict window when attendance is empty", async () => {
    prismaMock.employeeAttendance.findMany.mockResolvedValue([]);

    const slots = await computeSlots({
      businessSlug: "demo-business",
      date: new Date("2026-02-12T00:00:00+08:00"),
      services: [{ id: 1, quantity: 1 }],
      now: new Date("2026-02-12T08:00:00+08:00"),
    });

    const tenAm = slots.find(
      (slot) =>
        slot.startTime.toISOString() ===
        new Date("2026-02-12T10:00:00+08:00").toISOString(),
    );
    expect(tenAm).toMatchObject({
      source: "ROSTER",
      confidence: "TENTATIVE",
    });
  });

  it("prefers confirmed attendance slots outside strict window when attendance exists", async () => {
    const slots = await computeSlots({
      businessSlug: "demo-business",
      date: new Date("2026-02-12T00:00:00+08:00"),
      services: [{ id: 1, quantity: 1 }],
      now: new Date("2026-02-12T08:00:00+08:00"),
    });

    const tenAm = slots.find(
      (slot) =>
        slot.startTime.toISOString() ===
        new Date("2026-02-12T10:00:00+08:00").toISOString(),
    );
    expect(tenAm).toMatchObject({
      source: "ATTENDANCE",
      confidence: "CONFIRMED",
    });
  });

  it("keeps HOLD overlaps consuming capacity until they clear", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([
      {
        status: "HOLD",
        scheduled_at: new Date("2026-02-12T09:00:00+08:00"),
        estimated_end: new Date("2026-02-12T09:30:00+08:00"),
        availed_services: [
          {
            status: "PENDING",
            scheduled_at: new Date("2026-02-12T09:00:00+08:00"),
            estimated_end: new Date("2026-02-12T09:30:00+08:00"),
            served_by_id: null,
            served_by_owner_id: null,
            service: { category: "GENERAL" },
          },
        ],
      },
    ]);
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    const blockedSlots = await computeSlots({
      businessSlug: "demo-business",
      date: new Date("2026-02-12T00:00:00+08:00"),
      services: [{ id: 1, quantity: 1 }],
      now: new Date("2026-02-12T08:00:00+08:00"),
    });

    const nineAmBlocked = blockedSlots.find(
      (slot) =>
        slot.startTime.toISOString() ===
        new Date("2026-02-12T09:00:00+08:00").toISOString(),
    );
    expect(nineAmBlocked).toBeUndefined();

    const availableAfterHoldClears = await computeSlots({
      businessSlug: "demo-business",
      date: new Date("2026-02-12T00:00:00+08:00"),
      services: [{ id: 1, quantity: 1 }],
      now: new Date("2026-02-12T08:00:00+08:00"),
    });
    const nineAmAfterClear = availableAfterHoldClears.find(
      (slot) =>
        slot.startTime.toISOString() ===
        new Date("2026-02-12T09:00:00+08:00").toISOString(),
    );
    expect(nineAmAfterClear).toBeDefined();
  });

  it("throws a payment policy error for disallowed public payment type", async () => {
    policyMock.getBookingPolicyByBusinessSlug.mockResolvedValue({
      bookingHorizonDays: 14,
      minLeadMinutes: 30,
      slotIntervalMinutes: 30,
      sameDayAttendanceStrictMinutes: 120,
      allowPublicFullPayment: false,
      allowPublicDownpayment: true,
      defaultPublicPaymentType: "DOWNPAYMENT",
      bookingV2Enabled: true,
    });

    await expect(
      validateBookingOrThrow({
        businessSlug: "demo-business",
        scheduledAt: new Date("2026-02-12T10:00:00+08:00"),
        services: [{ id: 1, quantity: 1 }],
        paymentType: "FULL",
        isPublicBooking: true,
        isWalkIn: true,
      }),
    ).rejects.toBeInstanceOf(BookingAvailabilityError);
  });
});
