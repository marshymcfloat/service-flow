import "dotenv/config";
// Use pg pool for connection pooling, recommended with @prisma/adapter-pg
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use a singleton pattern for the adapter/pool to avoid connection exhaustion in dev
// Note: We're keeping it simple for now, relying on globalForPrisma.prisma reuse
// which reuses the client (and thus the adapter/pool).

// Create a new client instance only if one doesn't exist
export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
