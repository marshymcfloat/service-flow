import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthMock = vi.hoisted(() => vi.fn());
const getBillingCollectionModeMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const publishEventMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  subscriptionInvoice: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/features/billing/subscription-service", () => ({
  createCheckoutForInvoice: vi.fn(),
  createInvoiceForSubscription: vi.fn(),
  getBillingCollectionMode: getBillingCollectionModeMock,
}));

vi.mock("@/prisma/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/outbox", () => ({
  publishEvent: publishEventMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { submitManualPaymentReferenceAction } from "./subscription-owner";

describe("submitManualPaymentReferenceAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAuthMock.mockResolvedValue({
      success: true,
      businessSlug: "demo-biz",
      session: {
        user: {
          id: "owner_user_1",
        },
      },
    });
    getBillingCollectionModeMock.mockReturnValue("MANUAL_ONLY");
  });

  it("stores manual payment metadata and emits outbox event", async () => {
    prismaMock.subscriptionInvoice.findUnique.mockResolvedValue({
      id: "inv_1",
      status: "OPEN",
      business_id: "biz_1",
      business: { slug: "demo-biz" },
      metadata: { existing: "value" },
    });

    const updateMock = vi.fn().mockResolvedValue({
      id: "inv_1",
      metadata: {
        existing: "value",
        manual_payment_reference: "GCASH-REF-123",
      },
    });

    prismaMock.$transaction.mockImplementation(
      async (
        callback: (tx: {
          subscriptionInvoice: {
            update: typeof updateMock;
          };
        }) => Promise<unknown>,
      ) =>
        callback({
          subscriptionInvoice: {
            update: updateMock,
          },
        }),
    );

    publishEventMock.mockResolvedValue(undefined);

    const result = await submitManualPaymentReferenceAction({
      invoiceId: "inv_1",
      paymentReference: "GCASH-REF-123",
      amountCentavos: 400000,
      note: "Paid in full",
      proofUrl: "https://example.com/proof.png",
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
      }),
    );

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv_1" },
        data: {
          metadata: expect.objectContaining({
            existing: "value",
            manual_payment_reference: "GCASH-REF-123",
            manual_payment_amount_centavos: 400000,
            manual_payment_note: "Paid in full",
            manual_payment_proof_url: "https://example.com/proof.png",
          }),
        },
      }),
    );

    expect(publishEventMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        type: "MANUAL_PAYMENT_SUBMITTED",
        aggregateId: "inv_1",
        businessId: "biz_1",
        payload: expect.objectContaining({
          paymentReference: "GCASH-REF-123",
          submittedByUserId: "owner_user_1",
        }),
      }),
    );

    expect(revalidatePathMock).toHaveBeenCalledWith("/app/demo-biz/billing");
    expect(revalidatePathMock).toHaveBeenCalledWith("/platform/invoices");
  });

  it("returns validation error when payment reference is missing", async () => {
    const result = await submitManualPaymentReferenceAction({
      invoiceId: "inv_1",
      paymentReference: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("too small");
    }
  });

  it("returns forbidden when invoice does not belong to current business", async () => {
    prismaMock.subscriptionInvoice.findUnique.mockResolvedValue({
      id: "inv_1",
      status: "OPEN",
      business_id: "biz_1",
      business: { slug: "different-biz" },
      metadata: null,
    });

    const result = await submitManualPaymentReferenceAction({
      invoiceId: "inv_1",
      paymentReference: "GCASH-REF-321",
    });

    expect(result).toEqual({
      success: false,
      error: "Forbidden",
    });
  });

  it("prevents duplicate manual payment submissions for the same invoice", async () => {
    prismaMock.subscriptionInvoice.findUnique.mockResolvedValue({
      id: "inv_2",
      status: "OPEN",
      business_id: "biz_1",
      business: { slug: "demo-biz" },
      metadata: {
        manual_payment_reference: "GCASH-REF-OLD",
        manual_payment_submitted_at: "2026-02-12T09:30:00.000Z",
      },
    });

    const result = await submitManualPaymentReferenceAction({
      invoiceId: "inv_2",
      paymentReference: "GCASH-REF-NEW",
    });

    expect(result).toEqual({
      success: false,
      error:
        "Manual payment already submitted for this invoice. Wait for verification before sending another reference.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(publishEventMock).not.toHaveBeenCalled();
  });
});
