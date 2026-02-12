import { cn, formatCurrency } from "@/lib/utils";
import { type ReactNode } from "react";

const POSITIVE_STATUSES = new Set([
  "ACTIVE",
  "APPROVED",
  "CONVERTED",
  "PAID",
  "QUALIFIED",
  "REWARDED",
  "CONTACTED",
  "SUCCESS",
  "SETTLED",
]);

const WARNING_STATUSES = new Set([
  "TRIALING",
  "GRACE_PERIOD",
  "PENDING",
  "NEW",
  "OPEN",
  "DRAFT",
]);

const DANGER_STATUSES = new Set([
  "SUSPENDED",
  "CANCELED",
  "FAILED",
  "VOID",
  "EXPIRED",
  "REJECTED",
]);

export const platformPanelClass =
  "rounded-3xl border border-[var(--pf-border)] bg-[var(--pf-surface)]/95 shadow-[0_20px_44px_-30px_rgba(15,31,42,0.55)] backdrop-blur";

export const platformTableContainerClass =
  "overflow-x-auto rounded-2xl border border-[var(--pf-border)] bg-[var(--pf-surface-soft)]/70";

export const platformTableClass = "min-w-full text-left text-sm";
export const platformTableHeadClass =
  "px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--pf-muted)]";
export const platformTableCellClass =
  "px-4 py-3 align-top text-[var(--pf-text)] whitespace-nowrap";

export const platformInputClass =
  "h-10 w-full rounded-xl border border-[var(--pf-border)] bg-white px-3 text-sm text-[var(--pf-text)] outline-none transition focus-visible:border-[var(--pf-primary)] focus-visible:ring-2 focus-visible:ring-cyan-200";

export const platformPrimaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-xl bg-[var(--pf-primary)] px-4 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200";

export const platformSecondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-xl border border-[var(--pf-border)] bg-white px-3 text-xs font-semibold text-[var(--pf-text)] transition hover:border-[var(--pf-primary)]/45 hover:text-[var(--pf-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200";

export const platformDangerButtonClass =
  "inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200";

export function PlatformPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--pf-text)]">{title}</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--pf-muted)]">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PlatformMetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent";
}) {
  return (
    <article
      className={cn(
        platformPanelClass,
        "p-5",
        tone === "accent" && "border-[var(--pf-primary)]/45 bg-[var(--pf-primary)]/[0.07]",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--pf-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--pf-text)]">{value}</p>
    </article>
  );
}

export function PlatformStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toUpperCase();
  const toneClass = POSITIVE_STATUSES.has(normalized)
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : DANGER_STATUSES.has(normalized)
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : WARNING_STATUSES.has(normalized)
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-semibold uppercase tracking-wide",
        toneClass,
        className,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function formatPlatformDate(date: Date) {
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPlatformDateTime(date: Date) {
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPhpFromCentavos(amountCentavos: number) {
  return formatCurrency(amountCentavos / 100);
}
