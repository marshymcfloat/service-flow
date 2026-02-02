import { prisma } from "@/prisma/prisma";
import { getCachedBusinessBySlug } from "@/lib/data/cached";
import { notFound } from "next/navigation";
import { BookingList } from "@/components/dashboard/owner/BookingList";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Suspense } from "react";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui/skeleton";

function BookingsPageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search and filter skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Table header skeleton */}
      <div className="hidden md:grid md:grid-cols-6 gap-4 p-4 border-b">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
      {/* Table rows skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border-b"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function BookingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-zinc-50/50">
      <section className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl md:rounded-3xl border border-gray-200 shadow-xl p-4 md:p-6">
        <PageHeader
          title="Bookings"
          description="View and manage all your bookings."
          className="mb-6"
        />
        <Suspense fallback={<BookingsPageSkeleton />}>
          <BookingsContent params={params} />
        </Suspense>
      </section>
    </div>
  );
}

async function BookingsContent({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  await connection();
  const { businessSlug } = await params;
  const business = await getCachedBusinessBySlug(businessSlug);

  if (!business) {
    return notFound();
  }

  const allBookings = await prisma.booking.findMany({
    where: {
      business_id: business.id,
    },
    include: {
      customer: true,
      availed_services: {
        include: {
          service: true,
          served_by: {
            include: { user: true },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return <BookingList bookings={allBookings} />;
}
