import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    // Reset internal state if possible, or use a fresh IP for each test
    vi.useFakeTimers();
  });

  it("should allow requests under the limit", () => {
    const ip = "127.0.0.1";
    const config = { windowMs: 1000, maxRequests: 2 };

    // First request
    const result1 = rateLimit(ip, config);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(1);

    // Second request
    const result2 = rateLimit(ip, config);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(0);
  });

  it("should block requests over the limit", () => {
    const ip = "127.0.0.2";
    const config = { windowMs: 1000, maxRequests: 1 };

    rateLimit(ip, config); // 1st OK

    const result = rateLimit(ip, config); // 2nd Blocked
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should reset after windowMs", () => {
    const ip = "127.0.0.3";
    const config = { windowMs: 1000, maxRequests: 1 };

    rateLimit(ip, config);
    expect(rateLimit(ip, config).success).toBe(false);

    // Fast forward time
    vi.advanceTimersByTime(1001);

    expect(rateLimit(ip, config).success).toBe(true);
  });
});
