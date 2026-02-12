import { Suspense } from "react";

import { GiftCardsContent } from "./GiftCardsContent";
import { GiftCardsPageSkeleton } from "./GiftCardsPageSkeleton";

interface PageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function GiftCardsPage({ params }: PageProps) {
  const { businessSlug } = await params;

  return (
    <Suspense fallback={<GiftCardsPageSkeleton />}>
      <GiftCardsContent businessSlug={businessSlug} />
    </Suspense>
  );
}
