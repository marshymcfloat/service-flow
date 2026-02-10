import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createPayMongoQrPaymentIntent } from "./paymongo";

describe("createPayMongoQrPaymentIntent", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.PAYMONGO_SECRET_KEY = "sk_test_123";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("creates a payment intent, method, and returns QR image", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            id: "pi_test_123",
            attributes: { client_key: "ck_test_123" },
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          data: { id: "pm_test_123" },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            attributes: {
              next_action: {
                code: { image_url: "data:image/png;base64,qr" },
              },
            },
          },
        }),
      });

    global.fetch = fetchMock as typeof fetch;

    const result = await createPayMongoQrPaymentIntent({
      amount: 30000,
      description: "Test booking",
      billing: { name: "Test User", email: "test@example.com" },
      metadata: { businessSlug: "demo" },
    });

    expect(result.paymentIntentId).toBe("pi_test_123");
    expect(result.paymentMethodId).toBe("pm_test_123");
    expect(result.qrImage).toContain("data:image/png");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("fails fast when PAYMONGO_SECRET_KEY is missing", async () => {
    delete process.env.PAYMONGO_SECRET_KEY;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    await expect(
      createPayMongoQrPaymentIntent({
        amount: 30000,
        description: "Test booking",
        billing: { name: "Test User", email: "test@example.com" },
      }),
    ).rejects.toThrow("PAYMONGO_SECRET_KEY is not configured");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
