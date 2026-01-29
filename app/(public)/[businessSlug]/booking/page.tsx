import BookingDataContainer from "@/components/bookings/BookingDataContainer";
import BookingSkeleton from "@/components/skeletons/BookingSkeleton";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <div className="min-h-screen w-full bg-muted/40 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl relative z-0">
        <Suspense fallback={<BookingSkeleton />}>
          <BookingDataContainer businessSlug={businessSlug} />
        </Suspense>
      </div>
      <div className="fixed inset-0 -z-10 h-full w-full bg-white [background:radial-gradient(125%_125%_at_50%_10%,#fff_40%,#63e_100%)] opacity-20" />
    </div>
  );
}
