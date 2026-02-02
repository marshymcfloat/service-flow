import { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "../ui/button";
import { Minus, Plus, X, Package, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "../ui/badge";

export default function SelectedServiceList({
  form,
}: {
  form: UseFormReturn<any>;
}) {
  const selectedServices = (form.watch("services") as any[]) || [];

  if (!selectedServices || selectedServices.length === 0) {
    return null;
  }

  const updateQuantity = (
    serviceId: number,
    delta: number,
    packageId?: number,
  ) => {
    const newServices = selectedServices.map((s) => {
      if (s.id === serviceId && s.packageId === packageId) {
        const newQuantity = (s.quantity || 1) + delta;
        return { ...s, quantity: Math.max(1, newQuantity) };
      }
      return s;
    });
    form.setValue("services", newServices);
  };

  const removeService = (serviceId: number, packageId?: number) => {
    let newServices;
    if (packageId) {
      newServices = selectedServices.filter((s) => s.packageId !== packageId);
    } else {
      newServices = selectedServices.filter(
        (s) => !(s.id === serviceId && !s.packageId),
      );
    }
    form.setValue("services", newServices);
  };

  const totalPrice = selectedServices.reduce(
    (sum, s) => sum + s.price * (s.quantity || 1),
    0,
  );

  const groupedServices = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    const standalone: any[] = [];

    selectedServices.forEach((service) => {
      if (service.packageId) {
        if (!groups[service.packageId]) {
          groups[service.packageId] = [];
        }
        groups[service.packageId].push(service);
      } else {
        standalone.push(service);
      }
    });

    return { groups, standalone };
  }, [selectedServices]);

  return (
    <div className="mt-4 rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium">Selected Services</h3>
      <div className="flex flex-col gap-2">
        {Object.entries(groupedServices.groups).map(([pkgId, services]) => {
          const packageName = services[0]?.packageName || "Package";
          const pkgPrice = services.reduce(
            (sum, s) => sum + s.price * (s.quantity || 1),
            0,
          );

          return (
            <div
              key={`pkg-${pkgId}`}
              className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2 relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 pl-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-primary">
                    {packageName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    ₱{pkgPrice.toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeService(services[0].id, Number(pkgId))}
                    type="button"
                    title="Remove Package"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="pl-2 space-y-1">
                {services.map((service, idx) => (
                  <div
                    key={`${service.id}-${service.packageId}-${idx}`}
                    className="flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span>
                      {service.quantity > 1 ? `${service.quantity}x ` : ""}
                      {service.name}
                    </span>
                    <span>₱{service.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {groupedServices.standalone.map((service) => (
          <div
            key={`standalone-${service.id}`}
            className="flex items-center justify-between rounded-md border p-2 relative overflow-hidden"
          >
            {/* Flow Trigger Indicator */}
            {(service as any).flow_triggers &&
              (service as any).flow_triggers.length > 0 && (
                <div className="absolute top-0 right-0 p-1 opacity-10 pointer-events-none">
                  <Sparkles className="w-12 h-12 text-indigo-500" />
                </div>
              )}

            <div className="flex items-center gap-2 relative z-10">
              <div className="flex flex-col">
                <span className="font-medium text-sm flex items-center gap-2">
                  {service.name}
                  {(service as any).flow_triggers &&
                    (service as any).flow_triggers.length > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 bg-indigo-50 text-indigo-700 border-indigo-200"
                      >
                        <Sparkles className="w-2 h-2 mr-1" />
                        Journey Starter
                      </Badge>
                    )}
                </span>
                <span className="text-xs text-muted-foreground">
                  ₱{service.price.toFixed(2)}
                </span>
                {/* Show flow details if available */}
                {(service as any).flow_triggers &&
                  (service as any).flow_triggers.length > 0 && (
                    <div className="text-[10px] text-indigo-600 flex items-center gap-1 mt-0.5">
                      <ArrowRight className="w-3 h-3" />
                      <span>
                        Leads to{" "}
                        {(service as any).flow_triggers[0].suggested_service
                          ?.name || "Next Step"}
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
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
                ₱{(service.price * (service.quantity || 1)).toFixed(2)}
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
        <span>₱{totalPrice.toFixed(2)}</span>
      </div>
    </div>
  );
}
