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
    queryFn: () => getPendingServicesAction(businessSlug),
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
        <div className="space-y-3">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-60 bg-muted/30 rounded-2xl border border-dashed">
              <div className="bg-background p-4 rounded-full shadow-sm">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No pending services</h3>
                <p className="text-sm text-muted-foreground">
                  New bookings will appear here automatically.
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
                  className="flex items-center justify-between p-4  m-2 bg-card border rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                  onClick={() => setSelectedService(item)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {customerInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="font-semibold text-base mr-2 flex items-center gap-2">
                        {item.service.name}
                        {item.package && (
                          <Badge
                            variant="secondary"
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200 text-[10px] h-5 px-1.5"
                          >
                            {item.package.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground/80">
                          {item.booking.customer.name}
                        </span>
                        <span className="text-xs text-muted-foreground/30 hidden md:inline">
                          •
                        </span>
                        <span className="flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded-md">
                          <ClockIcon className="w-3 h-3" />
                          {item.scheduled_at
                            ? formatPH(item.scheduled_at, "h:mm a")
                            : "Unscheduled"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-base">
                      ₱{item.price.toLocaleString()}
                    </span>
                    {item.service.duration && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {item.service.duration}m
                      </span>
                    )}
                    {/* Badge can be removed or simplified for mobile */}
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
