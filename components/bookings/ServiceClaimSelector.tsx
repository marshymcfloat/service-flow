"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  const handleToggle = (uniqueId: string, checked: boolean) => {
    if (checked) {
      onChange([...claimedUniqueIds, uniqueId]);
    } else {
      onChange(claimedUniqueIds.filter((id) => id !== uniqueId));
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground mb-2">
        Select which service(s) <strong>you will perform</strong>. Unclaimed
        services can be claimed by other staff later.
      </div>
      <div className="space-y-2">
        {services.map((service, index) => {
          const isChecked = claimedUniqueIds.includes(service.uniqueId);
          return (
            <div
              key={service.uniqueId}
              className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                isChecked
                  ? "border-primary/50 bg-primary/5 shadow-sm"
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              }`}
            >
              <Checkbox
                id={`claim-${service.uniqueId}`}
                checked={isChecked}
                onCheckedChange={(checked) =>
                  handleToggle(service.uniqueId, checked === true)
                }
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor={`claim-${service.uniqueId}`}
                className="flex-1 cursor-pointer select-none"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p
                      className={`font-medium text-sm ${isChecked ? "text-primary" : "text-foreground"}`}
                    >
                      {service.name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center size-5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span>Service Unit</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      ₱{service.price.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {service.duration || 30} min
                    </div>
                  </div>
                </div>
              </Label>
            </div>
          );
        })}
      </div>
      {claimedUniqueIds.length === 0 && (
        <p className="text-sm text-amber-600">
          You haven't claimed any services. The booking will be created with all
          services pending.
        </p>
      )}
    </div>
  );
}
