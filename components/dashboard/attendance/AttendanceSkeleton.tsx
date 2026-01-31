import { Skeleton } from "@/components/ui/skeleton";

export function AttendanceSkeleton() {
  return (
    <div className="h-full flex flex-col p-4 md:p-8 bg-zinc-50/50">
      <section className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl md:rounded-3xl border border-gray-200 shadow-xl p-4 md:p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-36" />
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64" />{" "}
                {/* Search/Filter placeholder */}
                <Skeleton className="h-10 w-32" />{" "}
                {/* Action button placeholder */}
              </div>

              {/* Table rows skeleton */}
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
