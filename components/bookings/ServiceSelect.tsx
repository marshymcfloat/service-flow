import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Service } from "@/prisma/generated/prisma/client";
import { UseFormReturn } from "react-hook-form";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";

export default function ServiceSelect({
  services,
  categories,
  form,
}: {
  services: Service[];
  categories: string[];
  form: UseFormReturn<any>;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const selectedServices = (form.watch("services") as any[]) || [];

  const filteredServices =
    selectedCategory === "all"
      ? services
      : services.filter((s) => s.category === selectedCategory);

  const toggleService = (service: Service) => {
    const isSelected = selectedServices.some((s) => s.id === service.id);
    let newServices;
    if (isSelected) {
      newServices = selectedServices.filter((s) => s.id !== service.id);
    } else {
      newServices = [...selectedServices, { ...service, quantity: 1 }];
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
            : "Select services..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
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

        <Command>
          <CommandInput placeholder="Search service..." />
          <CommandList>
            <CommandEmpty>No service found.</CommandEmpty>
            <CommandGroup>
              {filteredServices.map((service) => {
                const isSelected = selectedServices.some(
                  (s) => s.id === service.id,
                );
                return (
                  <CommandItem
                    key={service.id}
                    value={service.name}
                    onSelect={() => {
                      toggleService(service);
                    }}
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
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
