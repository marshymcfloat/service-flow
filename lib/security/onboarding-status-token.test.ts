import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOnboardingStatusToken,
  verifyOnboardingStatusToken,
} from "./onboarding-status-token";

describe("onboarding status token", () => {
  beforeEach(() => {
    process.env.ONBOARDING_STATUS_TOKEN_SECRET = "onboarding-status-secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-12T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies valid token", () => {
    const token = createOnboardingStatusToken({
      applicationId: "app_123",
      ownerEmail: "owner@example.com",
      ttlSeconds: 60,
    });

    const payload = verifyOnboardingStatusToken(token);
    expect(payload).toEqual(
      expect.objectContaining({
        applicationId: "app_123",
        ownerEmail: "owner@example.com",
      }),
    );
  });

  it("rejects tampered token", () => {
    const token = createOnboardingStatusToken({
      applicationId: "app_123",
      ownerEmail: "owner@example.com",
    });

    const parts = token.split(".");
    const tampered = `${parts[0]}.invalid_signature`;
    expect(verifyOnboardingStatusToken(tampered)).toBeNull();
  });

  it("rejects expired token", () => {
    const token = createOnboardingStatusToken({
      applicationId: "app_123",
      ownerEmail: "owner@example.com",
      ttlSeconds: 1,
    });

    vi.setSystemTime(new Date("2026-02-12T00:01:00.000Z"));
    expect(verifyOnboardingStatusToken(token)).toBeNull();
  });
});
