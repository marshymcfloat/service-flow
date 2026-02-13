import { beforeEach, describe, expect, it, vi } from "vitest";

const deliverOutboxEventMock = vi.hoisted(() => vi.fn());
const isNonRetryableOutboxErrorMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
const prismaMock = vi.hoisted(() => ({
  outboxMessage: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/services/outbox-delivery", () => ({
  deliverOutboxEvent: deliverOutboxEventMock,
  isNonRetryableOutboxError: isNonRetryableOutboxErrorMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

vi.mock("@/prisma/prisma", () => ({
  prisma: prismaMock,
}));

import { processOutboxBatch } from "./route";

describe("processOutboxBatch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isNonRetryableOutboxErrorMock.mockReturnValue(false);
    prismaMock.outboxMessage.updateMany.mockResolvedValue({ count: 1 });
  });

  it("marks valid events as processed on successful delivery", async () => {
    prismaMock.outboxMessage.findMany.mockResolvedValue([
      {
        id: "msg_1",
        event_type: "BOOKING_CANCELLED",
        payload: {
          bookingId: 101,
          reason: "HOLD_EXPIRED",
          status: "CANCELLED",
          email: "customer@example.com",
        },
        business_id: "biz_1",
        attempts: 0,
        created_at: new Date("2026-02-12T08:00:00.000Z"),
      },
    ]);
    prismaMock.outboxMessage.update.mockResolvedValue({});
    deliverOutboxEventMock.mockResolvedValue(undefined);

    const result = await processOutboxBatch({ batchSize: 10, maxAttempts: 3 });

    expect(deliverOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "BOOKING_CANCELLED",
        businessId: "biz_1",
      }),
    );
    expect(prismaMock.outboxMessage.update).toHaveBeenCalledWith({
      where: { id: "msg_1" },
      data: {
        processed: true,
        processed_at: expect.any(Date),
        last_error: null,
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        processed: 1,
        succeeded: 1,
        failed: 0,
      }),
    );
    expect(result.byEventType.BOOKING_CANCELLED).toEqual(
      expect.objectContaining({
        processed: 1,
        succeeded: 1,
        failed: 0,
      }),
    );
  });

  it("increments attempts and stores last_error when delivery fails", async () => {
    prismaMock.outboxMessage.findMany.mockResolvedValue([
      {
        id: "msg_2",
        event_type: "PAYMENT_CONFIRMED",
        payload: {
          bookingId: 202,
          email: "owner@example.com",
          amount: 799,
        },
        business_id: "biz_2",
        attempts: 2,
        created_at: new Date("2026-02-12T08:00:00.000Z"),
      },
    ]);
    prismaMock.outboxMessage.update.mockResolvedValue({});
    deliverOutboxEventMock.mockRejectedValue(new Error("SMTP down"));

    const result = await processOutboxBatch({ batchSize: 10, maxAttempts: 3 });

    expect(prismaMock.outboxMessage.update).toHaveBeenCalledWith({
      where: { id: "msg_2" },
      data: {
        last_error: "SMTP down",
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        processed: 1,
        succeeded: 0,
        failed: 1,
        terminalFailures: 1,
      }),
    );
    expect(result.byEventType.PAYMENT_CONFIRMED).toEqual(
      expect.objectContaining({
        processed: 1,
        failed: 1,
        terminalFailures: 1,
      }),
    );
    expect(loggerMock.error).toHaveBeenCalled();
  });

  it("marks non-retryable failures as skipped and processed", async () => {
    const missingRecipientError = new Error(
      "[Outbox:BOOKING_CANCELLED] Recipient email is missing for booking 333",
    );
    isNonRetryableOutboxErrorMock.mockImplementation(
      (error: unknown) => error === missingRecipientError,
    );

    prismaMock.outboxMessage.findMany.mockResolvedValue([
      {
        id: "msg_3",
        event_type: "BOOKING_CANCELLED",
        payload: {
          bookingId: 333,
          reason: "MANUAL_CANCEL",
          status: "CANCELLED",
        },
        business_id: "biz_3",
        attempts: 0,
        created_at: new Date("2026-02-12T08:00:00.000Z"),
      },
    ]);
    prismaMock.outboxMessage.update.mockResolvedValue({});
    deliverOutboxEventMock.mockRejectedValue(missingRecipientError);

    const result = await processOutboxBatch({ batchSize: 10, maxAttempts: 3 });

    expect(prismaMock.outboxMessage.update).toHaveBeenCalledWith({
      where: { id: "msg_3" },
      data: {
        processed: true,
        processed_at: expect.any(Date),
        last_error:
          "[SKIPPED_NON_RETRYABLE] [Outbox:BOOKING_CANCELLED] Recipient email is missing for booking 333",
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        processed: 1,
        succeeded: 0,
        failed: 1,
        terminalFailures: 1,
        skippedNonRetryable: 1,
      }),
    );
    expect(result.byEventType.BOOKING_CANCELLED).toEqual(
      expect.objectContaining({
        processed: 1,
        failed: 1,
        terminalFailures: 1,
        skippedNonRetryable: 1,
      }),
    );
  });

  it("skips candidates that were claimed by another worker", async () => {
    prismaMock.outboxMessage.findMany.mockResolvedValue([
      {
        id: "msg_4",
        event_type: "BOOKING_CANCELLED",
        payload: {
          bookingId: 404,
          reason: "HOLD_EXPIRED",
          status: "CANCELLED",
          email: "claimed@example.com",
        },
        business_id: "biz_4",
        attempts: 0,
        created_at: new Date("2026-02-12T08:00:00.000Z"),
      },
    ]);
    prismaMock.outboxMessage.updateMany.mockResolvedValueOnce({ count: 0 });

    const result = await processOutboxBatch({ batchSize: 10, maxAttempts: 3 });

    expect(deliverOutboxEventMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        processed: 0,
        succeeded: 0,
        failed: 0,
      }),
    );
  });
});
