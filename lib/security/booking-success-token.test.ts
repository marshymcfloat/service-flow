import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBookingSuccessToken,
  verifyBookingSuccessToken,
} from "./booking-success-token";

describe("booking success token", () => {
  beforeEach(() => {
    process.env.BOOKING_SUCCESS_TOKEN_SECRET = "booking-success-secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-10T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies valid token for matching booking and slug", () => {
    const token = createBookingSuccessToken({
      bookingId: 123,
      businessSlug: "beautyfeel",
      ttlSeconds: 60,
    });

    const valid = verifyBookingSuccessToken({
      token,
      bookingId: 123,
      businessSlug: "beautyfeel",
    });

    expect(valid).toBe(true);
  });

  it("rejects token with mismatched booking", () => {
    const token = createBookingSuccessToken({
      bookingId: 123,
      businessSlug: "beautyfeel",
      ttlSeconds: 60,
    });

    const valid = verifyBookingSuccessToken({
      token,
      bookingId: 999,
      businessSlug: "beautyfeel",
    });

    expect(valid).toBe(false);
  });

  it("rejects token when purpose does not match", () => {
    const token = createBookingSuccessToken({
      bookingId: 123,
      businessSlug: "beautyfeel",
      purpose: "details",
      ttlSeconds: 60,
    });

    const valid = verifyBookingSuccessToken({
      token,
      bookingId: 123,
      businessSlug: "beautyfeel",
      purpose: "success",
    });

    expect(valid).toBe(false);
  });

  it("rejects expired token", () => {
    const token = createBookingSuccessToken({
      bookingId: 123,
      businessSlug: "beautyfeel",
      ttlSeconds: 1,
    });

    vi.setSystemTime(new Date("2026-02-10T00:01:00.000Z"));

    const valid = verifyBookingSuccessToken({
      token,
      bookingId: 123,
      businessSlug: "beautyfeel",
    });

    expect(valid).toBe(false);
  });
});
