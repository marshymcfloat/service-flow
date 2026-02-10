"use client";

import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  Popup,
} from "react-leaflet";

if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

function LocationMarker({
  position,
  setPosition,
}: {
  position: { lat: number; lng: number } | null;
  setPosition: (pos: { lat: number; lng: number }) => void;
}) {
  type MapClickEvent = { latlng: { lat: number; lng: number } };
  const map = useMapEvents({
    click(e: MapClickEvent) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Business Location</Popup>
    </Marker>
  );
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
}: {
  latitude?: number | null;
  longitude?: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  const defaultCenter = { lat: 14.5995, lng: 120.9842 };

  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null,
  );

  const handleSetPosition = (pos: { lat: number; lng: number }) => {
    setPosition(pos);
    onLocationSelect(pos.lat, pos.lng);
  };

  return (
    <div className="h-[400px] w-full rounded-md overflow-hidden border border-zinc-200 z-0 relative">
      <MapContainer
        // @ts-expect-error react-leaflet type mismatch with current React/TS setup
        center={position || defaultCenter}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          // @ts-expect-error react-leaflet type mismatch with current React/TS setup
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={handleSetPosition} />
      </MapContainer>
    </div>
  );
}
