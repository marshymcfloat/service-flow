import { prisma } from "@/prisma/prisma";
import { getCachedBusinessBySlug } from "@/lib/data/cached";
import { notFound } from "next/navigation";
import { BookingList } from "@/components/dashboard/owner/BookingList";
import { PageHeader } from "@/components/dashboard/PageHeader";

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
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

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-zinc-50/50">
      <section className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl md:rounded-3xl border border-gray-200 shadow-xl p-4 md:p-6">
        <PageHeader
          title="Bookings"
          description="View and manage all your bookings."
          className="mb-6"
        />
        <BookingList bookings={allBookings} />
      </section>
    </div>
  );
}
