import { describe, expect, it } from "vitest";
import { extractPaymentIntentReferences } from "./webhook-utils";

describe("extractPaymentIntentReferences", () => {
  it("extracts payment intent and payment IDs from nested event shape", () => {
    const result = extractPaymentIntentReferences({
      data: {
        attributes: {
          data: {
            id: "pay_123",
            attributes: {
              payment_intent_id: "pi_123",
              payment_method_id: "pm_123",
            },
          },
        },
      },
    });

    expect(result.paymentIntentId).toBe("pi_123");
    expect(result.paymentId).toBe("pay_123");
    expect(result.paymentMethodId).toBe("pm_123");
  });

  it("handles flattened shapes", () => {
    const result = extractPaymentIntentReferences({
      data: {
        id: "pay_456",
        attributes: {
          payment_intent: { id: "pi_456" },
          payment_method: { id: "pm_456" },
        },
      },
    });

    expect(result.paymentIntentId).toBe("pi_456");
    expect(result.paymentId).toBe("pay_456");
    expect(result.paymentMethodId).toBe("pm_456");
  });
});
