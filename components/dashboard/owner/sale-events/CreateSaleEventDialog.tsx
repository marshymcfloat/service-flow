"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { createSaleEvent } from "@/lib/server actions/sale-event";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DiscountType } from "@/prisma/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const saleEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  discountType: z.enum([DiscountType.PERCENTAGE, DiscountType.FLAT]),
  discountValue: z.coerce.number<number>().min(0, "Value must be positive"),
  serviceIds: z.array(z.number()),
  packageIds: z.array(z.number()),
});

type SaleEventFormValues = z.infer<typeof saleEventSchema>;

interface CreateSaleEventDialogProps {
  businessSlug: string;
  services: { id: number; name: string; category: string }[];
  packages: { id: number; name: string }[];
}

const initialStartDate = new Date().toISOString().slice(0, 16);
const initialEndDate = new Date(
  new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
)
  .toISOString()
  .slice(0, 16);

export function CreateSaleEventDialog({
  businessSlug,
  services,
  packages,
}: CreateSaleEventDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<SaleEventFormValues>({
    resolver: zodResolver(saleEventSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: initialStartDate,
      endDate: initialEndDate,
      discountType: "PERCENTAGE" as DiscountType,
      discountValue: 10,
      serviceIds: [],
      packageIds: [],
    },
  });

  // Group services by category
  const groupedServices = useMemo(() => {
    const groups: Record<string, typeof services> = {};
    services.forEach((service) => {
      const category = service.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(service);
    });
    return groups;
  }, [services]);

  const onSubmit = async (data: SaleEventFormValues) => {
    try {
      const result = await createSaleEvent({
        businessSlug,
        title: data.title,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        discountType: data.discountType,
        discountValue: data.discountValue,
        serviceIds: data.serviceIds,
        packageIds: data.packageIds,
      });

      if (result.success) {
        toast.success("Sale event created successfully");
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create sale event");
      }
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const selectedServiceIds =
    useWatch({ control: form.control, name: "serviceIds" }) ?? [];
  const selectedPackageIds =
    useWatch({ control: form.control, name: "packageIds" }) ?? [];

  // Helper functions for services
  const toggleService = (id: number) => {
    const current = form.getValues("serviceIds");
    if (current.includes(id)) {
      form.setValue(
        "serviceIds",
        current.filter((i) => i !== id),
      );
    } else {
      form.setValue("serviceIds", [...current, id]);
    }
  };

  const toggleCategory = (category: string) => {
    const categoryServiceIds = groupedServices[category].map((s) => s.id);
    const current = form.getValues("serviceIds");
    const allSelected = categoryServiceIds.every((id) => current.includes(id));

    if (allSelected) {
      // Deselect all in category
      form.setValue(
        "serviceIds",
        current.filter((id) => !categoryServiceIds.includes(id)),
      );
    } else {
      // Select all in category
      const uniqueIds = Array.from(
        new Set([...current, ...categoryServiceIds]),
      );
      form.setValue("serviceIds", uniqueIds);
    }
  };

  const toggleAllServices = () => {
    if (selectedServiceIds.length === services.length) {
      form.setValue("serviceIds", []);
    } else {
      form.setValue(
        "serviceIds",
        services.map((s) => s.id),
      );
    }
  };

  // Helper functions for packages
  const togglePackage = (id: number) => {
    const current = form.getValues("packageIds");
    if (current.includes(id)) {
      form.setValue(
        "packageIds",
        current.filter((i) => i !== id),
      );
    } else {
      form.setValue("packageIds", [...current, id]);
    }
  };

  const toggleAllPackages = () => {
    if (selectedPackageIds.length === packages.length) {
      form.setValue("packageIds", []);
    } else {
      form.setValue(
        "packageIds",
        packages.map((p) => p.id),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/10 active:scale-[0.98] transition-all font-medium">
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-zinc-900">
            Create Sale Event
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Configure a new promotional campaign.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col min-h-0"
          >
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-6 pt-2 space-y-8">
                {/* Basic Info Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                      1
                    </span>
                    Event Details
                  </h3>
                  <div className="grid gap-4 pl-4 sm:pl-8">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Summer Flash Sale"
                              className="focus-visible:ring-emerald-500"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Internal notes or details about the sale..."
                              className="resize-none h-20 focus-visible:ring-emerald-500"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                className="focus-visible:ring-emerald-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                className="focus-visible:ring-emerald-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Discount Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                      2
                    </span>
                    Discount Configuration
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 sm:pl-8">
                    <FormField
                      control={form.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="focus:ring-emerald-500">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PERCENTAGE">
                                Percentage (%)
                              </SelectItem>
                              <SelectItem value="FLAT">
                                Flat Amount (₱)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              className="focus-visible:ring-emerald-500"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Scope Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                        3
                      </span>
                      Applicable Items
                    </h3>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className="font-normal text-zinc-500"
                      >
                        {selectedServiceIds.length} Services
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-normal text-zinc-500"
                      >
                        {selectedPackageIds.length} Packages
                      </Badge>
                    </div>
                  </div>

                  <div className="pl-4 sm:pl-8 space-y-6">
                    {/* Services Grouped by Category */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                          Services
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={toggleAllServices}
                        >
                          {selectedServiceIds.length === services.length
                            ? "Deselect All"
                            : "Select All Services"}
                        </Button>
                      </div>

                      <div className="border rounded-xl divide-y overflow-hidden border-zinc-200">
                        {Object.entries(groupedServices).map(
                          ([category, categoryServices]) => {
                            const isCategoryFullySelected =
                              categoryServices.every((s) =>
                                selectedServiceIds.includes(s.id),
                              );
                            const isCategoryPartiallySelected =
                              categoryServices.some((s) =>
                                selectedServiceIds.includes(s.id),
                              ) && !isCategoryFullySelected;

                            return (
                              <div key={category} className="bg-zinc-50/50">
                                <div className="px-4 py-2 bg-zinc-100/80 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`cat-${category}`}
                                      checked={
                                        isCategoryFullySelected
                                          ? true
                                          : isCategoryPartiallySelected
                                            ? "indeterminate"
                                            : false
                                      }
                                      onCheckedChange={() =>
                                        toggleCategory(category)
                                      }
                                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 data-[state=indeterminate]:bg-emerald-600 data-[state=indeterminate]:border-emerald-600"
                                    />
                                    <label
                                      htmlFor={`cat-${category}`}
                                      className="text-sm font-semibold text-zinc-700 cursor-pointer select-none"
                                    >
                                      {category}
                                    </label>
                                  </div>
                                  <span className="text-xs text-zinc-500">
                                    {categoryServices.length} items
                                  </span>
                                </div>
                                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white">
                                  {categoryServices.map((service) => (
                                    <div
                                      key={service.id}
                                      className="flex items-start space-x-2 p-2 rounded-lg hover:bg-zinc-50 transition-colors"
                                    >
                                      <Checkbox
                                        id={`service-${service.id}`}
                                        checked={selectedServiceIds.includes(
                                          service.id,
                                        )}
                                        onCheckedChange={() =>
                                          toggleService(service.id)
                                        }
                                        className="mt-0.5"
                                      />
                                      <div className="grid gap-0.5 leading-none">
                                        <label
                                          htmlFor={`service-${service.id}`}
                                          className="text-sm font-medium leading-tight cursor-pointer select-none text-zinc-700"
                                        >
                                          {service.name}
                                        </label>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          },
                        )}
                        {services.length === 0 && (
                          <div className="p-8 text-center text-sm text-zinc-500">
                            No services available.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Packages */}
                    {packages.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Packages
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={toggleAllPackages}
                          >
                            {selectedPackageIds.length === packages.length
                              ? "Deselect All"
                              : "Select All Packages"}
                          </Button>
                        </div>
                        <div className="border rounded-xl p-3 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {packages.map((pkg) => (
                            <div
                              key={pkg.id}
                              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-zinc-50 transition-colors"
                            >
                              <Checkbox
                                id={`package-${pkg.id}`}
                                checked={selectedPackageIds.includes(pkg.id)}
                                onCheckedChange={() => togglePackage(pkg.id)}
                              />
                              <label
                                htmlFor={`package-${pkg.id}`}
                                className="text-sm font-medium leading-none cursor-pointer select-none text-zinc-700"
                              >
                                {pkg.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-4 pt-2 border-t bg-zinc-50/50">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="hover:bg-zinc-200/50 text-zinc-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Create Event
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
