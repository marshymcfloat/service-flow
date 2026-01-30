import { memo } from "react";
import { Service } from "@/prisma/generated/prisma/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface ServiceItemProps {
  service: Service;
  isSelected: boolean;
  customPrice: number | undefined;
  onToggle: (service: Service) => void;
  onPriceUpdate: (serviceId: number, price: number) => void;
}

export const ServiceItem = memo(
  ({
    service,
    isSelected,
    customPrice,
    onToggle,
    onPriceUpdate,
  }: ServiceItemProps) => {
    return (
      <div
        className={cn(
          "flex flex-col space-y-2 p-3 transition-colors hover:bg-zinc-50",
          isSelected && "bg-primary/5 hover:bg-primary/10",
        )}
      >
        <div
          className="flex items-start space-x-3 cursor-pointer"
          onClick={() => onToggle(service)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggle(service)}
              id={`service-${service.id}`}
              className="mt-0.5"
            />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <Label
                htmlFor={`service-${service.id}`}
                className="text-sm font-medium cursor-pointer leading-none"
              >
                {service.name}
              </Label>
            </div>
            <div className="flex items-center text-[10px] text-muted-foreground gap-2 mt-1">
              <Badge
                variant="outline"
                className="text-[10px] py-0 h-4 border-zinc-200 text-zinc-500 font-normal"
              >
                {service.category}
              </Badge>
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {service.duration || 30}m
              </span>
            </div>
          </div>
        </div>

        {isSelected && (
          <div className="ml-7 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              Price in Pkg:
            </Label>
            <div className="relative flex-1 max-w-[120px]">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ₱
              </span>
              <Input
                type="number"
                className="h-7 text-xs pl-5"
                value={customPrice}
                onChange={(e) =>
                  onPriceUpdate(service.id, parseFloat(e.target.value) || 0)
                }
                onClick={(e) => e.stopPropagation()}
                min="0"
              />
            </div>
            {service.price !== customPrice && (
              <span className="text-[10px] text-muted-foreground line-through">
                ₱{service.price}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

ServiceItem.displayName = "ServiceItem";
