"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  name?: string;
  defaultValue?: string | null;
  className?: string;
}

export function ImageUpload({
  name,
  defaultValue,
  className,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(defaultValue || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when defaultValue changes (if needed, though mostly initial)
  useEffect(() => {
    if (defaultValue) {
      setPreview(defaultValue);
    }
  }, [defaultValue]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      setPreview(defaultValue || null);
      return;
    }

    const file = event.target.files[0];

    // Create local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Clean up memory when component unmounts or preview changes
    return () => URL.revokeObjectURL(objectUrl);
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Note: If we remove the image, we might want to signal "delete" to the server.
    // For now, removing just clears the NEW file selection and the PREVIEW.
    // Use a separate mechanism (like a checkbox or hidden field) to explicitly delete the image on server if required.
    // But for "replacing", clearing the input is enough to prevent upload.
    // If the user wants to *delete* the existing image, we probably need a "Delete" button that sets a hidden flag.
    // For this task, "prepopulate" is the key.
    // If I clear the preview, and there was a default value, I should probably show empty state.
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative group aspect-video w-full max-w-md overflow-hidden rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 transition-colors hover:bg-zinc-100">
        {preview ? (
          <>
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full shadow-sm"
                onClick={(e) => {
                  e.preventDefault();
                  handleRemove();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-8 w-8" />
            <p className="text-sm font-medium">Click to upload image</p>
            <p className="text-xs text-zinc-400">
              Recommended: 1200x630 (1.91:1)
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          name={name}
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}
