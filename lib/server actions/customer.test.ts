import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  customer: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/auth/guards", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/prisma/prisma", () => ({
  prisma: prismaMock,
}));

import { searchCustomer } from "./customer";

describe("customer server actions tenant boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes customer search to authenticated tenant slug, not caller input", async () => {
    requireAuthMock.mockResolvedValue({
      success: true,
      businessSlug: "tenant-a",
    });
    prismaMock.customer.findMany.mockResolvedValue([]);

    await searchCustomer("Jane", "tenant-b");

    expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          business: {
            slug: "tenant-a",
          },
        }),
      }),
    );
  });

  it("returns unauthorized when auth guard fails", async () => {
    requireAuthMock.mockResolvedValue({ success: false, error: "Unauthorized" });

    const result = await searchCustomer("Jane", "tenant-a");

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(prismaMock.customer.findMany).not.toHaveBeenCalled();
  });
});
