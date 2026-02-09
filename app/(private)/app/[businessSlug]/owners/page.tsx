import { Suspense } from "react";
import { OwnersPageSkeleton } from "./OwnersPageSkeleton";
import { OwnersContent } from "./OwnersContent";

export default async function OwnersPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <Suspense fallback={<OwnersPageSkeleton />}>
      <OwnersContent businessSlug={businessSlug} />
    </Suspense>
  );
}
