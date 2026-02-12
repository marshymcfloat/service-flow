import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    // Reset internal state if possible, or use a fresh IP for each test
    vi.useFakeTimers();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("should allow requests under the limit", async () => {
    const ip = "127.0.0.1";
    const config = { windowMs: 1000, maxRequests: 2 };

    // First request
    const result1 = await rateLimit(ip, config);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(1);

    // Second request
    const result2 = await rateLimit(ip, config);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(0);
  });

  it("should block requests over the limit", async () => {
    const ip = "127.0.0.2";
    const config = { windowMs: 1000, maxRequests: 1 };

    await rateLimit(ip, config); // 1st OK

    const result = await rateLimit(ip, config); // 2nd Blocked
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should reset after windowMs", async () => {
    const ip = "127.0.0.3";
    const config = { windowMs: 1000, maxRequests: 1 };

    await rateLimit(ip, config);
    expect((await rateLimit(ip, config)).success).toBe(false);

    // Fast forward time
    vi.advanceTimersByTime(1001);

    expect((await rateLimit(ip, config)).success).toBe(true);
  });
});
