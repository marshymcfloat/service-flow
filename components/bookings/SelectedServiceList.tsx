import React from "react";
import { Badge } from "../ui/badge";
import { UseFormReturn } from "react-hook-form";
import { CreateBookingTypes } from "@/lib/zod schemas/bookings";
import { Button } from "../ui/button";
import { Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SelectedServiceList({
  form,
}: {
  form: UseFormReturn<any>;
}) {
  const selectedServices = (form.watch("services") as any[]) || [];

  if (!selectedServices || selectedServices.length === 0) {
    return null;
  }

  const updateQuantity = (serviceId: number, delta: number) => {
    const newServices = selectedServices.map((s) => {
      if (s.id === serviceId) {
        const newQuantity = (s.quantity || 1) + delta;
        return { ...s, quantity: Math.max(1, newQuantity) };
      }
      return s;
    });
    form.setValue("services", newServices);
  };

  const removeService = (serviceId: number) => {
    const newServices = selectedServices.filter((s) => s.id !== serviceId);
    form.setValue("services", newServices);
  };

  const totalPrice = selectedServices.reduce(
    (sum, s) => sum + s.price * (s.quantity || 1),
    0,
  );

  return (
    <div className="mt-4 rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium">Selected Services</h3>
      <div className="flex flex-col gap-2">
        {selectedServices.map((service) => (
          <div
            key={service.id}
            className="flex items-center justify-between rounded-md border p-2"
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="font-medium text-sm">{service.name}</span>
                <span className="text-xs text-muted-foreground">
                  ${service.price.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => updateQuantity(service.id, -1)}
                  type="button"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-4 text-center text-sm font-medium">
                  {service.quantity || 1}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => updateQuantity(service.id, 1)}
                  type="button"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="text-sm font-medium w-16 text-right">
                ${(service.price * (service.quantity || 1)).toFixed(2)}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => removeService(service.id)}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between border-t pt-2 font-medium">
        <span>Total</span>
        <span>${totalPrice.toFixed(2)}</span>
      </div>
    </div>
  );
}
