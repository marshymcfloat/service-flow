"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ApplyStatusBanner() {
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted");
  const error = searchParams.get("error");
  const statusToken = searchParams.get("statusToken");
  const emailAck = searchParams.get("emailAck");
  const statusPath = statusToken
    ? `/apply/status?token=${encodeURIComponent(statusToken)}`
    : null;

  return (
    <>
      {submitted === "1" ? (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p>Application received. Our team will contact you for demo and manual payment setup.</p>
          {statusPath ? (
            <p className="mt-2">
              Track your application:
              {" "}
              <Link href={statusPath} className="font-semibold underline">
                View status
              </Link>
            </p>
          ) : null}
          {emailAck === "0" ? (
            <p className="mt-2 text-amber-700">
              We could not send your acknowledgement email, but your application was saved.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
    </>
  );
}
