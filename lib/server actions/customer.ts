"use server";

import { prisma } from "@/prisma/prisma";

export async function searchCustomer(name: string) {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        name: {
          startsWith: name,
          mode: "insensitive",
        },
      },
      take: 5,
    });

    return { success: true, data: customers };
  } catch (err) {
    return { success: false, error: err };
  }
}
