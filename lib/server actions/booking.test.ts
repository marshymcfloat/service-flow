import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createBooking } from "./booking";

// Mock dependencies
vi.mock("@/prisma/prisma", () => ({
  prisma: {
    business: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/booking", () => ({
  createBookingInDb: vi.fn(),
}));

vi.mock("./paymongo", () => ({
  createPayMongoQrPaymentIntent: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/utils/pricing", () => ({
  calculateBookingTotal: vi.fn(
    ({ subtotal, voucherDiscount }) => subtotal - voucherDiscount,
  ),
}));

// Mock dynamic imports if possible, or just the modules they resolve to
vi.mock("./vouchers", () => ({
  verifyVoucherAction: vi.fn(),
}));

import { prisma } from "@/prisma/prisma";
import { createBookingInDb } from "@/lib/services/booking";
import { PaymentMethod, PaymentType } from "@/lib/zod schemas/bookings";

describe("createBooking Server Action", () => {
  const mockDate = new Date("2024-01-01T10:00:00Z");

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should create a CASH booking successfully", async () => {
    // Setup Mocks
    const mockBusiness = {
      slug: "demo-business",
      name: "Demo Business",
      commission_calculation_basis: "ORIGINAL_PRICE",
      sale_events: [],
    };

    (prisma.business.findUnique as any).mockResolvedValue(mockBusiness);

    (createBookingInDb as any).mockResolvedValue({
      id: 123,
    });

    const services = [
      {
        id: 1,
        name: "Haircut",
        price: 500,
        quantity: 1,
        originalPrice: 500,
      },
    ];

    // Execute
    const result = await createBooking({
      customerName: "John Doe",
      businessSlug: "demo-business",
      scheduledAt: mockDate,
      paymentMethod: "CASH",
      paymentType: "FULL",
      services: services,
      email: "john@example.com",
    });

    // Verify
    expect(prisma.business.findUnique).toHaveBeenCalledWith({
      where: { slug: "demo-business" },
      include: expect.any(Object),
    });

    expect(createBookingInDb).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: "CASH",
        email: "john@example.com",
      }),
    );

    expect(result).toEqual({
      type: "internal",
      url: "/app/demo-business/bookings/123?created=true",
    });
  });

  it("should throw error if business not found", async () => {
    (prisma.business.findUnique as any).mockResolvedValue(null);

    await expect(
      createBooking({
        customerName: "John",
        businessSlug: "invalid-slug",
        scheduledAt: mockDate,
        paymentMethod: "CASH",
        paymentType: "FULL",
        services: [],
      }),
    ).rejects.toThrow("Business not found");
  });
});
