import { prisma } from "@/prisma/prisma";
import { SaleEventsPageClient } from "@/components/dashboard/owner/sale-events/SaleEventsPageClient";
import { redirect } from "next/navigation";
import { isSocialPublishingEnabledForBusiness } from "@/lib/features/social-publishing";
import { requireOwnerTenantWriteAccess } from "@/lib/auth/guards";

export default async function SaleEventsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const auth = await requireOwnerTenantWriteAccess(businessSlug);
  if (!auth.success) {
    redirect(`/app/${businessSlug}`);
  }

  const socialPublishingEnabled =
    isSocialPublishingEnabledForBusiness(businessSlug);

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
          social_posts: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      },
      social_connections: {
        where: { status: "CONNECTED" },
        select: { platform: true },
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
        connectedPlatforms={business.social_connections.map(
          (connection) => connection.platform,
        )}
        socialPublishingEnabled={socialPublishingEnabled}
      />
    </div>
  );
}
