import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, publishEventMock } = vi.hoisted(() => ({
  prismaMock: {
    booking: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  txMock: {
    booking: {
      updateMany: vi.fn(),
    },
    voucher: {
      updateMany: vi.fn(),
    },
  },
  publishEventMock: vi.fn(),
}));

vi.mock("@/prisma/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/outbox", () => ({
  publishEvent: publishEventMock,
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<object>("next/server");
  return {
    ...actual,
    connection: vi.fn(async () => undefined),
  };
});

import { GET } from "./route";

function authHeader(user: string, password: string) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

describe("expire-holds route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_USER = "cron-user";
    process.env.CRON_PASSWORD = "cron-pass";

    prismaMock.booking.findMany.mockResolvedValue([
      { id: 1, business_id: "biz_1" },
    ]);
    txMock.booking.updateMany.mockResolvedValue({ count: 1 });
    txMock.voucher.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<void> | void) =>
        callback(txMock),
    );
  });

  it("releases reserved vouchers when expiring hold bookings", async () => {
    const req = new Request("http://localhost/api/cron/expire-holds", {
      method: "GET",
      headers: {
        authorization: authHeader("cron-user", "cron-pass"),
      },
    });

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(txMock.voucher.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { used_by_id: 1 },
        data: { used_by_id: null, is_active: true },
      }),
    );
    expect(publishEventMock).toHaveBeenCalledTimes(1);
  });
});
