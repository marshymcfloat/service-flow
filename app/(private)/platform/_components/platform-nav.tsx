"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BriefcaseBusiness,
  Building2,
  Inbox,
  ReceiptText,
  WalletCards,
  UsersRound,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PlatformNavIcon =
  | "overview"
  | "applications"
  | "businesses"
  | "outbox"
  | "plans"
  | "invoices"
  | "referrals"
  | "audit";

export type PlatformNavItem = {
  href: string;
  label: string;
  icon: PlatformNavIcon;
};

const iconByName: Record<PlatformNavIcon, LucideIcon> = {
  overview: LayoutDashboard,
  applications: BriefcaseBusiness,
  businesses: Building2,
  outbox: Inbox,
  plans: WalletCards,
  invoices: ReceiptText,
  referrals: UsersRound,
  audit: ShieldCheck,
};

function trimTrailingSlash(path: string) {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

export function PlatformNav({ items }: { items: PlatformNavItem[] }) {
  const pathname = trimTrailingSlash(usePathname() || "/platform");
  const isOverviewRoute = pathname === "/platform" || pathname === "/platform/overview";

  return (
    <nav aria-label="Platform sections" className="overflow-x-auto pb-1">
      <ul className="flex min-w-max flex-wrap gap-2">
        {items.map((item) => {
          const itemPath = trimTrailingSlash(item.href);
          const isActive =
            item.icon === "overview"
              ? isOverviewRoute
              : pathname === itemPath || pathname.startsWith(`${itemPath}/`);
          const Icon = iconByName[item.icon];

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200",
                  isActive
                    ? "border-[var(--pf-primary)]/45 bg-[var(--pf-primary)]/10 text-[var(--pf-text)] shadow-[inset_0_0_0_1px_rgba(15,118,110,0.25)]"
                    : "border-transparent text-[var(--pf-muted)] hover:border-[var(--pf-border)] hover:bg-white hover:text-[var(--pf-text)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
