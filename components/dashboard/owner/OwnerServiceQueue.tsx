"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatPH } from "@/lib/date-utils";
import { AvailedServiceStatus } from "@/prisma/generated/prisma/client";
import {
  CheckCircle2,
  Clock,
  Inbox,
  RefreshCcw,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  claimServiceAsOwnerAction,
  getOwnerClaimedServicesAction,
  getPendingServicesAction,
  markServiceServedAsOwnerAction,
  unclaimServiceAsOwnerAction,
  unserveServiceAsOwnerAction,
} from "@/lib/server actions/dashboard";

export type OwnerPendingService = {
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
};

export type OwnerClaimedService = OwnerPendingService & {
  claimed_at: Date | null;
  status: AvailedServiceStatus;
};

type OwnerClaimedResponse =
  | { success: true; data: OwnerClaimedService[] }
  | { success: false; error: string };

/**
 * Usage:
 * <OwnerServiceQueue
 *   businessSlug="my-biz"
 *   pendingServices={pendingServices}
 *   claimedServices={claimedServices}
 * />
 */
export default function OwnerServiceQueue({
  businessSlug,
  pendingServices: initialPending,
  claimedServices: initialClaimed,
  className,
}: {
  businessSlug: string;
  pendingServices: OwnerPendingService[];
  claimedServices: OwnerClaimedService[];
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "claimed">("pending");
  const [actionState, setActionState] = useState<{
    id: number | null;
    type: "claim" | "serve" | "unclaim" | "unserve" | null;
  }>({ id: null, type: null });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pendingKey = ["owner-pending-services", businessSlug];
  const claimedKey = ["owner-claimed-services", businessSlug];

  const { data: pendingServices = [] } = useQuery({
    queryKey: pendingKey,
    queryFn: () => getPendingServicesAction(),
    initialData: initialPending,
    refetchInterval: 5000,
  });

  const { data: claimedResponse } = useQuery<OwnerClaimedResponse | any>({
    queryKey: claimedKey,
    queryFn: () => getOwnerClaimedServicesAction(),
    initialData: { success: true, data: initialClaimed },
    refetchInterval: 5000,
  });

  const claimedServices = useMemo(() => {
    if (
      claimedResponse &&
      typeof claimedResponse === "object" &&
      "success" in claimedResponse &&
      "data" in claimedResponse &&
      claimedResponse.success
    ) {
      return claimedResponse.data as OwnerClaimedService[];
    }
    return [];
  }, [claimedResponse]);

  const setAction = (id: number, type: typeof actionState.type) =>
    setActionState({ id, type });

  const clearAction = () => setActionState({ id: null, type: null });

  const getPendingCache = () =>
    queryClient.getQueryData<OwnerPendingService[]>(pendingKey) ??
    pendingServices;

  const getClaimedCache = () => {
    const cached = queryClient.getQueryData<OwnerClaimedResponse>(claimedKey);
    if (cached && cached.success) return cached.data;
    return claimedServices;
  };

  const setPendingCache = (items: OwnerPendingService[]) => {
    queryClient.setQueryData(pendingKey, items);
  };

  const setClaimedCache = (items: OwnerClaimedService[]) => {
    queryClient.setQueryData(claimedKey, { success: true, data: items });
  };

  const refreshLists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: pendingKey,
      }),
      queryClient.invalidateQueries({
        queryKey: claimedKey,
      }),
    ]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshLists();
    setIsRefreshing(false);
  };

  const handleClaim = async (serviceId: number) => {
    const previousPending = getPendingCache();
    const previousClaimed = getClaimedCache();
    const target = previousPending.find((item) => item.id === serviceId);

    setAction(serviceId, "claim");
    if (target) {
      const optimisticClaim: OwnerClaimedService = {
        ...target,
        claimed_at: new Date(),
        status: "CLAIMED",
      };
      setPendingCache(previousPending.filter((item) => item.id !== serviceId));
      setClaimedCache([optimisticClaim, ...previousClaimed]);
      setActiveTab("claimed");
    }

    const result = await claimServiceAsOwnerAction(serviceId);
    clearAction();

    if (result.success) {
      toast.success("Service claimed");
      await refreshLists();
    } else {
      setPendingCache(previousPending);
      setClaimedCache(previousClaimed);
      toast.error(result.error || "Unable to claim service");
    }
  };

  const handleUnclaim = async (serviceId: number) => {
    const previousPending = getPendingCache();
    const previousClaimed = getClaimedCache();
    const target = previousClaimed.find((item) => item.id === serviceId);

    setAction(serviceId, "unclaim");
    if (target) {
      const { claimed_at, status, ...pendingItem } = target;
      setClaimedCache(previousClaimed.filter((item) => item.id !== serviceId));
      setPendingCache([pendingItem, ...previousPending]);
    }

    const result = await unclaimServiceAsOwnerAction(serviceId);
    clearAction();

    if (result.success) {
      toast.success("Service returned to queue");
      await refreshLists();
    } else {
      setPendingCache(previousPending);
      setClaimedCache(previousClaimed);
      toast.error(result.error || "Unable to unclaim service");
    }
  };

  const handleServe = async (serviceId: number) => {
    const previousClaimed = getClaimedCache();

    setAction(serviceId, "serve");
    setClaimedCache(previousClaimed.filter((item) => item.id !== serviceId));

    const result = await markServiceServedAsOwnerAction(serviceId);
    clearAction();

    if (result.success) {
      toast.success("Service marked as served");
      await refreshLists();
    } else {
      setClaimedCache(previousClaimed);
      toast.error(result.error || "Unable to mark service as served");
    }
  };

  const handleUnserve = async (serviceId: number) => {
    const previousClaimed = getClaimedCache();
    const target = previousClaimed.find((item) => item.id === serviceId);

    setAction(serviceId, "unserve");
    if (target) {
      setClaimedCache(
        previousClaimed.map((item) =>
          item.id === serviceId ? { ...item, status: "CLAIMED" } : item,
        ),
      );
    }

    const result = await unserveServiceAsOwnerAction(serviceId);
    clearAction();

    if (result.success) {
      toast.success("Service moved back to claimed");
      await refreshLists();
    } else {
      setClaimedCache(previousClaimed);
      toast.error(result.error || "Unable to revert service");
    }
  };

  const renderTime = (date: Date | null) =>
    date ? formatPH(date, "h:mm a") : "Walk-in";

  return (
    <Card
      className={cn(
        "rounded-[32px] border-none shadow-lg shadow-zinc-200/50 bg-white flex flex-col overflow-hidden h-full",
        className,
      )}
    >
      <CardHeader className="md:px-8 md:pt-8 pb-0">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900">
              Owner Queue
            </CardTitle>
            <CardDescription className="text-base text-zinc-500 font-medium">
              Claim and serve customers as the owner.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="w-full sm:w-auto rounded-2xl h-11 border-zinc-200 bg-zinc-50 font-medium"
            disabled={isRefreshing}
          >
            <RefreshCcw
              className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-2 md:px-6 py-6 flex-1 min-h-[300px] overflow-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full grid grid-cols-2 rounded-2xl bg-zinc-50 border border-zinc-100 p-1 shadow-sm h-12 overflow-hidden items-stretch">
            <TabsTrigger
              value="pending"
              className="rounded-xl h-full py-0 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              Pending
              <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                {pendingServices.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="claimed"
              className="rounded-xl h-full py-0 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              My Claims
              <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                {claimedServices.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 border-2 border-dashed border-zinc-100 rounded-2xl bg-white">
                <div className="h-12 w-12 rounded-full bg-zinc-50 text-zinc-300 flex items-center justify-center">
                  <Inbox className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-zinc-900">
                  No pending services
                </p>
                <p className="text-xs text-zinc-500 max-w-[240px]">
                  The queue is clear for now. New bookings will appear here.
                </p>
              </div>
            ) : (
              pendingServices.map((item) => {
                const isBusy =
                  actionState.id === item.id && actionState.type === "claim";
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-zinc-900">
                            {item.service.name}
                          </h4>
                          {item.package && (
                            <Badge
                              variant="secondary"
                              className="bg-zinc-100 text-zinc-700 border border-zinc-200 text-[9px] font-semibold h-4 px-1"
                            >
                              {item.package.name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">
                          {item.booking.customer.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-400">
                          <span className="flex items-center gap-1 bg-zinc-50 text-zinc-600 px-2 py-0.5 rounded-md">
                            <Clock className="h-3 w-3" />
                            {renderTime(item.scheduled_at)}
                          </span>
                          {item.service.duration && (
                            <span>{item.service.duration} mins</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-bold text-zinc-900 bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-100">
                          â‚±{item.price.toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          className="h-11 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200"
                          onClick={() => handleClaim(item.id)}
                          disabled={isBusy}
                        >
                          {isBusy ? "Claiming..." : "Claim"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="claimed" className="mt-4 space-y-3">
            {claimedServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/60">
                <div className="h-12 w-12 rounded-full bg-white text-zinc-300 flex items-center justify-center">
                  <UserCheck className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-zinc-900">
                  No claimed services
                </p>
                <p className="text-xs text-zinc-500 max-w-[240px]">
                  Claim a pending service to track it here.
                </p>
              </div>
            ) : (
              claimedServices.map((item) => {
                const isServing =
                  actionState.id === item.id && actionState.type === "serve";
                const isUnclaiming =
                  actionState.id === item.id && actionState.type === "unclaim";
                const isUnserving =
                  actionState.id === item.id && actionState.type === "unserve";
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-zinc-900">
                            {item.service.name}
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0.5 rounded-md border-emerald-200 text-emerald-700 bg-emerald-50"
                          >
                            {item.status}
                          </Badge>
                          {item.package && (
                            <Badge
                              variant="secondary"
                              className="bg-zinc-100 text-zinc-700 border border-zinc-200 text-[9px] font-semibold h-4 px-1"
                            >
                              {item.package.name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">
                          {item.booking.customer.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-400">
                          <span className="flex items-center gap-1 bg-zinc-50 text-zinc-600 px-2 py-0.5 rounded-md">
                            <Clock className="h-3 w-3" />
                            {renderTime(item.scheduled_at)}
                          </span>
                          {item.claimed_at && (
                            <span className="text-zinc-400">
                              Claimed {formatPH(item.claimed_at, "h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-bold text-zinc-900 bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-100">
                          â‚±{item.price.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="h-11 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200"
                            onClick={() => handleServe(item.id)}
                            disabled={isServing}
                          >
                            {isServing ? "Saving..." : "Mark Served"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-11 min-h-[44px] rounded-xl border-zinc-200 text-zinc-600 hover:text-zinc-900"
                            onClick={() =>
                              item.status === "CLAIMED"
                                ? handleUnclaim(item.id)
                                : handleUnserve(item.id)
                            }
                            disabled={isUnclaiming || isUnserving}
                          >
                            {item.status === "CLAIMED" ? (
                              <>
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                {isUnclaiming ? "Releasing..." : "Unclaim"}
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                {isUnserving ? "Reverting..." : "Undo Serve"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
