import { Suspense } from "react";
import { EmployeesPageSkeleton } from "./EmployeesPageSkeleton";
import { EmployeesContent } from "./EmployeesContent";

export default async function EmployeesPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <Suspense fallback={<EmployeesPageSkeleton />}>
      <EmployeesContent businessSlug={businessSlug} />
    </Suspense>
  );
}
