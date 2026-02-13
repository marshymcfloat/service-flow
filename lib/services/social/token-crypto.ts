import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const IV_LENGTH_BYTES = 12;
const ALGORITHM = "aes-256-gcm";

function resolveKey() {
  const raw = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY is not configured");
  }

  const trimmed = raw.trim();
  const encodings: BufferEncoding[] = ["base64", "hex", "utf8"];

  for (const encoding of encodings) {
    try {
      const key = Buffer.from(trimmed, encoding);
      if (key.length === 32) {
        return key;
      }
    } catch {
      // ignore and continue with other encodings
    }
  }

  throw new Error(
    "SOCIAL_TOKEN_ENCRYPTION_KEY must resolve to exactly 32 bytes (base64, hex, or utf8)",
  );
}

export function encryptToken(token: string) {
  if (!token) {
    throw new Error("Token cannot be empty");
  }

  const key = resolveKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptToken(payload: string) {
  if (!payload) {
    throw new Error("Encrypted token cannot be empty");
  }

  const [ivB64, tagB64, encryptedB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !encryptedB64) {
    throw new Error("Invalid encrypted token payload format");
  }

  const key = resolveKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
