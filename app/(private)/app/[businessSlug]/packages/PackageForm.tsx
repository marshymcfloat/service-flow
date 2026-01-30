"use client";

import { useState, useEffect, useMemo } from "react";
import { Service, ServicePackage } from "@/prisma/generated/prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createPackageAction,
  updatePackageAction,
} from "@/lib/server actions/packages";
import { Clock, PhilippinePeso, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type ServicePackageWithServices = ServicePackage & {
  services: Service[];
};

interface PackageFormProps {
  services: Service[];
  categories: string[];
  businessSlug: string;
  initialData?: ServicePackageWithServices;
  onSuccess: () => void;
}

export function PackageForm({
  services,
  categories,
  businessSlug,
  initialData,
  onSuccess,
}: PackageFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price.toString() || "",
    category: initialData?.category || "",
  });

  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(
    initialData?.services.map((s) => s.id) || [],
  );

  const [serviceSearch, setServiceSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const selectedServices = useMemo(() => {
    return services.filter((s) => selectedServiceIds.includes(s.id));
  }, [services, selectedServiceIds]);

  const filteredServices = useMemo(() => {
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.category.toLowerCase().includes(serviceSearch.toLowerCase()),
    );
  }, [services, serviceSearch]);

  const totalValue = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + (s.duration || 0),
    0,
  );

  const discountAmount =
    formData.price && !isNaN(parseFloat(formData.price))
      ? totalValue - parseFloat(formData.price)
      : 0;

  const discountPercentage =
    totalValue > 0 ? Math.round((discountAmount / totalValue) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Please fill in required fields");
      return;
    }

    if (selectedServiceIds.length === 0) {
      toast.error("Please select at least one service");
      return;
    }

    setIsLoading(true);

    const price = parseFloat(formData.price);
    const category = newCategory || formData.category;

    try {
      let result;

      if (initialData) {
        result = await updatePackageAction(initialData.id, {
          name: formData.name,
          description: formData.description || undefined,
          price,
          duration: totalDuration,
          category,
          serviceIds: selectedServiceIds,
        });
      } else {
        result = await createPackageAction({
          name: formData.name,
          description: formData.description || undefined,
          price,
          duration: totalDuration,
          category,
          businessSlug,
          serviceIds: selectedServiceIds,
        });
      }

      if (result.success) {
        toast.success(
          `Package ${initialData ? "updated" : "created"} successfully`,
        );
        onSuccess();
      } else {
        toast.error(result.error || "Failed to save package");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleService = (serviceId: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-[600px] md:h-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto px-1">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Package Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Summer Spa Special"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what's included..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => {
                if (value === "new") {
                  setFormData({ ...formData, category: "new" });
                } else {
                  setFormData({ ...formData, category: value });
                  setNewCategory("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Create New Category</SelectItem>
              </SelectContent>
            </Select>
            {(formData.category === "new" || categories.length === 0) && (
              <Input
                placeholder="Enter new category name"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setFormData({ ...formData, category: "new" });
                }}
                className="mt-2"
              />
            )}
          </div>

          <div className="p-4 bg-zinc-50 rounded-lg border space-y-3">
            <Label htmlFor="price">Pricing</Label>
            <div className="space-y-2">
              <div className="relative">
                <PhilippinePeso className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  className="pl-9 bg-white"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              {totalValue > 0 && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Service Value:</span>
                    <span className="font-medium text-foreground">
                      ₱{totalValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Discount:</span>
                    {discountAmount > 0 ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                      >
                        Save ₱{discountAmount.toLocaleString()} (
                        {discountPercentage}%)
                      </Badge>
                    ) : (
                      <span className="text-amber-600 font-medium">None</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col h-[400px] md:h-full border rounded-lg overflow-hidden bg-zinc-50/50">
          <div className="p-3 border-b bg-white space-y-2">
            <div className="flex justify-between items-center">
              <Label>Included Services</Label>
              <span className="text-xs text-muted-foreground font-medium">
                {selectedServices.length} selected
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                className="h-8 pl-8 text-xs bg-zinc-50"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 bg-white max-h-[50vh]">
            <div className="divide-y">
              {filteredServices.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No services found
                </div>
              ) : (
                filteredServices.map((service) => {
                  const isSelected = selectedServiceIds.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      className={cn(
                        "flex items-start space-x-3 p-3 transition-colors cursor-pointer hover:bg-zinc-50",
                        isSelected && "bg-primary/5 hover:bg-primary/10",
                      )}
                      onClick={() => toggleService(service.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleService(service.id)}
                        id={`service-${service.id}`}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <Label
                            htmlFor={`service-${service.id}`}
                            className="text-sm font-medium cursor-pointer leading-none"
                          >
                            {service.name}
                          </Label>
                          <span className="text-xs font-medium tabular-nums">
                            ₱{service.price}
                          </span>
                        </div>
                        <div className="flex items-center text-[10px] text-muted-foreground gap-2">
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
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-white flex justify-between items-center text-xs text-muted-foreground">
            <span>Total Duration:</span>
            <span className="font-medium text-foreground">
              {totalDuration} mins
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 mt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Saving..."
            : initialData
              ? "Update Package"
              : "Create Package"}
        </Button>
      </div>
    </form>
  );
}
