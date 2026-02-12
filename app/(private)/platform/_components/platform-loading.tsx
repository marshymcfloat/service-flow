import { Skeleton } from "@/components/ui/skeleton";
import {
  platformPanelClass,
  platformTableContainerClass,
} from "./platform-ui";

const navSkeletonItems = [
  "Overview",
  "Applications",
  "Businesses",
  "Plans",
  "Invoices",
  "Referrals",
  "Audit",
];

const skeletonToneClass = "bg-[var(--pf-border)]/65";

function PlatformNavSkeleton() {
  return (
    <nav
      aria-hidden
      className="overflow-x-auto pb-1"
    >
      <ul className="flex min-w-max flex-wrap gap-2">
        {navSkeletonItems.map((item) => (
          <li key={item}>
            <Skeleton
              className={`h-9 rounded-xl ${skeletonToneClass}`}
              style={{
                width: `${Math.max(96, item.length * 10)}px`,
              }}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PlatformTabContentSkeleton() {
  return (
    <section aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading admin tab</span>

      <div className="space-y-2">
        <Skeleton className={`h-8 w-60 ${skeletonToneClass}`} />
        <Skeleton className={`h-4 w-full max-w-2xl ${skeletonToneClass}`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className={`${platformPanelClass} p-5`}>
            <Skeleton className={`h-3 w-24 ${skeletonToneClass}`} />
            <Skeleton className={`mt-3 h-7 w-20 ${skeletonToneClass}`} />
          </article>
        ))}
      </div>

      <section className={`${platformPanelClass} p-5 sm:p-6`}>
        <Skeleton className={`h-6 w-56 ${skeletonToneClass}`} />
        <Skeleton className={`mt-2 h-4 w-full max-w-xl ${skeletonToneClass}`} />
        <div className={`mt-4 ${platformTableContainerClass}`}>
          <div className="space-y-2 p-4">
            {Array.from({ length: 7 }).map((_, rowIndex) => (
              <Skeleton
                key={rowIndex}
                className={`h-11 w-full ${skeletonToneClass}`}
              />
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

export function PlatformShellSkeleton() {
  return (
    <main
      className="relative min-h-screen overflow-x-clip bg-[linear-gradient(130deg,var(--pf-canvas)_0%,#f8fcfd_43%,var(--pf-canvas-alt)_100%)] text-[var(--pf-text)] [--pf-canvas:#edf5f8] [--pf-canvas-alt:#fdf8ec] [--pf-surface:#ffffff] [--pf-surface-soft:#f7fbfd] [--pf-text:#132530] [--pf-muted:#577082] [--pf-border:#cde0e8] [--pf-primary:#0f766e]"
      aria-busy="true"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-0 h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="absolute right-0 top-28 h-[20rem] w-[20rem] translate-x-1/3 rounded-full bg-amber-200/35 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-[var(--pf-border)] bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className={`h-3 w-44 ${skeletonToneClass}`} />
              <Skeleton className={`h-8 w-72 ${skeletonToneClass}`} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className={`h-8 w-44 rounded-full ${skeletonToneClass}`} />
              <Skeleton className={`h-9 w-24 rounded-xl ${skeletonToneClass}`} />
            </div>
          </div>
          <div className="mt-4">
            <PlatformNavSkeleton />
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <section className={`${platformPanelClass} p-6 sm:p-7`}>
          <Skeleton className={`h-3 w-40 ${skeletonToneClass}`} />
          <Skeleton className={`mt-3 h-8 w-full max-w-3xl ${skeletonToneClass}`} />
        </section>
        <PlatformTabContentSkeleton />
      </div>
    </main>
  );
}
