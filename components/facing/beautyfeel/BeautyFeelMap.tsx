"use client";

import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export interface BeautyFeelMapProps {
  latitude: number;
  longitude: number;
  label?: string;
}

if (typeof window !== "undefined") {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

export default function BeautyFeelMap({
  latitude,
  longitude,
  label,
}: BeautyFeelMapProps) {
  const position = { lat: latitude, lng: longitude };

  return (
    <div className="h-72 w-full overflow-hidden rounded-3xl border border-black/10 bg-[color:var(--bf-cream)]">
      <MapContainer
        // @ts-ignore
        center={position}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          // @ts-ignore
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>{label || "Business location"}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
