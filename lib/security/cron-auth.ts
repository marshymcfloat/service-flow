import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

type CronAuthOptions = {
  allowBearer?: boolean;
  allowBasic?: boolean;
};

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isBearerAuthorized(authHeader: string) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return false;
  }

  return safeEqual(token, cronSecret);
}

function isBasicAuthorized(authHeader: string) {
  const [scheme, encoded] = authHeader.split(" ");
  if (scheme !== "Basic" || !encoded) {
    return false;
  }

  const validUser = process.env.CRON_USER || "admin";
  const validPass = process.env.CRON_PASSWORD;
  if (!validPass) {
    return false;
  }

  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64").toString();
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) {
    return false;
  }

  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);

  return safeEqual(user, validUser) && safeEqual(pass, validPass);
}

export function unauthorizedCronResponse() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": "Basic realm='Secure Area'" },
  });
}

export function isCronAuthorized(
  request: Request,
  options: CronAuthOptions = {},
) {
  const { allowBasic = true, allowBearer = true } = options;
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return false;
  }

  if (allowBearer && isBearerAuthorized(authHeader)) {
    return true;
  }

  if (allowBasic && isBasicAuthorized(authHeader)) {
    return true;
  }

  return false;
}
