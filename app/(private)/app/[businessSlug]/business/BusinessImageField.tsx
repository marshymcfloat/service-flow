"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";

export function BusinessImageField({
  initialImageUrl,
}: {
  initialImageUrl?: string | null;
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl || "");

  return (
    <>
      <ImageUpload
        value={imageUrl}
        onChange={(url) => setImageUrl(url)}
        className="w-full max-w-md"
      />
      <Input type="hidden" name="imageUrl" value={imageUrl} />
    </>
  );
}
