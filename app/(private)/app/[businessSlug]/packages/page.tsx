import { Suspense } from "react";
import { PackagesPageSkeleton } from "./PackagesPageSkeleton";
import { PackagesContent } from "./PackagesContent";

export default async function PackagesPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <Suspense fallback={<PackagesPageSkeleton />}>
      <PackagesContent businessSlug={businessSlug} />
    </Suspense>
  );
}
