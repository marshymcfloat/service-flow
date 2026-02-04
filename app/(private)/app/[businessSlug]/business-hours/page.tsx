import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import {
  getBusinessHours,
  getServiceCategories,
} from "@/lib/server actions/business-hours";
import { BusinessHoursClient } from "./BusinessHoursClient";

export default async function BusinessHoursPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  const [hours, categories] = await Promise.all([
    getBusinessHours(businessSlug),
    getServiceCategories(businessSlug),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <BusinessHoursClient
        initialHours={hours}
        categories={categories}
        businessSlug={businessSlug}
      />
    </Suspense>
  );
}
