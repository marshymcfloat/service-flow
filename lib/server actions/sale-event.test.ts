import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwnerTenantWriteAccessMock = vi.hoisted(() => vi.fn());
const requireTenantAccessMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  business: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireOwnerTenantWriteAccess: requireOwnerTenantWriteAccessMock,
  requireTenantAccess: requireTenantAccessMock,
}));

vi.mock("@/prisma/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/features/social-publishing", () => ({
  isSocialPublishingEnabledForBusiness: vi.fn(() => false),
}));

vi.mock("@/lib/services/social/caption-generator", () => ({
  generateSocialCaptionDraft: vi.fn(),
}));

vi.mock("@/lib/services/social/promo-image", () => ({
  generateAndUploadPromoImage: vi.fn(),
}));

import { createSaleEvent } from "./sale-event";

describe("sale event server actions tenant boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireTenantAccessMock.mockResolvedValue({
      success: true,
      businessSlug: "tenant-a",
    });
    requireOwnerTenantWriteAccessMock.mockResolvedValue({
      success: true,
      session: {
        user: {
          id: "owner_1",
        },
      },
      businessSlug: "tenant-a",
    });
  });

  it("rejects create requests when owner write access is denied", async () => {
    requireOwnerTenantWriteAccessMock.mockResolvedValue({
      success: false,
      error: "Forbidden",
    });

    const result = await createSaleEvent({
      businessSlug: "tenant-a",
      title: "Summer Sale",
      startDate: new Date("2026-02-13T00:00:00.000Z"),
      endDate: new Date("2026-02-20T00:00:00.000Z"),
      discountType: "PERCENTAGE",
      discountValue: 10,
      serviceIds: [1],
      packageIds: [],
    });

    expect(result).toEqual({ success: false, error: "Forbidden" });
  });

  it("rejects cross-tenant service IDs", async () => {
    prismaMock.business.findUnique.mockResolvedValue({
      id: "biz_a",
      name: "Tenant A",
      description: null,
      services: [],
      packages: [],
    });

    const result = await createSaleEvent({
      businessSlug: "tenant-a",
      title: "Summer Sale",
      startDate: new Date("2026-02-13T00:00:00.000Z"),
      endDate: new Date("2026-02-20T00:00:00.000Z"),
      discountType: "PERCENTAGE",
      discountValue: 10,
      serviceIds: [1],
      packageIds: [],
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: "One or more selected services are invalid for this business.",
      }),
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
