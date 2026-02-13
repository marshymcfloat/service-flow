import { afterEach, describe, expect, it } from "vitest";

import { decryptToken, encryptToken } from "@/lib/services/social/token-crypto";

const ORIGINAL_KEY = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;

describe("social token crypto", () => {
  afterEach(() => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = ORIGINAL_KEY;
  });

  it("round-trips encrypted tokens", () => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY =
      "12345678901234567890123456789012";

    const encrypted = encryptToken("token-abc-123");
    const decrypted = decryptToken(encrypted);

    expect(encrypted).not.toBe("token-abc-123");
    expect(decrypted).toBe("token-abc-123");
  });

  it("throws when encryption key is missing", () => {
    delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("hello")).toThrow(
      /SOCIAL_TOKEN_ENCRYPTION_KEY is not configured/,
    );
  });
});
