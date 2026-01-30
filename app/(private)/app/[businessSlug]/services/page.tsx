import { Suspense } from "react";
import { ServicesPageSkeleton } from "./ServicesPageSkeleton";
import { ServicesContent } from "./ServicesContent";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <Suspense fallback={<ServicesPageSkeleton />}>
      <ServicesContent businessSlug={businessSlug} />
    </Suspense>
  );
}
