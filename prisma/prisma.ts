import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

let modifiedConnectionString = connectionString;
if (connectionString) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  if (
    sslMode &&
    ["require", "prefer", "verify-ca"].includes(sslMode) &&
    !url.searchParams.has("uselibpqcompat")
  ) {
    url.searchParams.set("uselibpqcompat", "true");
    modifiedConnectionString = url.toString();
  }
}

const adapter = new PrismaPg({ connectionString: modifiedConnectionString });
export const prisma = new PrismaClient({ adapter });
