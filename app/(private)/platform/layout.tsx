import Link from "next/link";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { PlatformSignOutButton } from "@/components/auth/PlatformSignOutButton";
import { authOptions } from "@/lib/next auth/options";
import { PlatformNav, type PlatformNavItem } from "./_components/platform-nav";
import { platformPanelClass } from "./_components/platform-ui";
import {
  PlatformShellSkeleton,
  PlatformTabContentSkeleton,
} from "./_components/platform-loading";

export const metadata: Metadata = {
  title: "Platform Admin",
  robots: {
    index: false,
    follow: false,
  },
};

const platformNav: PlatformNavItem[] = [
  { href: "/platform", label: "Overview", icon: "overview" },
  { href: "/platform/applications", label: "Applications", icon: "applications" },
  { href: "/platform/businesses", label: "Businesses", icon: "businesses" },
  { href: "/platform/outbox", label: "Outbox", icon: "outbox" },
  { href: "/platform/plans", label: "Plans", icon: "plans" },
  { href: "/platform/invoices", label: "Invoices", icon: "invoices" },
  { href: "/platform/referrals", label: "Referrals", icon: "referrals" },
  { href: "/platform/audit", label: "Audit", icon: "audit" },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PlatformShellSkeleton />}>
      <PlatformLayoutInner>{children}</PlatformLayoutInner>
    </Suspense>
  );
}

async function PlatformLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }
  if (session.user.role !== "PLATFORM_ADMIN") {
    redirect(session.user.businessSlug ? `/app/${session.user.businessSlug}` : "/");
  }

  return (
    <main
      className="relative min-h-screen overflow-x-clip bg-[linear-gradient(130deg,var(--pf-canvas)_0%,#f8fcfd_43%,var(--pf-canvas-alt)_100%)] text-[var(--pf-text)] [--pf-canvas:#edf5f8] [--pf-canvas-alt:#fdf8ec] [--pf-surface:#ffffff] [--pf-surface-soft:#f7fbfd] [--pf-text:#132530] [--pf-muted:#577082] [--pf-border:#cde0e8] [--pf-primary:#0f766e]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-0 h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="absolute right-0 top-28 h-[20rem] w-[20rem] translate-x-1/3 rounded-full bg-amber-200/35 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-[var(--pf-border)] bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pf-muted)]">
                ServiceFlow Platform
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Admin Command Center</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="rounded-full border border-[var(--pf-border)] bg-white/80 px-3 py-1 text-sm text-[var(--pf-muted)]">
                {session.user.email}
              </p>
              <PlatformSignOutButton className="h-9 rounded-xl border-[var(--pf-border)] bg-white px-3 text-xs font-semibold text-[var(--pf-text)] hover:border-[var(--pf-primary)]/45 hover:text-[var(--pf-primary)]" />
            </div>
          </div>
          <div className="mt-4">
            <PlatformNav items={platformNav} />
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <section className={`${platformPanelClass} relative overflow-hidden p-6 sm:p-7`}>
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-28 w-32 translate-x-8 -translate-y-8 rounded-full bg-cyan-100/70 blur-2xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pf-muted)]">
                Operations Overview
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Manage platform growth, billing reliability, and account health from one place.
              </h2>
            </div>
            <Link
              href="/platform/audit"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--pf-border)] bg-white px-4 text-sm font-semibold text-[var(--pf-text)] transition hover:border-[var(--pf-primary)]/45 hover:text-[var(--pf-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              <ShieldCheck className="h-4 w-4" />
              View Audit Trail
            </Link>
          </div>
        </section>

        <Suspense fallback={<PlatformTabContentSkeleton />}>
          {children}
        </Suspense>
      </div>
    </main>
  );
}
