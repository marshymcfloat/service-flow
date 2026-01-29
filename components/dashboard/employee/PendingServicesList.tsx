"use client";

import { formatPH } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Inbox, Clock as ClockIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="h-full lg:max-h-[500px] border-zinc-50 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden rounded-[30px] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Available to Serve
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {services.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-3 opacity-60">
                <div className="bg-muted p-4 rounded-full">
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
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/40 hover:border-primary/20 transition-all cursor-pointer group bg-card"
                    onClick={() => setSelectedService(item)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {customerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="font-semibold">{item.service.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{item.booking.customer.name}</span>
                          <span className="text-xs text-muted-foreground/50">
                            •
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            <ClockIcon className="w-3 h-3" />
                            {item.scheduled_at
                              ? formatPH(item.scheduled_at, "h:mm a")
                              : "Unscheduled"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-sm">
                          ₱{item.price.toLocaleString()}
                        </div>
                        {item.service.duration && (
                          <div className="text-xs text-muted-foreground">
                            {item.service.duration} min
                          </div>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-yellow-50 text-yellow-700 border-yellow-200 group-hover:bg-yellow-100 transition-colors"
                      >
                        Pending
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

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
