"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import LocationInputGroup from "@/components/business/LocationInputGroup";
import { updateBusinessAction } from "@/lib/server actions/business-settings";
import { Loader2 } from "lucide-react";

interface BusinessSettingsFormProps {
  business: {
    slug: string;
    name: string;
    initials: string | null;
    description: string | null;
    imageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

export function BusinessSettingsForm({ business }: BusinessSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateBusinessAction(business.slug, formData);
      if (result.success) {
        toast.success("Business settings saved successfully");
      } else {
        toast.error(result.error || "Something went wrong");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <Card className="rounded-3xl border-zinc-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-zinc-100 p-6">
          <CardTitle className="text-xl font-bold text-zinc-900">
            General Information
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Basic details about your business.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6 bg-white">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-700">
                Business Name
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={business.name}
                placeholder="e.g. BeautyFeel"
                className="rounded-xl border-zinc-200 focus-visible:ring-emerald-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initials" className="text-zinc-700">
                Business Initials
              </Label>
              <Input
                id="initials"
                name="initials"
                defaultValue={business.initials || ""}
                placeholder="e.g. BF"
                maxLength={2}
                required
                className="rounded-xl border-zinc-200 focus-visible:ring-emerald-500"
              />
              <p className="text-[0.8rem] text-zinc-400">
                Used as prefix for voucher codes (e.g. BF-123456)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-zinc-700">Business Image</Label>
            <div className="space-y-2">
              <input
                type="hidden"
                name="existingImageUrl"
                defaultValue={business.imageUrl || ""}
              />
              <ImageUpload name="imageFile" defaultValue={business.imageUrl} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-700">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={business.description || ""}
              placeholder="Tell customers about your business..."
              className="rounded-xl border-zinc-200 focus-visible:ring-emerald-500 min-h-[120px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-zinc-700">
              Business Slug
            </Label>
            <Input
              disabled
              defaultValue={business.slug}
              className="bg-zinc-50 border-zinc-200 rounded-xl text-zinc-500"
            />
            <p className="text-[0.8rem] text-zinc-400">
              This is your unique identifier used in the URL. Only admins can
              change this.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-zinc-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-zinc-100 p-6">
          <CardTitle className="text-xl font-bold text-zinc-900">
            Location
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Pin your business location on the map. This helps customers find
            you.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6 bg-white">
            <LocationInputGroup
              initialLat={business.latitude}
              initialLng={business.longitude}
              businessSlug={business.slug}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 px-8 min-w-[140px]"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
