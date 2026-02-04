"use server";

import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

export async function updateBusinessAction(
  businessSlug: string,
  formData: FormData,
) {
  try {
    const name = formData.get("name") as string;
    const initials = formData.get("initials") as string;
    const description = formData.get("description") as string;

    // Existing image URL
    let imageUrl = formData.get("existingImageUrl") as string;

    // Handle new file upload
    const imageFile = formData.get("imageFile") as File;
    if (imageFile && imageFile.size > 0) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(imageFile.name, imageFile, {
          access: "public",
          allowOverwrite: true,
          addRandomSuffix: true,
        });
        imageUrl = blob.url;
      } catch (error) {
        console.error("Blob upload error:", error);
        return {
          success: false,
          error:
            "Failed to upload image. Please check your storage configuration.",
        };
      }
    }

    const latStr = formData.get("latitude") as string;
    const lngStr = formData.get("longitude") as string;

    const latitude = latStr ? parseFloat(latStr) : null;
    const longitude = lngStr ? parseFloat(lngStr) : null;

    await prisma.business.update({
      where: { slug: businessSlug },
      data: {
        name,
        initials: initials.toUpperCase(),
        description,
        imageUrl,
        latitude: latitude,
        longitude: longitude,
      },
    });

    revalidatePath(`/app/${businessSlug}`);
    revalidatePath(`/app/${businessSlug}/business`);
    revalidatePath(`/explore`);

    return { success: true };
  } catch (error) {
    console.error("Update business error:", error);
    return { success: false, error: "Failed to update business settings." };
  }
}
