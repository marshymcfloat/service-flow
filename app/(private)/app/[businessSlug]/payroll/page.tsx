import { Suspense } from "react";
import { PayrollPageSkeleton } from "./PayrollPageSkeleton";
import { PayrollContent } from "./PayrollContent";

export default async function PayrollPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <Suspense fallback={<PayrollPageSkeleton />}>
      <PayrollContent businessSlug={businessSlug} />
    </Suspense>
  );
}
