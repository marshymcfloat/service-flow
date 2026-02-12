import "dotenv/config";
// Use pg pool for connection pooling, recommended with @prisma/adapter-pg
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "./generated/prisma/client";

function getSafeConnectionString(databaseUrl: string) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    return databaseUrl;
  }

  // Keep the current strong TLS semantics ahead of pg/pg-connection-string
  // changes where `sslmode=require` will become weaker.
  const sslMode = parsedUrl.searchParams.get("sslmode")?.toLowerCase();
  const useLibpqCompat =
    parsedUrl.searchParams.get("uselibpqcompat")?.toLowerCase() === "true";

  if (
    !useLibpqCompat &&
    (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca")
  ) {
    parsedUrl.searchParams.set("sslmode", "verify-full");
    return parsedUrl.toString();
  }

  return databaseUrl;
}

type PrismaConnectionConfig =
  | { mode: "adapter"; connectionString: string }
  | { mode: "accelerate"; accelerateUrl: string };

function resolveConnectionConfig(): PrismaConnectionConfig {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const usesAccelerateProtocol = databaseUrl.startsWith("prisma+postgres://");
  if (!usesAccelerateProtocol) {
    return { mode: "adapter", connectionString: getSafeConnectionString(databaseUrl) };
  }

  const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;
  if (directDatabaseUrl) {
    return {
      mode: "adapter",
      connectionString: getSafeConnectionString(directDatabaseUrl),
    };
  }

  return { mode: "accelerate", accelerateUrl: databaseUrl };
}

const RETRYABLE_READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

function isRetryableConnectionError(error: unknown) {
  const hasCauseCode = (err: unknown, expectedCode: string): boolean => {
    if (!err || typeof err !== "object") return false;
    const code = (err as { code?: string }).code;
    if (code === expectedCode) return true;
    return hasCauseCode((err as { cause?: unknown }).cause, expectedCode);
  };

  const hasCauseMessage = (err: unknown, matcher: (message: string) => boolean): boolean => {
    if (!(err instanceof Error)) return false;
    if (matcher(err.message.toLowerCase())) return true;
    return hasCauseMessage((err as Error & { cause?: unknown }).cause, matcher);
  };

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P1017"
  ) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    hasCauseCode(error, "ECONNRESET") ||
    hasCauseMessage(error, (causeMessage) => causeMessage.includes("econnreset")) ||
    message.includes("server has closed the connection") ||
    message.includes("connection terminated unexpectedly")
  );
}

export function isPrismaAccelerateResourceLimitError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P6000"
  ) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("worker exceeded resource limits") ||
    message.includes("cloudflare") ||
    message.includes("error 1102") ||
    message.includes("accelerate.prisma-data.net")
  );
}

function createPrismaClient() {
  const connectionConfig = resolveConnectionConfig();
  const client =
    connectionConfig.mode === "accelerate"
      ? new PrismaClient({ accelerateUrl: connectionConfig.accelerateUrl })
      : new PrismaClient({
          adapter: new PrismaPg(
            new Pool({
              connectionString: connectionConfig.connectionString,
              keepAlive: true,
              keepAliveInitialDelayMillis: 10_000,
            }),
          ),
        });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          try {
            return await query(args);
          } catch (error) {
            if (
              RETRYABLE_READ_OPERATIONS.has(operation) &&
              (isRetryableConnectionError(error) ||
                isPrismaAccelerateResourceLimitError(error))
            ) {
              return query(args);
            }

            throw error;
          }
        },
      },
    },
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use a singleton pattern for the adapter/pool to avoid connection exhaustion in dev
// Note: We're keeping it simple for now, relying on globalForPrisma.prisma reuse
// which reuses the client (and thus the adapter/pool).

// Create a new client instance only if one doesn't exist
export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function supportsOnboardingApplicationModel() {
  const delegate = (prisma as unknown as { onboardingApplication?: { count?: unknown } })
    .onboardingApplication;
  return typeof delegate?.count === "function";
}
