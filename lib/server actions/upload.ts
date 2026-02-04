"use server";

import { put } from "@vercel/blob";

export async function uploadImageAction(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file uploaded");
  }

  const blob = await put(file.name, file, {
    access: "public",
    allowOverwrite: true,
    addRandomSuffix: true,
  });

  return blob.url;
}
