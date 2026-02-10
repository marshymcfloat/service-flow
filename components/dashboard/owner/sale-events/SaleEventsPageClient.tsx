"use client";

import { CreateSaleEventDialog } from "./CreateSaleEventDialog";
import { SaleEventList, type SaleEvent } from "./SaleEventList";
import { deleteSaleEvent } from "@/lib/server actions/sale-event";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Percent } from "lucide-react";

interface SaleEventsPageClientProps {
  businessSlug: string;
  initialEvents: SaleEvent[];
  services: { id: number; name: string; category: string }[];
  packages: { id: number; name: string }[];
}

export function SaleEventsPageClient({
  businessSlug,
  initialEvents,
  services,
  packages,
}: SaleEventsPageClientProps) {
  const router = useRouter();

  const handleDelete = async (id: number) => {
    try {
      const result = await deleteSaleEvent(id, businessSlug);
      if (result.success) {
        toast.success("Sale event deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete sale event");
      }
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Percent className="h-6 w-6 text-emerald-700" />
            </div>
            Sale Events
          </h2>
          <p className="text-zinc-500 mt-1">
            Manage your promotional campaigns and discounts.
          </p>
        </div>
        <CreateSaleEventDialog
          businessSlug={businessSlug}
          services={services}
          packages={packages}
        />
      </div>

      <SaleEventList events={initialEvents} onDelete={handleDelete} />
    </div>
  );
}
