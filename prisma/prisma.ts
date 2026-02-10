import "dotenv/config";
// Use pg pool for connection pooling, recommended with @prisma/adapter-pg
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "./generated/prisma/client";

function getSafeConnectionString() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

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

const connectionString = getSafeConnectionString();

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
    message.includes("server has closed the connection") ||
    message.includes("connection terminated unexpectedly")
  );
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          try {
            return await query(args);
          } catch (error) {
            if (
              RETRYABLE_READ_OPERATIONS.has(operation) &&
              isRetryableConnectionError(error)
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
