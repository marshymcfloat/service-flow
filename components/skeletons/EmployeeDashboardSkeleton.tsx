import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDashboardSkeleton() {
  return (
    <main className="w-screen h-screen flex items-center justify-center p-4 md:p-8 lg:p-12 bg-zinc-50/50">
      <section className="w-full h-full border border-gray-200 shadow-xl bg-white rounded-3xl p-4 md:p-6 flex flex-col overflow-hidden">
        <header className="mb-6 md:mb-8 flex justify-between items-center shrink-0">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </header>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 w-full mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[400px]">
            <Skeleton className="h-[500px] w-full rounded-[30px]" />
            <Skeleton className="h-[500px] w-full rounded-[30px]" />
          </div>
        </div>
      </section>
    </main>
  );
}
