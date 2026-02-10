import { Skeleton } from "@/components/ui/skeleton";

export default function BookingSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* Brand Panel Skeleton */}
      <div className="relative w-full lg:w-[45%] lg:min-h-screen bg-muted/30 border-b lg:border-b-0 lg:border-r p-8 lg:p-12 flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 lg:h-20 lg:w-20 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel Skeleton */}
      <div className="flex-1 w-full bg-background p-4 md:p-8 lg:p-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-xl space-y-8">
          <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
