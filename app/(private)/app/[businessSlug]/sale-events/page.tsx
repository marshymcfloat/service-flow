import { prisma } from "@/prisma/prisma";
import { SaleEventsPageClient } from "@/components/dashboard/owner/sale-events/SaleEventsPageClient";
import { redirect } from "next/navigation";

export default async function SaleEventsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      services: {
        select: { id: true, name: true, category: true },
        orderBy: { name: "asc" },
      },
      packages: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
      sale_events: {
        include: {
          applicable_services: true,
          applicable_packages: true,
        },
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!business) {
    redirect("/app");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <SaleEventsPageClient
        businessSlug={businessSlug}
        initialEvents={business.sale_events}
        services={business.services}
        packages={business.packages}
      />
    </div>
  );
}
