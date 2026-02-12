import { describe, expect, it } from "vitest";

import { parseOutboxPayload } from "@/lib/services/outbox";

describe("parseOutboxPayload", () => {
  it("parses manual payment submitted payload", () => {
    const parsed = parseOutboxPayload("MANUAL_PAYMENT_SUBMITTED", {
      invoiceId: "inv_123",
      businessId: "biz_123",
      businessSlug: "demo-biz",
      submittedByUserId: "user_123",
      paymentReference: "GCASH-123",
      amountCentavos: 400000,
      note: "Paid via GCash",
      proofUrl: "https://example.com/proof.png",
      submittedAt: "2026-02-12T08:00:00.000Z",
    });

    expect(parsed).toEqual(
      expect.objectContaining({
        invoiceId: "inv_123",
        paymentReference: "GCASH-123",
        amountCentavos: 400000,
      }),
    );
  });

  it("throws when required fields are missing", () => {
    expect(() =>
      parseOutboxPayload("PAYMENT_CONFIRMED", {
        bookingId: 123,
        amount: 799,
      }),
    ).toThrow(/Missing required string field "email"/);
  });

  it("throws when payload is not an object", () => {
    expect(() =>
      parseOutboxPayload("REMINDER_DUE", "invalid-payload" as unknown),
    ).toThrow(/Payload must be an object/);
  });

  it("parses booking staffing conflict signal payload", () => {
    const parsed = parseOutboxPayload("BOOKING_STAFFING_CONFLICT_DETECTED", {
      bookingId: 991,
      scheduledAt: "2026-02-20T09:00:00.000Z",
      reason: "Future booking no longer matches available providers.",
      trigger: "BUSINESS_HOURS_UPDATED",
      detectedAt: "2026-02-12T08:00:00.000Z",
      customerName: "Alex",
    });

    expect(parsed).toEqual(
      expect.objectContaining({
        bookingId: 991,
        trigger: "BUSINESS_HOURS_UPDATED",
      }),
    );
  });
});
