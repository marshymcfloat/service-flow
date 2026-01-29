"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPH } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  markServiceServedAction,
  unclaimServiceAction,
  unserveServiceAction,
} from "@/lib/server actions/dashboard";
import { useState } from "react";
import {
  Loader2,
  History,
  CheckCircle2,
  User,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ServedService {
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
  status: string;
}

export default function EmployeeServedHistory({
  services,
  currentEmployeeId,
  currentEmployeeCommission,
}: {
  services: ServedService[];
  currentEmployeeId: number;
  currentEmployeeCommission: number;
}) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<ServedService | null>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<{
    type: "unclaim" | "unserve";
    serviceId: number;
  } | null>(null);

  const handleMarkAsServed = async (serviceId: number) => {
    setLoadingId(serviceId);
    try {
      const result = await markServiceServedAction(
        serviceId,
        currentEmployeeId,
      );
      if (!result.success) {
        alert(result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setLoadingId(null);
    }
  };

  const requestUnclaim = (serviceId: number) => {
    setPendingAction({ type: "unclaim", serviceId });
  };

  const executeUnclaim = async (serviceId: number) => {
    setLoadingId(serviceId);
    try {
      const result = await unclaimServiceAction(serviceId);
      if (!result.success) {
        alert(result.error);
      } else {
        setSelectedService(null);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setLoadingId(null);
      setPendingAction(null);
    }
  };

  const requestUnserve = (serviceId: number) => {
    setPendingAction({ type: "unserve", serviceId });
  };

  const executeUnserve = async (serviceId: number) => {
    setLoadingId(serviceId);
    try {
      const result = await unserveServiceAction(serviceId);
      if (!result.success) {
        alert(result.error);
      } else {
        setSelectedService(null);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setLoadingId(null);
      setPendingAction(null);
    }
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "unclaim") {
      executeUnclaim(pendingAction.serviceId);
    } else if (pendingAction.type === "unserve") {
      executeUnserve(pendingAction.serviceId);
    }
  };

  return (
    <>
      <Card className="h-full lg:max-h-[500px] overflow-y-auto border-zinc-50 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden rounded-[30px] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            My Served History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {services.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-3 opacity-60">
                <div className="bg-muted p-4 rounded-full">
                  <History className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">No served history</h3>
                  <p className="text-sm text-muted-foreground">
                    Completed services will appear here.
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
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/40 transition-colors bg-card cursor-pointer group"
                    onClick={() => setSelectedService(item)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-primary/5 text-primary/80 font-medium">
                          {customerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="font-semibold flex items-center gap-2">
                          {item.service.name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {item.booking.customer.name}
                          </span>
                          <span className="text-xs text-muted-foreground/50">
                            •
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            <Calendar className="w-3 h-3" />
                            {item.scheduled_at
                              ? formatPH(item.scheduled_at, "MMM d, h:mm a")
                              : "Unscheduled"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="font-bold text-sm">
                        ₱{item.price.toLocaleString()}
                      </div>
                      {item.status === "CLAIMED" ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestUnclaim(item.id);
                            }}
                            disabled={loadingId === item.id}
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsServed(item.id);
                            }}
                            disabled={loadingId === item.id}
                            className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                          >
                            {loadingId === item.id ? (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-1.5 h-3 w-3" />
                            )}
                            Mark Served
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          {item.status}
                        </Badge>
                      )}
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
            <DialogTitle>Service Details</DialogTitle>
            <DialogDescription>
              Full information about this service
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-12 w-12 border">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                    {selectedService.booking.customer.name
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedService.service.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedService.booking.customer.name}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    Price
                  </p>
                  <p className="text-lg font-bold">
                    ₱{selectedService.price.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-50/50 rounded-lg space-y-1 border border-green-100">
                  <p className="text-xs text-green-700 font-medium uppercase">
                    Commission ({currentEmployeeCommission}%)
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    ₱
                    {(
                      (selectedService.price * currentEmployeeCommission) /
                      100
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-dashed">
                  <span className="text-muted-foreground">Scheduled For</span>
                  <span className="font-medium">
                    {selectedService.scheduled_at
                      ? formatPH(selectedService.scheduled_at, "PPP p")
                      : "Unscheduled"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {selectedService.service.duration || "-"} min
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-dashed">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{selectedService.status}</Badge>
                </div>
              </div>

              {selectedService.status === "CLAIMED" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => requestUnclaim(selectedService.id)}
                    disabled={loadingId === selectedService.id}
                  >
                    {loadingId === selectedService.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Unclaim
                  </Button>
                  <Button
                    className="flex-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      handleMarkAsServed(selectedService.id);
                      setSelectedService(null);
                    }}
                    disabled={loadingId === selectedService.id}
                  >
                    {loadingId === selectedService.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Mark as Served
                  </Button>
                </div>
              )}
              {selectedService.status === "COMPLETED" && (
                <Button
                  variant="outline"
                  className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={() => requestUnserve(selectedService.id)}
                  disabled={loadingId === selectedService.id}
                >
                  {loadingId === selectedService.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Undo (Unserve)
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "unclaim"
                ? "Unclaim this service?"
                : "Undo this service?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "unclaim"
                ? "This service will go back to the pending list and can be claimed by anyone."
                : "This will revert the service status and remove the commission."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={
                pendingAction?.type === "unclaim"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {pendingAction?.type === "unclaim" ? "Unclaim" : "Undo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
