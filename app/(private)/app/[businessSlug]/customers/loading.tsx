import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/dashboard/PageHeader";

export default function Loading() {
  return (
    <div className="h-screen flex flex-col p-4 md:p-8 bg-zinc-50/50">
      <section className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl md:rounded-3xl border border-gray-200 shadow-xl p-4 md:p-6">
        <PageHeaderSkeleton />

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Skeleton className="h-10 w-full sm:w-[300px]" />
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3 border-b last:border-0"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
