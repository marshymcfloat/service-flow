import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  claimServiceAction,
  createEmployeeBookingBalanceQrAction,
  getEmployeeTodayBookingsAction,
  markEmployeeBookingPaidAction,
  unclaimServiceAction,
} from "./employee";
import { prisma } from "@/prisma/prisma";
import { requireAuth } from "@/lib/auth/guards";
import {
  AvailedServiceStatus,
  BookingStatus,
  PaymentStatus,
} from "@/prisma/generated/prisma/client";

// Mock dependencies
vi.mock("@/prisma/prisma", () => ({
  prisma: {
    availedService: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    employee: {
      findFirst: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/guards", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock sale event and pricing helpers to simplify test
vi.mock("@/lib/server actions/sale-event", () => ({
  getActiveSaleEvents: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));
vi.mock("@/lib/utils/pricing", () => ({
  getApplicableDiscount: vi.fn().mockReturnValue(null),
}));

describe("Employee Dashboard Actions", () => {
  const requireAuthMock = vi.mocked(requireAuth);
  const availedServiceFindUniqueMock = vi.mocked(prisma.availedService.findUnique);
  const availedServiceUpdateMock = vi.mocked(prisma.availedService.update);
  const employeeFindFirstMock = vi.mocked(prisma.employee.findFirst);
  const bookingFindManyMock = vi.mocked(prisma.booking.findMany);
  const bookingFindFirstMock = vi.mocked(prisma.booking.findFirst);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("claimServiceAction", () => {
    it("should return error for invalid input", async () => {
      const result = await claimServiceAction(-1, 1);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input");
    });

    it("should claim service successfully", async () => {
      requireAuthMock.mockResolvedValue({
        success: true,
        businessSlug: "test-business",
      } as Awaited<ReturnType<typeof requireAuth>>);

      availedServiceFindUniqueMock.mockResolvedValue(
        {
          id: 1,
          price: 100,
          service_id: 1,
          package_id: null,
        } as unknown as Awaited<
          ReturnType<typeof prisma.availedService.findUnique>
        >,
      );

      availedServiceUpdateMock.mockResolvedValue(
        {
          id: 1,
          status: AvailedServiceStatus.CLAIMED,
        } as unknown as Awaited<ReturnType<typeof prisma.availedService.update>>,
      );

      const result = await claimServiceAction(1, 101);

      expect(result.success).toBe(true);
      expect(prisma.availedService.update).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: AvailedServiceStatus.PENDING,
          booking: { business: { slug: "test-business" } },
        },
        data: expect.objectContaining({
          status: AvailedServiceStatus.CLAIMED,
          served_by_id: 101,
        }),
      });
    });
  });

  describe("unclaimServiceAction", () => {
    it("should return error for invalid input", async () => {
      const result = await unclaimServiceAction(-1);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input");
    });

    it("should unclaim service successfully", async () => {
      requireAuthMock.mockResolvedValue({
        success: true,
        businessSlug: "test-business",
      } as Awaited<ReturnType<typeof requireAuth>>);

      availedServiceFindUniqueMock.mockResolvedValue(
        {
          id: 1,
          price: 100,
        } as unknown as Awaited<
          ReturnType<typeof prisma.availedService.findUnique>
        >,
      );

      availedServiceUpdateMock.mockResolvedValue(
        {
          id: 1,
          status: AvailedServiceStatus.PENDING,
        } as unknown as Awaited<ReturnType<typeof prisma.availedService.update>>,
      );

      const result = await unclaimServiceAction(1);

      expect(result.success).toBe(true);
      expect(prisma.availedService.update).toHaveBeenCalled();
    });
  });

  describe("employee payment actions", () => {
    it("should return empty array for getEmployeeTodayBookingsAction when role is not EMPLOYEE", async () => {
      requireAuthMock.mockResolvedValue({
        success: true,
        businessSlug: "test-business",
        session: {
          user: {
            id: "owner_1",
            role: "OWNER",
          },
        },
      } as Awaited<ReturnType<typeof requireAuth>>);

      const result = await getEmployeeTodayBookingsAction();

      expect(result).toEqual([]);
      expect(employeeFindFirstMock).not.toHaveBeenCalled();
      expect(bookingFindManyMock).not.toHaveBeenCalled();
    });

    it("should return today bookings for authorized employee", async () => {
      requireAuthMock.mockResolvedValue({
        success: true,
        businessSlug: "test-business",
        session: {
          user: {
            id: "employee_user_1",
            role: "EMPLOYEE",
          },
        },
      } as Awaited<ReturnType<typeof requireAuth>>);

      employeeFindFirstMock.mockResolvedValue({ id: 11 } as never);
      bookingFindManyMock.mockResolvedValue([
        {
          id: 1,
          status: BookingStatus.ACCEPTED,
          payment_status: PaymentStatus.UNPAID,
          availed_services: [
            {
              id: 10,
              service: {
                name: "Haircut",
                category: "hair",
              },
            },
          ],
        },
      ] as never);

      const result = await getEmployeeTodayBookingsAction();

      expect(result).toHaveLength(1);
      expect(employeeFindFirstMock).toHaveBeenCalled();
      expect(bookingFindManyMock).toHaveBeenCalled();
    });

    it("should block createEmployeeBookingBalanceQrAction for non-employee users", async () => {
      requireAuthMock.mockResolvedValue({
        success: true,
        businessSlug: "test-business",
        session: {
          user: {
            id: "owner_1",
            role: "OWNER",
          },
        },
      } as Awaited<ReturnType<typeof requireAuth>>);

      const result = await createEmployeeBookingBalanceQrAction(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(bookingFindFirstMock).not.toHaveBeenCalled();
    });

    it("should block markEmployeeBookingPaidAction for non-employee users", async () => {
      requireAuthMock.mockResolvedValue({
        success: true,
        businessSlug: "test-business",
        session: {
          user: {
            id: "owner_1",
            role: "OWNER",
          },
        },
      } as Awaited<ReturnType<typeof requireAuth>>);

      const result = await markEmployeeBookingPaidAction(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(bookingFindFirstMock).not.toHaveBeenCalled();
    });
  });
});
