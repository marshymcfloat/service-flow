"use client";

import { useSearchParams } from "next/navigation";

export default function ReferralStatusBanner() {
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted");

  if (submitted !== "1") {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
      Thanks, your referral lead has been submitted.
    </div>
  );
}
