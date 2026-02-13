import { createHmac, randomBytes, timingSafeEqual } from "crypto";

type OAuthStatePayload = {
  businessSlug: string;
  userId: string;
  nonce: string;
  issuedAt: number;
};

const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000;

function encodeBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decodeBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getStateSecret() {
  const secret = process.env.SOCIAL_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("SOCIAL_OAUTH_STATE_SECRET is not configured");
  }
  return secret;
}

function signPayload(payloadBase64: string) {
  return createHmac("sha256", getStateSecret())
    .update(payloadBase64)
    .digest("base64url");
}

export function createSignedOAuthState(input: {
  businessSlug: string;
  userId: string;
}) {
  const payload: OAuthStatePayload = {
    businessSlug: input.businessSlug,
    userId: input.userId,
    nonce: randomBytes(16).toString("hex"),
    issuedAt: Date.now(),
  };

  const payloadBase64 = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function verifySignedOAuthState(
  state: string,
  options?: { ttlMs?: number },
) {
  const ttlMs = options?.ttlMs ?? DEFAULT_STATE_TTL_MS;
  const [payloadBase64, signature] = state.split(".");
  if (!payloadBase64 || !signature) {
    throw new Error("Invalid OAuth state");
  }

  const expectedSignature = signPayload(payloadBase64);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("OAuth state signature mismatch");
  }

  const parsed = JSON.parse(decodeBase64Url(payloadBase64)) as OAuthStatePayload;
  if (!parsed.businessSlug || !parsed.userId || !parsed.issuedAt) {
    throw new Error("OAuth state payload is incomplete");
  }

  if (Date.now() - parsed.issuedAt > ttlMs) {
    throw new Error("OAuth state has expired");
  }

  return parsed;
}
