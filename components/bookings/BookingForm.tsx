"use client";

import { createBooking } from "@/lib/server actions/booking";
import {
  getAvailableSlots,
  getAvailableEmployees,
} from "@/lib/server actions/availability";
import { useParams } from "next/navigation";
import { Service } from "@/prisma/generated/prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBookingSchema,
  CreateBookingTypes,
  PaymentMethod,
  PaymentType,
} from "@/lib/zod schemas/bookings";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import CustomerSearchInput from "./CustomerSearchInput";
import ServiceSelect from "./ServiceSelect";
import SelectedServiceList from "./SelectedServiceList";
import DatePicker from "./DatePicker";
import TimeSlotPicker from "./TimeSlotPicker";
import EmployeeSelect from "./EmployeeSelect";
import ServiceClaimSelector from "./ServiceClaimSelector";
import { SegmentedToggle } from "../ui/segmented-toggle";
import { Button } from "../ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

interface BookingFormProps {
  services: Service[];
  categories: string[];
  isEmployee?: boolean;
  currentEmployeeId?: number; // The logged-in employee's ID (if applicable)
}

export default function BookingForm({
  services,
  categories,
  isEmployee = false,
  currentEmployeeId,
}: BookingFormProps) {
  const form = useForm<any>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      customerId: "",
      customerName: "",
      services: [],
      scheduledAt: undefined,
      // Auto-assign employee if they're making the booking (they'll serve the customer)
      employeeId:
        isEmployee && currentEmployeeId ? currentEmployeeId : undefined,
      paymentMethod: isEmployee ? "CASH" : "QRPH",
      paymentType: "FULL",
    },
  });

  const params = useParams<{ businessSlug: string }>();
  const businessSlug = params.businessSlug;

  // Watch form values for dependent queries
  const selectedServices = (form.watch("services") as any[]) || [];
  const selectedDate = form.watch("scheduledAt") as Date | undefined;
  const selectedTime = form.watch("selectedTime") as Date | undefined;
  const paymentMethod = form.watch("paymentMethod") as PaymentMethod;
  const paymentType = form.watch("paymentType") as PaymentType;

  // For employee bookings: track which services they claim (using unique IDs "serviceId-index")
  const [claimedUniqueIds, setClaimedUniqueIds] = useState<string[]>([]);

  // Calculate totals
  const { total, amountToPay } = useMemo(() => {
    const total = selectedServices.reduce((sum, s) => {
      return sum + s.price * (s.quantity || 1);
    }, 0);
    const amountToPay = paymentType === "DOWNPAYMENT" ? total * 0.5 : total;
    return { total, amountToPay };
  }, [selectedServices, paymentType]);

  // Calculate total service duration
  const totalDuration = useMemo(() => {
    return selectedServices.reduce((total, s) => {
      const duration = s.duration || 30;
      return total + duration * (s.quantity || 1);
    }, 0);
  }, [selectedServices]);

  // Fetch available time slots when date changes
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

  // Fetch available employees when time is selected
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

  // Reset dependent fields when parent changes
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
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    },
    onError: (error) => {
      console.error("Booking creation failed:", error);
    },
  });

  const onSubmit = (data: any) => {
    if (!businessSlug) {
      console.error("Business slug not found in URL");
      return;
    }

    const scheduledAt = data.selectedTime || data.scheduledAt;

    // Flatten services for submission (handle quantity > 1 as separate items)
    const flatServicesPayload = data.services.flatMap((s: any) =>
      Array.from({ length: s.quantity || 1 }).map((_, i) => {
        const uniqueId = `${s.id}-${i}`;
        return {
          id: s.id,
          name: s.name,
          price: s.price,
          quantity: 1, // Always 1 for flattened items
          duration: s.duration || 30,
          // Mark as claimed if employee selected this specific instance
          claimedByCurrentEmployee:
            isEmployee && claimedUniqueIds.includes(uniqueId),
        };
      }),
    );

    createBookingAction({
      customerId: data.customerId || undefined,
      customerName: data.customerName,
      businessSlug,
      scheduledAt,
      currentEmployeeId: isEmployee ? currentEmployeeId : undefined,
      paymentMethod: data.paymentMethod,
      paymentType: data.paymentType,
      services: flatServicesPayload,
    });
  };

  // Payment method options
  const paymentMethodOptions = isEmployee
    ? [
        { value: "CASH" as const, label: "Cash" },
        { value: "QRPH" as const, label: "QR Payment" },
      ]
    : [{ value: "QRPH" as const, label: "QR Payment" }];

  const paymentTypeOptions = [
    { value: "FULL" as const, label: "Full Payment" },
    { value: "DOWNPAYMENT" as const, label: "50% Downpayment" },
  ];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error("Form Validation Errors:", errors);
        })}
        className="flex flex-col h-full"
      >
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <input type="hidden" {...field} value={field.value || ""} />
            )}
          />
          <CustomerSearchInput form={form} />

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
                    categories={categories}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SelectedServiceList form={form} />

          {/* Date Selection - only show if services are selected */}
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

          {/* Time Slot Selection - only show if date is selected */}
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

          {/* Employee Selection - only show for customers (not employees) */}
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

          {/* Service Claim Selector - only show for employees after time selection */}
          {selectedTime && isEmployee && selectedServices.length > 0 && (
            <div className="pt-4 border-t">
              <FormLabel className="mb-2 block">Claim Services</FormLabel>
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
            </div>
          )}

          {/* Payment Options - only show if time is selected */}
          {selectedTime && selectedServices.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              {/* Payment Method */}
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
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

              {/* Payment Type */}
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
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

              {/* Amount Summary */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span>₱{total.toLocaleString()}</span>
                </div>
                {paymentType === "DOWNPAYMENT" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Remaining (pay at store)
                    </span>
                    <span>₱{(total - amountToPay).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Amount to Pay Now</span>
                  <span className="text-primary">
                    ₱{amountToPay.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
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
