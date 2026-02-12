import { beforeEach, describe, expect, it, vi } from "vitest";

const resendSendMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));
const prismaMock = vi.hoisted(() => ({
  business: {
    findMany: vi.fn(),
  },
  customer: {
    findMany: vi.fn(),
  },
  outboxMessage: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: resendSendMock,
    },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

vi.mock("@/prisma/prisma", () => ({
  prisma: prismaMock,
}));

import { sendReEngagementEmails } from "./re-engagement";

describe("sendReEngagementEmails", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resendSendMock.mockResolvedValue({ error: null });
  });

  it("skips duplicates when a re-engagement email was already sent after the latest completed booking", async () => {
    prismaMock.business.findMany.mockResolvedValue([
      {
        id: "biz_1",
        name: "Beauty Spot",
        slug: "beauty-spot",
      },
    ]);

    prismaMock.customer.findMany.mockResolvedValue([
      {
        id: "cust_1",
        name: "Ana",
        email: "ana@example.com",
        bookings: [
          {
            id: 101,
            created_at: new Date("2025-10-01T00:00:00.000Z"),
          },
        ],
      },
    ]);

    prismaMock.outboxMessage.findMany.mockResolvedValue([
      {
        aggregate_id: "cust_1",
        created_at: new Date("2025-12-01T00:00:00.000Z"),
      },
    ]);

    const result = await sendReEngagementEmails();

    expect(resendSendMock).not.toHaveBeenCalled();
    expect(prismaMock.outboxMessage.create).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        sent: 0,
        failed: 0,
        duplicateSkips: 1,
      }),
    );
  });
});

