import { Skeleton } from "@/components/ui/skeleton";

export function AttendanceSkeleton() {
  return (
    <div className="flex flex-col p-4 md:p-8 bg-zinc-50/50 min-h-screen">
      <section className="flex-1 flex flex-col w-full max-w-7xl mx-auto space-y-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2 rounded-lg" />
              <Skeleton className="h-4 w-96 rounded-lg" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-10 w-80 rounded-lg bg-zinc-200" />

            {/* Date Navigator & Actions Skeleton */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-1.5 rounded-2xl border border-zinc-200">
              <Skeleton className="h-8 w-64 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>

            {/* Summary Grid Skeleton */}
            <div className="grid gap-4 md:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 h-24"
                >
                  <Skeleton className="h-4 w-16 mb-2 rounded-full" />
                  <Skeleton className="h-8 w-12 rounded-lg" />
                </div>
              ))}
            </div>

            {/* Content Skeleton (Card/Table) */}
            <div className="bg-white rounded-3xl border border-zinc-100 overflow-hidden shadow-sm h-[400px] p-6 space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
