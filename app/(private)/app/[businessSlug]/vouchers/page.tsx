import { Suspense } from "react";
import { VouchersPageSkeleton } from "./VouchersPageSkeleton";
import { VouchersContent } from "./VouchersContent";

interface PageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function VouchersPage({ params }: PageProps) {
  const { businessSlug } = await params;

  return (
    <Suspense fallback={<VouchersPageSkeleton />}>
      <VouchersContent businessSlug={businessSlug} />
    </Suspense>
  );
}
