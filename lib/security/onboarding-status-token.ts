import crypto from "crypto";

const ONBOARDING_STATUS_TOKEN_TTL_SECONDS = 60 * 24 * 60 * 60;

export type OnboardingStatusPayload = {
  applicationId: string;
  ownerEmail: string;
  exp: number;
};

function getTokenSecret() {
  const secret =
    process.env.ONBOARDING_STATUS_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "ONBOARDING_STATUS_TOKEN_SECRET (or NEXTAUTH_SECRET) must be configured.",
    );
  }

  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadBase64: string) {
  return crypto
    .createHmac("sha256", getTokenSecret())
    .update(payloadBase64)
    .digest("base64url");
}

export function createOnboardingStatusToken(params: {
  applicationId: string;
  ownerEmail: string;
  ttlSeconds?: number;
}) {
  const ttlSeconds = params.ttlSeconds ?? ONBOARDING_STATUS_TOKEN_TTL_SECONDS;
  const payload: OnboardingStatusPayload = {
    applicationId: params.applicationId,
    ownerEmail: params.ownerEmail.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function verifyOnboardingStatusToken(token: string) {
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadBase64);

  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf8"),
        Buffer.from(signature, "utf8"),
      )
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(payloadBase64),
    ) as OnboardingStatusPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!payload.applicationId || !payload.ownerEmail) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
