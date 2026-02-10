"use client";

import dynamic from "next/dynamic";
import type { BeautyFeelMapProps } from "./BeautyFeelMap";

const BeautyFeelMap = dynamic(() => import("./BeautyFeelMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-3xl border border-black/10 bg-[color:var(--bf-cream)] text-sm text-[color:var(--bf-muted)]">
      Loading map...
    </div>
  ),
});

export default function BeautyFeelMapWrapper(props: BeautyFeelMapProps) {
  return <BeautyFeelMap {...props} />;
}
