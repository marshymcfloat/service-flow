import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface BusinessFacingSkeletonProps {
  variant?: "landing" | "services";
  className?: string;
}

// Usage:
// <BusinessFacingSkeleton />
// <BusinessFacingSkeleton variant="services" />
export default function BusinessFacingSkeleton({
  variant = "landing",
  className,
}: BusinessFacingSkeletonProps) {
  return (
    <main
      className={cn(
        "min-h-screen bg-[color:var(--bf-cream)] text-[color:var(--bf-ink)] [--bf-cream:oklch(0.98_0.01_92)] [--bf-ink:oklch(0.2_0.02_62)] [--bf-muted:oklch(0.52_0.02_75)] [--bf-blush:oklch(0.92_0.03_35)] [--bf-accent:oklch(0.86_0.08_38)] [--bf-sage:oklch(0.76_0.05_148)]",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading business profile...</span>

      <header className="sticky top-0 z-40 border-b border-black/5 bg-[color:var(--bf-cream)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Skeleton className="h-6 w-32 rounded-full bg-[color:var(--bf-blush)]/70" />
          <div className="hidden items-center gap-6 md:flex">
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-4 w-16 rounded-full bg-[color:var(--bf-blush)]/60"
              />
            ))}
          </div>
          <Skeleton className="h-9 w-24 rounded-full bg-[color:var(--bf-accent)]/50" />
        </div>
      </header>

      {variant === "landing" ? (
        <>
          <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="space-y-6">
              <Skeleton className="h-6 w-40 rounded-full bg-[color:var(--bf-blush)]/70" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full max-w-[420px] rounded-2xl bg-[color:var(--bf-blush)]/60" />
                <Skeleton className="h-10 w-full max-w-[360px] rounded-2xl bg-[color:var(--bf-blush)]/60" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-[420px] rounded-full bg-[color:var(--bf-blush)]/50" />
                <Skeleton className="h-4 w-full max-w-[360px] rounded-full bg-[color:var(--bf-blush)]/50" />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Skeleton className="h-10 w-32 rounded-full bg-[color:var(--bf-accent)]/50" />
                <Skeleton className="h-10 w-32 rounded-full bg-[color:var(--bf-blush)]/60" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-16 w-full rounded-2xl bg-[color:var(--bf-blush)]/50"
                  />
                ))}
              </div>
            </div>
            <div className="relative">
              <Skeleton className="aspect-[4/5] w-full rounded-[2.5rem] bg-[color:var(--bf-blush)]/60" />
              <Skeleton className="absolute -bottom-6 -left-6 h-16 w-48 rounded-2xl bg-[color:var(--bf-accent)]/40" />
            </div>
          </section>

          <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-28 w-full rounded-3xl bg-[color:var(--bf-blush)]/50"
              />
            ))}
          </section>

          <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              {[...Array(2)].map((_, sectionIndex) => (
                <div key={sectionIndex} className="space-y-4">
                  <Skeleton className="h-6 w-36 rounded-full bg-[color:var(--bf-blush)]/60" />
                  <Skeleton className="h-8 w-64 rounded-2xl bg-[color:var(--bf-blush)]/60" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[...Array(4)].map((_, cardIndex) => (
                      <Skeleton
                        key={cardIndex}
                        className="h-28 w-full rounded-3xl bg-[color:var(--bf-blush)]/50"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
              <Skeleton className="h-56 w-full rounded-3xl bg-[color:var(--bf-accent)]/35" />
              <Skeleton className="h-44 w-full rounded-3xl bg-[color:var(--bf-blush)]/50" />
            </aside>
          </section>
        </>
      ) : (
        <>
          <section className="mx-auto max-w-6xl px-6 py-16">
            <Skeleton className="h-40 w-full rounded-[2.5rem] bg-[color:var(--bf-blush)]/50" />
          </section>

          <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 lg:grid-cols-[220px_1fr]">
            <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
              <Skeleton className="h-5 w-24 rounded-full bg-[color:var(--bf-blush)]/60" />
              {[...Array(5)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-full rounded-2xl bg-[color:var(--bf-blush)]/50"
                />
              ))}
            </aside>
            <div className="space-y-8">
              {[...Array(3)].map((_, sectionIndex) => (
                <div key={sectionIndex} className="space-y-4">
                  <Skeleton className="h-6 w-40 rounded-full bg-[color:var(--bf-blush)]/60" />
                  <div className="grid gap-4 md:grid-cols-2">
                    {[...Array(4)].map((_, cardIndex) => (
                      <Skeleton
                        key={cardIndex}
                        className="h-28 w-full rounded-3xl bg-[color:var(--bf-blush)]/50"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
