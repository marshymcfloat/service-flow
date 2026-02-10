"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Dynamic import for Map component to avoid SSR issues
const LocationPicker = dynamic(
  () => import("@/components/business/LocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full bg-zinc-100 animate-pulse rounded-md flex items-center justify-center text-zinc-400">
        Loading Map...
      </div>
    ),
  },
);

interface LocationInputGroupProps {
  initialLat: number | null;
  initialLng: number | null;
  // Make businessSlug optional as we might not need it if we aren't auto-saving
  businessSlug?: string;
}

export default function LocationInputGroup({
  initialLat,
  initialLng,
}: LocationInputGroupProps) {
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Latitude</Label>
          <Input
            name="latitude"
            value={lat !== null ? lat : ""}
            readOnly
            className="bg-zinc-50 font-mono"
            placeholder="Select on map"
          />
        </div>
        <div className="space-y-2">
          <Label>Longitude</Label>
          <Input
            name="longitude"
            value={lng !== null ? lng : ""}
            readOnly
            className="bg-zinc-50 font-mono"
            placeholder="Select on map"
          />
        </div>
      </div>

      <LocationPicker
        latitude={lat}
        longitude={lng}
        onLocationSelect={(newLat, newLng) => {
          setLat(newLat);
          setLng(newLng);
        }}
      />
    </div>
  );
}
