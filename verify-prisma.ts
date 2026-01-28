import { prisma } from "./prisma/prisma";

async function main() {
  console.log("Checking Prisma Client...");
  try {
    const result = await prisma.availedService.findFirst({
      select: {
        id: true,
        status: true,
      },
    });
    console.log("Prisma Client validation passed. Result:", result);
  } catch (error) {
    console.error("Prisma Client validation failed:", error);
    process.exit(1);
  }
}

main();
