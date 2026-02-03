import BookingDataContainer from "@/components/bookings/BookingDataContainer";
import BookingSkeleton from "@/components/skeletons/BookingSkeleton";
import { Suspense } from "react";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <div className="min-h-screen w-full bg-background">
      <Suspense fallback={<BookingSkeleton />}>
        <BookingDataContainer params={params} />
      </Suspense>
    </div>
  );
}
