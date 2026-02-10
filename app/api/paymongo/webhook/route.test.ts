import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateBookingInDb,
  mockGetPayMongoPaymentIntentById,
  mockPublishEvent,
  txMock,
  prismaMock,
} = vi.hoisted(() => ({
  mockCreateBookingInDb: vi.fn(),
  mockGetPayMongoPaymentIntentById: vi.fn(),
  mockPublishEvent: vi.fn(),
  txMock: {
    booking: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    voucher: {
      updateMany: vi.fn(),
    },
  },
  prismaMock: {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
    auditLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/booking", () => ({
  createBookingInDb: mockCreateBookingInDb,
}));

vi.mock("@/lib/server actions/paymongo", () => ({
  getPayMongoPaymentIntentById: mockGetPayMongoPaymentIntentById,
}));

vi.mock("@/lib/services/outbox", () => ({
  publishEvent: mockPublishEvent,
}));

vi.mock("@/prisma/prisma", () => ({
  prisma: prismaMock,
}));

import { POST } from "./route";

function signWebhook(body: string, timestamp: number) {
  const signature = crypto
    .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET || "")
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return `t=${timestamp},te=${signature}`;
}

describe("paymongo webhook security", () => {
  beforeEach(() => {
    process.env.PAYMONGO_WEBHOOK_SECRET = "test_webhook_secret";

    vi.clearAllMocks();

    prismaMock.$queryRaw.mockResolvedValue([{ locked: true }]);
    prismaMock.$transaction.mockImplementation(
      async (
        callback: (tx: typeof txMock) => Promise<unknown> | unknown,
      ) => callback(txMock),
    );
    prismaMock.auditLog.findFirst.mockResolvedValue(null);
    prismaMock.auditLog.create.mockResolvedValue({ id: "audit_1" });
    prismaMock.booking.findFirst.mockResolvedValue(null);

    txMock.booking.findFirst.mockResolvedValue(null);
    txMock.booking.update.mockResolvedValue(undefined);
    txMock.voucher.updateMany.mockResolvedValue({ count: 0 });
  });

  it("rejects stale signature timestamps", async () => {
    const body = JSON.stringify({
      data: {
        id: "evt_stale",
        attributes: {
          type: "payment.failed",
          data: {
            id: "pay_1",
            attributes: { payment_intent_id: "pi_1" },
          },
        },
      },
    });

    const staleTimestamp = Math.floor(Date.now() / 1000) - 3600;
    const req = new Request("http://localhost/api/paymongo/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "paymongo-signature": signWebhook(body, staleTimestamp),
      },
      body,
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("does not cancel already accepted bookings on payment.failed", async () => {
    txMock.booking.findFirst.mockResolvedValue({
      id: 42,
      business_id: "biz_1",
      status: "ACCEPTED",
    });

    const body = JSON.stringify({
      data: {
        id: "evt_failed",
        attributes: {
          type: "payment.failed",
          data: {
            id: "pay_1",
            attributes: { payment_intent_id: "pi_1" },
          },
        },
      },
    });

    const nowTimestamp = Math.floor(Date.now() / 1000);
    const req = new Request("http://localhost/api/paymongo/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "paymongo-signature": signWebhook(body, nowTimestamp),
      },
      body,
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(txMock.booking.update).not.toHaveBeenCalled();
    expect(txMock.voucher.updateMany).not.toHaveBeenCalled();
  });

  it("returns 500 and leaves event unprocessed when payment metadata cannot be resolved", async () => {
    const body = JSON.stringify({
      data: {
        id: "evt_paid_missing_metadata",
        attributes: {
          type: "payment.paid",
          data: {
            id: "pay_1",
            attributes: { payment_intent_id: "pi_missing_meta" },
          },
        },
      },
    });

    const nowTimestamp = Math.floor(Date.now() / 1000);
    const req = new Request("http://localhost/api/paymongo/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "paymongo-signature": signWebhook(body, nowTimestamp),
      },
      body,
    });

    const response = await POST(req);

    expect(response.status).toBe(500);
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("deduplicates already-processed events", async () => {
    const body = JSON.stringify({
      data: {
        id: "evt_duplicate",
        attributes: {
          type: "random.event",
          data: {},
        },
      },
    });

    const nowTimestamp = Math.floor(Date.now() / 1000);
    prismaMock.auditLog.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "already_processed" });

    const first = await POST(
      new Request("http://localhost/api/paymongo/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "paymongo-signature": signWebhook(body, nowTimestamp),
        },
        body,
      }),
    );
    const second = await POST(
      new Request("http://localhost/api/paymongo/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "paymongo-signature": signWebhook(body, nowTimestamp),
        },
        body,
      }),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
