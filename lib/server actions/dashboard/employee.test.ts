import { describe, it, expect, vi, beforeEach } from "vitest";
import { claimServiceAction, unclaimServiceAction } from "./employee";
import { prisma } from "@/prisma/prisma";
import { requireAuth } from "@/lib/auth/guards";
import {
  AvailedServiceStatus,
  ServiceProviderType,
} from "@/prisma/generated/prisma/client";

// Mock dependencies
vi.mock("@/prisma/prisma", () => ({
  prisma: {
    availedService: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
      (requireAuth as any).mockResolvedValue({
        success: true,
        businessSlug: "test-business",
      });

      (prisma.availedService.findUnique as any).mockResolvedValue({
        id: 1,
        price: 100,
        service_id: 1,
        package_id: null,
      });

      (prisma.availedService.update as any).mockResolvedValue({
        id: 1,
        status: AvailedServiceStatus.CLAIMED,
      });

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
      (requireAuth as any).mockResolvedValue({
        success: true,
        businessSlug: "test-business",
      });

      (prisma.availedService.findUnique as any).mockResolvedValue({
        id: 1,
        price: 100,
      });

      (prisma.availedService.update as any).mockResolvedValue({
        id: 1,
        status: AvailedServiceStatus.PENDING,
      });

      const result = await unclaimServiceAction(1);

      expect(result.success).toBe(true);
      expect(prisma.availedService.update).toHaveBeenCalled();
    });
  });
});
