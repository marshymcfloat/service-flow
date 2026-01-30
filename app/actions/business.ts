"use server";

import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

export async function updateBusinessLocation(
  businessSlug: string,
  latitude: number,
  longitude: number,
) {
  try {
    await prisma.business.update({
      where: { slug: businessSlug },
      data: {
        latitude,
        longitude,
      },
    });

    revalidatePath(`/app/${businessSlug}`);
    revalidatePath(`/app/${businessSlug}/business`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update business location:", error);
    return { success: false, error: "Failed to update location" };
  }
}
