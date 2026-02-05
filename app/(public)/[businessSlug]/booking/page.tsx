import BookingDataContainer from "@/components/bookings/BookingDataContainer";
import BookingSkeleton from "@/components/skeletons/BookingSkeleton";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Book an Appointment | Service Flow",
  description:
    "Reserve your appointment online. Choose services, pick a time, and confirm your booking.",
  robots: {
    index: false,
    follow: true,
  },
};

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
