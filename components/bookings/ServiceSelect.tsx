import * as React from "react";
import { Check, ChevronsUpDown, Package as PackageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
  Service,
  ServicePackage,
  PackageItem,
} from "@/prisma/generated/prisma/client";
import { UseFormReturn } from "react-hook-form";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import { Badge } from "../ui/badge";

type PackageWithItems = ServicePackage & {
  items: (PackageItem & { service: Service })[];
};

const ServiceSelect = React.memo(function ServiceSelect({
  services,
  packages = [],
  categories,
  form,
}: {
  services: Service[];
  packages?: PackageWithItems[];
  categories: string[];
  form: UseFormReturn<any>;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"services" | "packages">(
    "services",
  );

  const selectedServices = (form.watch("services") as any[]) || [];

  const filteredServices =
    selectedCategory === "all"
      ? services
      : services.filter((s) => s.category === selectedCategory);

  const toggleService = (service: Service) => {
    const isSelected = selectedServices.some(
      (s) => s.id === service.id && !s.packageId,
    );
    let newServices;
    if (isSelected) {
      newServices = selectedServices.filter(
        (s) => s.id !== service.id || s.packageId,
      );
    } else {
      newServices = [...selectedServices, { ...service, quantity: 1 }];
    }
    form.setValue("services", newServices);
  };

  const togglePackage = (pkg: PackageWithItems) => {
    const packageServices = pkg.items;
    const isPackageSelected = packageServices.every((item) =>
      selectedServices.some(
        (s) => s.id === item.service.id && s.packageId === pkg.id,
      ),
    );

    let newServices = [...selectedServices];

    if (isPackageSelected) {
      newServices = newServices.filter((s) => s.packageId !== pkg.id);
    } else {
      pkg.items.forEach((item) => {
        newServices.push({
          ...item.service,
          price: item.custom_price,
          originalPrice: item.service.price,
          quantity: 1,
          packageId: pkg.id,
          packageName: pkg.name,
        });
      });
    }

    form.setValue("services", newServices);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedServices.length > 0
            ? `${selectedServices.length} service${
                selectedServices.length > 1 ? "s" : ""
              } selected`
            : "Select services or packages..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <div className="flex p-2 gap-2 border-b">
          <Button
            size="sm"
            variant={viewMode === "services" ? "default" : "secondary"}
            onClick={() => setViewMode("services")}
            className="flex-1"
          >
            Services
          </Button>
          <Button
            size="sm"
            variant={viewMode === "packages" ? "default" : "secondary"}
            onClick={() => setViewMode("packages")}
            className="flex-1"
          >
            Packages
          </Button>
        </div>

        {viewMode === "services" && (
          <div className="flex gap-1 p-2 border-b overflow-x-auto">
            <Button
              type="button"
              variant={selectedCategory === "all" ? "default" : "ghost"}
              size="sm"
              className="text-xs shrink-0"
              onClick={() => setSelectedCategory("all")}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                type="button"
                variant={selectedCategory === category ? "default" : "ghost"}
                size="sm"
                className="text-xs shrink-0 capitalize"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        <Command>
          <CommandInput
            placeholder={
              viewMode === "services"
                ? "Search service..."
                : "Search package..."
            }
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {viewMode === "services"
                ? filteredServices.map((service) => {
                    const isSelected = selectedServices.some(
                      (s) => s.id === service.id && !s.packageId,
                    );
                    return (
                      <CommandItem
                        key={service.id}
                        value={service.name}
                        onSelect={() => toggleService(service)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{service.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {service.category}
                          </span>
                        </div>
                        <span className="ml-auto text-muted-foreground text-xs">
                          ₱{service.price.toFixed(2)}
                        </span>
                      </CommandItem>
                    );
                  })
                : packages.map((pkg) => {
                    const isSelected = pkg.items.every((item) =>
                      selectedServices.some(
                        (s) =>
                          s.id === item.service.id && s.packageId === pkg.id,
                      ),
                    );
                    return (
                      <CommandItem
                        key={pkg.id}
                        value={pkg.name}
                        onSelect={() => togglePackage(pkg)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2">
                            <PackageIcon className="h-3 w-3 text-primary" />
                            <span>{pkg.name}</span>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-1">
                            {pkg.items.slice(0, 2).map((item) => (
                              <Badge
                                key={item.service_id}
                                variant="secondary"
                                className="text-[10px] px-1 py-0 h-4 font-normal"
                              >
                                {item.service.name}
                              </Badge>
                            ))}
                            {pkg.items.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{pkg.items.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-auto flex flex-col items-end">
                          <span className="font-medium text-xs">
                            ₱{pkg.price.toLocaleString()}
                          </span>
                          {(() => {
                            const original = pkg.items.reduce(
                              (sum, item) => sum + item.service.price,
                              0,
                            );
                            if (original > pkg.price) {
                              return (
                                <span className="text-[10px] text-muted-foreground line-through">
                                  ₱{original.toLocaleString()}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </CommandItem>
                    );
                  })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

export default ServiceSelect;
