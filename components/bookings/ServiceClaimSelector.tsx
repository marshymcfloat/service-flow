"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock3, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceItem {
  id: number;
  uniqueId: string;
  name: string;
  price: number;
  duration: number | null;
  quantity: number;
}

interface ServiceClaimSelectorProps {
  services: ServiceItem[];
  claimedUniqueIds: string[];
  onChange: (claimedIds: string[]) => void;
}

export default function ServiceClaimSelector({
  services,
  claimedUniqueIds,
  onChange,
}: ServiceClaimSelectorProps) {
  const totalServices = services.length;
  const claimedCount = claimedUniqueIds.length;
  const pendingCount = totalServices - claimedCount;

  const claimedSet = useMemo(() => new Set(claimedUniqueIds), [claimedUniqueIds]);

  const handleToggle = (uniqueId: string, checked: boolean) => {
    if (checked) {
      if (!claimedSet.has(uniqueId)) {
        onChange([...claimedUniqueIds, uniqueId]);
      }
      return;
    }

    onChange(claimedUniqueIds.filter((id) => id !== uniqueId));
  };

  const handleClaimAll = () => {
    onChange(services.map((service) => service.uniqueId));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-background to-emerald-500/5 p-2.5 sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-sm text-muted-foreground">
              Select the service units you will personally handle.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={claimedCount > 0 ? "default" : "secondary"}
                className="px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-[11px]"
              >
                {claimedCount} Claimed
              </Badge>
              <Badge
                variant="outline"
                className="px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-[11px]"
              >
                {pendingCount} Open
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClaimAll}
              disabled={totalServices === 0 || claimedCount === totalServices}
              className="h-10 min-w-[98px]"
            >
              <CheckCircle2 className="size-4" />
              Claim all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={claimedCount === 0}
              className="h-10 min-w-[80px]"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        {services.map((service, index) => {
          const isChecked = claimedSet.has(service.uniqueId);

          return (
            <div
              key={service.uniqueId}
              className={cn(
                "group rounded-xl border p-3 transition-all duration-200 sm:p-4",
                isChecked
                  ? "border-primary/45 bg-primary/[0.07] shadow-sm"
                  : "border-border/60 bg-card hover:border-border hover:bg-muted/30",
              )}
            >
              <div className="flex items-start gap-2.5 sm:gap-3">
                <Checkbox
                  id={`claim-${service.uniqueId}`}
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleToggle(service.uniqueId, checked === true)
                  }
                  className="mt-0.5 size-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor={`claim-${service.uniqueId}`}
                  className="flex-1 cursor-pointer select-none"
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="space-y-1.5">
                      <p
                        className={cn(
                          "text-sm font-semibold leading-tight",
                          isChecked ? "text-primary" : "text-foreground",
                        )}
                      >
                        {service.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span className="text-muted-foreground">Service Unit</span>
                        {isChecked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 font-medium text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="size-3.5" />
                            Claimed by you
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums">
                        {"\u20B1"}
                        {service.price.toLocaleString()}
                      </div>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        {service.duration || 30} min
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          );
        })}
      </div>

      <div
        aria-live="polite"
        className={cn(
          "rounded-lg border px-2.5 py-2 text-sm sm:px-3",
          claimedCount === 0
            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
            : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",
        )}
      >
        {claimedCount === 0
          ? "No services are claimed yet. This booking will be created with all services pending."
          : `${claimedCount} service ${claimedCount === 1 ? "unit is" : "units are"} claimed by you. ${pendingCount} ${pendingCount === 1 ? "unit remains" : "units remain"} open for other staff.`}
      </div>
    </div>
  );
}
