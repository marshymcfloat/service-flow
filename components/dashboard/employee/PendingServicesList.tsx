"use client";

import { formatPH } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Inbox, Clock as ClockIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  claimServiceAction,
  getPendingServicesAction,
} from "@/lib/server actions/dashboard";

interface PendingService {
  id: number;
  service: {
    name: string;
    duration: number | null;
  };
  booking: {
    customer: {
      name: string;
    };
  };
  scheduled_at: Date | null;
  price: number;
  package_id: number | null;
  package: {
    name: string;
  } | null;
}

export default function PendingServicesList({
  services: initialServices,
  businessSlug,
  currentEmployeeId,
}: {
  services: PendingService[];
  businessSlug: string;
  currentEmployeeId: number;
}) {
  const [selectedService, setSelectedService] = useState<PendingService | null>(
    null,
  );
  const [isClaiming, setIsClaiming] = useState(false);

  const { data: services } = useQuery({
    queryKey: ["pending-services", businessSlug],
    queryFn: () => getPendingServicesAction(),
    initialData: initialServices,
    refetchInterval: 5000,
  });

  const handleClaim = async () => {
    if (!selectedService) return;
    setIsClaiming(true);
    const result = await claimServiceAction(
      selectedService.id,
      currentEmployeeId,
    );
    setIsClaiming(false);

    if (result.success) {
      setSelectedService(null);
    } else {
      alert(result.error);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="space-y-4 p-4 lg:p-0">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 opacity-70 border-2 border-dashed border-slate-200 rounded-3xl">
              <div className="bg-slate-50 p-6 rounded-full">
                <Inbox className="w-10 h-10 text-slate-300" />
              </div>
              <div className="max-w-xs mx-auto">
                <h3 className="font-bold text-lg text-slate-900">
                  All caught up!
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  There are no pending services in the queue right now.
                </p>
              </div>
            </div>
          ) : (
            services.map((item) => {
              const customerInitials = item.booking.customer.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group active:scale-[0.99] relative overflow-hidden"
                  onClick={() => setSelectedService(item)}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>

                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-200 shadow-inner shrink-0">
                        {customerInitials}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors">
                            {item.service.name}
                          </h4>
                          {item.package && (
                            <Badge
                              variant="secondary"
                              className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-semibold h-4 px-1"
                            >
                              {item.package.name}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs font-medium text-slate-500">
                          {item.booking.customer.name}
                        </p>

                        <div className="flex items-center gap-3 pt-1">
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                            <ClockIcon className="w-3 h-3" />
                            {item.scheduled_at
                              ? formatPH(item.scheduled_at, "h:mm a")
                              : "Walk-in"}
                          </span>
                          {item.service.duration && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {item.service.duration} mins
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end pl-2">
                      <span className="text-sm font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        ₱{item.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog
        open={!!selectedService}
        onOpenChange={(open) => !open && setSelectedService(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to claim this service?
              <br />
              <strong>{selectedService?.service.name}</strong> for{" "}
              {selectedService?.booking.customer.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              By claiming this service, you will be assigned as the staff member
              responsible for it. You can mark it as served later.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedService(null)}
              disabled={isClaiming}
            >
              Cancel
            </Button>
            <Button onClick={handleClaim} disabled={isClaiming}>
              {isClaiming ? "Claiming..." : "Claim Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
