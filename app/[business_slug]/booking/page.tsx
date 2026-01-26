import BookingForm from "@/components/bookings/BookingForm";
import { prisma } from "@/prisma/prisma";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ business_slug: string }>;
}) {
  const { business_slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug: business_slug },
  });

  if (!business) {
    return notFound();
  }

  const getServices = unstable_cache(
    async () => {
      const services = await prisma.service.findMany({
        where: { business_id: business.id },
      });
      return services;
    },
    [`services-${business.id}`],
    {
      revalidate: 3600,
      tags: [`services-${business.id}`],
    },
  );

  const services = await getServices();

  return (
    <div className="flex h-screen flex-col p-4">
      <h1 className="mb-6 text-center font-sans text-2xl font-medium">
        {business.name}
      </h1>
      <BookingForm services={services} />
    </div>
  );
}
