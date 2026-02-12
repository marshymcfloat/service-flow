"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-rose-900 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Admin page failed to load</h2>
            <p className="text-sm text-rose-800">
              The platform page hit an unexpected error. You can retry safely or go back to the overview.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
            >
              <RotateCw className="h-4 w-4" />
              Try Again
            </button>
            <Link
              href="/platform"
              className="inline-flex h-9 items-center rounded-xl border border-rose-200 bg-rose-100 px-3 text-sm font-semibold text-rose-900 transition hover:bg-rose-200"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
