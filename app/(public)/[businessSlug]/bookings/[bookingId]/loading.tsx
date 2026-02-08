import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8 flex flex-col items-center">
          {/* Business Name Skeleton */}
          <Skeleton className="h-8 w-48 mb-2" />
          {/* "Booking Confirmation" text placeholder */}
          <Skeleton className="h-4 w-32" />
        </div>

        <Card className="border-t-4 border-t-emerald-500 shadow-lg">
          <CardHeader className="bg-gray-50/50 pb-4 border-b border-gray-100">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Booking Reference
                </CardTitle>
                {/* Reference ID Skeleton */}
                <Skeleton className="h-8 w-24" />
              </div>
              {/* Status Badge Skeleton */}
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Date & Time Highlight Skeleton */}
            <div className="bg-emerald-50 rounded-xl p-4 flex items-center justify-between border border-emerald-100">
              <div className="flex items-center space-x-3 w-1/2">
                <Skeleton className="h-9 w-9 rounded-full bg-emerald-200" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-10 bg-emerald-200" />
                  <Skeleton className="h-4 w-24 bg-emerald-100" />
                </div>
              </div>
              <div className="w-px h-10 bg-emerald-200 mx-2"></div>
              <div className="flex items-center space-x-3 text-right justify-end w-1/2">
                <div className="space-y-1.5 flex flex-col items-end flex-1">
                  <Skeleton className="h-3 w-10 bg-emerald-200" />
                  <Skeleton className="h-4 w-20 bg-emerald-100" />
                </div>
                <Skeleton className="h-9 w-9 rounded-full bg-emerald-200" />
              </div>
            </div>

            <Separator />

            {/* Services List Skeleton */}
            <div>
              <Skeleton className="h-4 w-32 mb-4" />
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-2 w-2 rounded-full bg-emerald-500" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Financials Skeleton */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>

              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>

              <Separator className="my-2" />

              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-gray-50/50 p-6 flex-col space-y-4">
            <div className="w-full flex justify-center mb-2">
              <Skeleton className="h-3 w-64" />
            </div>

            {/* Buttons Skeleton */}
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </CardFooter>
        </Card>

        <div className="mt-8 text-center flex justify-center">
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    </div>
  );
}
