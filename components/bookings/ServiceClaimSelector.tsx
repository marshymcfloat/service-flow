"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ServiceItem {
  id: number;
  uniqueId: string; // Added for distinguishing multiple instances
  name: string;
  price: number;
  duration: number | null;
  quantity: number;
}

interface ServiceClaimSelectorProps {
  services: ServiceItem[];
  claimedUniqueIds: string[]; // Changed from claimedServiceIds number[]
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
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isChecked
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <Checkbox
                id={`claim-${service.uniqueId}`}
                checked={isChecked}
                onCheckedChange={(checked) =>
                  handleToggle(service.uniqueId, checked === true)
                }
              />
              <Label
                htmlFor={`claim-${service.uniqueId}`}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">
                      {service.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        #{index + 1}
                      </span>
                    </span>
                    {/* Quantity hidden since we list individually, or we explicitly show it's 1 of N */}
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-muted-foreground">
                      {service.duration || 30} min
                    </div>
                    <div className="font-medium">
                      ₱{service.price.toLocaleString()}
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
