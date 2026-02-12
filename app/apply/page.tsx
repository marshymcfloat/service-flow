import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createOnboardingApplicationAction } from "@/app/actions/onboarding-applications";
import ApplyStatusBanner from "@/components/forms/ApplyStatusBanner";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Apply for Service Flow",
  description:
    "Apply to onboard your salon, barbershop, or spa to Service Flow. Our team reviews applications within one business day.",
  canonical: "/apply",
});

export default async function ApplyPage() {
  async function submitApplicationFormAction(formData: FormData) {
    "use server";
    const result = await createOnboardingApplicationAction({
      businessName: String(formData.get("businessName") || ""),
      ownerName: String(formData.get("ownerName") || ""),
      ownerEmail: String(formData.get("ownerEmail") || ""),
      ownerPhone: String(formData.get("ownerPhone") || ""),
      notes: String(formData.get("notes") || ""),
      referralCode: String(formData.get("referralCode") || ""),
    });

    if (!result.success) {
      redirect(`/apply/?error=${encodeURIComponent(result.error)}`);
    }

    const tokenParam = result.statusToken
      ? `&statusToken=${encodeURIComponent(result.statusToken)}`
      : "";
    const emailAckParam = `&emailAck=${result.acknowledgementSent ? "1" : "0"}`;

    redirect(`/apply/?submitted=1${tokenParam}${emailAckParam}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs uppercase tracking-wide text-slate-500">ServiceFlow</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Apply for ServiceFlow</h1>
        <p className="mt-2 text-sm text-slate-600">
          Onboarding is admin-reviewed and typically processed within 1 business day.
          Billing is coordinated manually after approval.
        </p>

        <Suspense fallback={null}>
          <ApplyStatusBanner />
        </Suspense>

        <form action={submitApplicationFormAction} className="mt-5 grid gap-3">
          <input
            name="businessName"
            placeholder="Business name"
            required
            className="w-full rounded border px-3 py-2"
          />
          <input
            name="ownerName"
            placeholder="Owner full name"
            required
            className="w-full rounded border px-3 py-2"
          />
          <input
            name="ownerEmail"
            type="email"
            placeholder="Owner email"
            required
            className="w-full rounded border px-3 py-2"
          />
          <input
            name="ownerPhone"
            placeholder="Owner phone (optional)"
            className="w-full rounded border px-3 py-2"
          />
          <input
            name="referralCode"
            placeholder="Referral code (optional)"
            className="w-full rounded border px-3 py-2"
          />
          <textarea
            name="notes"
            placeholder="Business details or notes (optional)"
            rows={4}
            className="w-full rounded border px-3 py-2"
          />
          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Submit Application
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-600">
          Already onboarded?{" "}
          <Link href="/" className="font-medium text-slate-900 underline">
            Sign in here
          </Link>
        </div>
      </div>
    </main>
  );
}
