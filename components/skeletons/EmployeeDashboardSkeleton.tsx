import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDashboardSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50/50 pb-24 md:pb-12 font-sans">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 py-3 flex items-center justify-between md:px-8 md:py-4">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="hidden md:block h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </header>

      <div className="px-4 py-6 md:px-8 max-w-7xl mx-auto space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          <div className="md:col-span-5 lg:col-span-4 order-1">
            <Skeleton className="h-48 md:h-56 w-full rounded-2xl" />
          </div>

          <div className="md:col-span-7 lg:col-span-8 order-2 grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm ${i === 2 ? "col-span-2 lg:col-span-1" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="mt-6 space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-10">
          <section className="xl:col-span-7 space-y-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="hidden md:block h-6 w-8 rounded-full" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </section>

          <section className="xl:col-span-5 space-y-5">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
