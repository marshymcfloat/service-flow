"use client";

import { createBooking } from "@/lib/server actions/booking";
import {
  getAvailableSlots,
  getAvailableEmployees,
} from "@/lib/server actions/availability";
import { useParams, useRouter } from "next/navigation";
import {
  Service,
  ServicePackage,
  PackageItem,
} from "@/prisma/generated/prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBookingSchema,
  PaymentMethod,
  PaymentType,
} from "@/lib/zod schemas/bookings";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { User, Wallet } from "lucide-react";
import CustomerSearchInput from "./CustomerSearchInput";
import ServiceSelect from "./ServiceSelect";
import SelectedServiceList from "./SelectedServiceList";
import DatePicker from "./DatePicker";
import TimeSlotPicker from "./TimeSlotPicker";
import EmployeeSelect from "./EmployeeSelect";
import ServiceClaimSelector from "./ServiceClaimSelector";
import { SegmentedToggle } from "../ui/segmented-toggle";
import { Button } from "../ui/button";

type PackageWithItems = ServicePackage & {
  items: (PackageItem & { service: Service })[];
};

interface BookingFormProps {
  services: Service[];
  packages?: PackageWithItems[];
  categories: string[];
  isEmployee?: boolean;
  currentEmployeeId?: number;
  isModal?: boolean;
}

export default function BookingForm({
  services,
  packages = [],
  categories,
  isEmployee = false,
  currentEmployeeId,
  isModal = false,
}: BookingFormProps) {
  const router = useRouter();
  const form = useForm<any>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      customerId: "",
      customerName: "",
      services: [],
      scheduledAt: undefined,
      employeeId:
        isEmployee && currentEmployeeId ? currentEmployeeId : undefined,
      paymentMethod: isEmployee ? "CASH" : "QRPH",
      paymentType: "FULL",
    },
  });

  const params = useParams<{ businessSlug: string }>();
  const businessSlug = params.businessSlug;

  const selectedServices = (form.watch("services") as any[]) || [];
  const selectedDate = form.watch("scheduledAt") as Date | undefined;
  const selectedTime = form.watch("selectedTime") as Date | undefined;
  const paymentMethod = form.watch("paymentMethod") as PaymentMethod;
  const paymentType = form.watch("paymentType") as PaymentType;

  const [claimedUniqueIds, setClaimedUniqueIds] = useState<string[]>([]);

  const { total, amountToPay } = useMemo(() => {
    const total = selectedServices.reduce((sum, s) => {
      return sum + s.price * (s.quantity || 1);
    }, 0);
    const amountToPay = paymentType === "DOWNPAYMENT" ? total * 0.5 : total;
    return { total, amountToPay };
  }, [selectedServices, paymentType]);

  const totalDuration = useMemo(() => {
    return selectedServices.reduce((total, s) => {
      const duration = s.duration || 30;
      return total + duration * (s.quantity || 1);
    }, 0);
  }, [selectedServices]);

  const { data: timeSlots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: [
      "timeSlots",
      businessSlug,
      selectedDate?.toISOString(),
      totalDuration,
    ],
    queryFn: async () => {
      if (!selectedDate || !businessSlug || selectedServices.length === 0) {
        return [];
      }
      return getAvailableSlots({
        businessSlug,
        date: selectedDate,
        serviceDurationMinutes: totalDuration,
      });
    },
    enabled: !!selectedDate && !!businessSlug && selectedServices.length > 0,
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: [
      "employees",
      businessSlug,
      selectedTime?.toISOString(),
      totalDuration,
    ],
    queryFn: async () => {
      if (!selectedTime || !businessSlug) {
        return [];
      }
      const endTime = new Date(
        selectedTime.getTime() + totalDuration * 60 * 1000,
      );
      return getAvailableEmployees({
        businessSlug,
        startTime: selectedTime,
        endTime,
      });
    },
    enabled: !!selectedTime && !!businessSlug,
  });

  useEffect(() => {
    if (selectedServices.length === 0) {
      form.setValue("scheduledAt", undefined);
      form.setValue("selectedTime", undefined);
      form.setValue("employeeId", undefined);
    }
  }, [selectedServices.length, form]);

  useEffect(() => {
    if (!selectedDate) {
      form.setValue("selectedTime", undefined);
      form.setValue("employeeId", undefined);
    }
  }, [selectedDate, form]);

  useEffect(() => {
    if (!selectedTime) {
      form.setValue("employeeId", undefined);
    }
  }, [selectedTime, form]);

  const { mutate: createBookingAction, isPending } = useMutation({
    mutationFn: createBooking,
    onSuccess: (checkoutUrl) => {
      if (checkoutUrl && checkoutUrl.startsWith("http")) {
        window.location.href = checkoutUrl;
      } else if (isEmployee) {
        toast.success("Booking successfully created");
        if (isModal) {
          router.back();
        } else {
          router.push(`/app/${businessSlug}`);
        }
      }
    },
    onError: (error) => {
      toast.error("Failed to create booking");
      console.error("Booking creation failed:", error);
    },
  });

  const onSubmit = (data: any) => {
    if (!businessSlug) {
      console.error("Business slug not found in URL");
      toast.error("Business info missing. Please refresh the page.");
      return;
    }

    console.log("Submitting booking:", data);

    const scheduledAt = data.selectedTime || data.scheduledAt;

    const flatServicesPayload = data.services.flatMap((s: any) =>
      Array.from({ length: s.quantity || 1 }).map((_, i) => {
        const uniqueId = `${s.id}-${i}`;
        return {
          id: s.id,
          name: s.name,
          price: s.price,
          quantity: 1,
          duration: s.duration || 30,
          claimedByCurrentEmployee:
            isEmployee && claimedUniqueIds.includes(uniqueId),
        };
      }),
    );

    const capitalizedCustomerName = capitalizeWords(data.customerName || "");

    createBookingAction({
      customerId: data.customerId || undefined,
      customerName: capitalizedCustomerName,
      businessSlug,
      scheduledAt,
      currentEmployeeId: isEmployee ? currentEmployeeId : undefined,
      paymentMethod: data.paymentMethod,
      paymentType: data.paymentType,
      services: flatServicesPayload,
    });
  };

  const paymentMethodOptions = isEmployee
    ? [
        { value: "CASH" as const, label: "Cash" },
        { value: "QRPH" as const, label: "QR Payment" },
      ]
    : [{ value: "QRPH" as const, label: "QR Payment" }];

  const paymentTypeOptions = [
    { value: "FULL" as const, label: "Full" },
    { value: "DOWNPAYMENT" as const, label: "50%" },
  ];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error("Form Validation Errors:", errors);
          toast.error("Please fill in all required fields correctly.");
        })}
        className="flex flex-col h-full"
      >
        <div className="text-xs text-red-500 p-2 border border-red-200 bg-red-50 mb-2 hidden">
          isEmployee: {String(isEmployee)}, isModal: {String(isModal)},
          selectedTime: {String(selectedTime)}, services:{" "}
          {selectedServices.length}
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <input type="hidden" {...field} value={field.value || ""} />
            )}
          />
          <FormField
            control={form.control}
            name="customerName"
            render={() => (
              <FormItem>
                <FormControl>
                  <CustomerSearchInput form={form} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="services"
            render={() => (
              <FormItem>
                <FormLabel>Services</FormLabel>
                <FormControl>
                  <ServiceSelect
                    form={form}
                    services={services}
                    packages={packages}
                    categories={categories}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SelectedServiceList form={form} />

          {selectedServices.length > 0 && (
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={(date) => {
                        field.onChange(date);
                        form.setValue("selectedTime", undefined);
                      }}
                      placeholder="Choose a date for your booking"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {selectedDate && selectedServices.length > 0 && (
            <FormField
              control={form.control}
              name="selectedTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Time</FormLabel>
                  <FormControl>
                    <TimeSlotPicker
                      slots={timeSlots}
                      value={field.value}
                      onChange={field.onChange}
                      isLoading={isLoadingSlots}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {selectedTime && !isEmployee && (
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Staff (Optional)</FormLabel>
                  <FormControl>
                    <EmployeeSelect
                      employees={employees}
                      value={field.value}
                      onChange={field.onChange}
                      isLoading={isLoadingEmployees}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {selectedTime && isEmployee && selectedServices.length > 0 && (
            <Card>
              <CardHeader className=" border-b  ">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4 text-primary" /> Claim Services
                </CardTitle>
              </CardHeader>
              <CardContent className="">
                <ServiceClaimSelector
                  services={selectedServices.flatMap((s) =>
                    Array.from({ length: s.quantity || 1 }).map((_, i) => ({
                      id: s.id,
                      uniqueId: `${s.id}-${i}`,
                      name: s.name,
                      price: s.price,
                      duration: s.duration,
                      quantity: 1,
                    })),
                  )}
                  claimedUniqueIds={claimedUniqueIds}
                  onChange={setClaimedUniqueIds}
                />
              </CardContent>
            </Card>
          )}

          {selectedTime && selectedServices.length > 0 && (
            <Card className="border-primary/20 shadow-sm overflow-hidden">
              <CardHeader className=" flex flex-row items-center border-b space-y-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Wallet className="size-4 text-primary" /> Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          Payment Method
                        </FormLabel>
                        <FormControl>
                          <SegmentedToggle
                            options={paymentMethodOptions}
                            value={field.value}
                            onChange={field.onChange}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          Payment Type
                        </FormLabel>
                        <FormControl>
                          <SegmentedToggle
                            options={paymentTypeOptions}
                            value={field.value}
                            onChange={field.onChange}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-muted/30 rounded-xl p-4 border border-border/50 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      ₱{total.toLocaleString()}
                    </span>
                  </div>

                  {paymentType === "DOWNPAYMENT" && (
                    <>
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 border-green-200 bg-green-50 text-green-700"
                          >
                            50% OFF FRONT
                          </Badge>
                          Downpayment
                        </span>
                        <span>- ₱{(total - amountToPay).toLocaleString()}</span>
                      </div>
                      <Separator className="my-2 bg-border/60" />
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Remaining Balance (Pay at Store)</span>
                        <span>₱{(total - amountToPay).toLocaleString()}</span>
                      </div>
                    </>
                  )}

                  <Separator className="my-2" />

                  <div className="flex justify-between items-end pt-1">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                        Total Amount Due
                      </p>
                      {paymentType === "DOWNPAYMENT" && (
                        <p className="text-[10px] text-muted-foreground">
                          Initial payment required
                        </p>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      ₱{amountToPay.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t mt-4">
          <Button disabled={isPending || !selectedTime} type="submit">
            {isPending
              ? "Processing..."
              : paymentMethod === "CASH"
                ? "Confirm Booking"
                : "Reserve & Pay"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
