import { prisma } from "@/prisma/prisma";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BusinessSettingsForm } from "./BusinessSettingsForm";
import { isSocialPublishingEnabledForBusiness } from "@/lib/features/social-publishing";

export default async function BusinessSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const socialPublishingEnabled =
    isSocialPublishingEnabledForBusiness(businessSlug);

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      social_connections: {
        orderBy: { platform: "asc" },
      },
    },
  });

  if (!business) {
    return <div>Business not found</div>;
  }

  return (
    <div className="flex flex-col p-4 md:p-8 bg-zinc-50/50 min-h-screen">
      <section className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <PageHeader
          title="Business Settings"
          description="Manage your business profile and preferences."
          className="mb-8"
        />
        <BusinessSettingsForm
          business={business}
          socialPublishingEnabled={socialPublishingEnabled}
        />
      </section>
    </div>
  );
}
