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
import { useEffect, useMemo, useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

const maskEmail = (email: string) => {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const maskedUser =
    user.length > 2
      ? `${user.substring(0, 2)}***${user.substring(user.length - 1)}`
      : `${user}***`;
  return `${maskedUser}@${domain}`;
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
import { Input } from "../ui/input";

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

import {
  getCustomerPendingFlows,
  PendingFlow,
} from "@/lib/server actions/flow-actions";
import { format } from "date-fns";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";

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
      email: "",
    },
  });

  const params = useParams<{ businessSlug: string }>();
  const businessSlug = params.businessSlug;

  const selectedServices = (form.watch("services") as any[]) || [];
  const selectedDate = form.watch("scheduledAt") as Date | undefined;
  const selectedTime = form.watch("selectedTime") as Date | undefined;
  const paymentMethod = form.watch("paymentMethod") as PaymentMethod;
  const paymentType = form.watch("paymentType") as PaymentType;
  const customerId = form.watch("customerId");

  const [existingCustomerEmail, setExistingCustomerEmail] = useState<
    string | null
  >(null);
  const [pendingFlows, setPendingFlows] = useState<PendingFlow[]>([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(false);
  const [claimedUniqueIds, setClaimedUniqueIds] = useState<string[]>([]);

  // Fetch pending flows when customer is selected
  useEffect(() => {
    async function fetchFlows() {
      if (!customerId) {
        setPendingFlows([]);
        return;
      }
      setIsLoadingFlows(true);
      const flows = await getCustomerPendingFlows(customerId);
      setPendingFlows(flows);
      setIsLoadingFlows(false);
    }
    fetchFlows();
  }, [customerId]);

  // Callback when a customer is selected from the search input
  const handleCustomerSelect = useCallback((customer: any) => {
    // If customer has an email, set it to state
    if (customer && customer.email) {
      setExistingCustomerEmail(customer.email);
    } else {
      setExistingCustomerEmail(null);
    }
  }, []);

  const [isWalkIn, setIsWalkIn] = useState(false);

  // Memoize the toggle handler
  const handleWalkInToggle = useCallback(() => {
    setIsWalkIn((prev) => {
      const newState = !prev;
      if (newState) {
        const now = new Date();
        form.setValue("scheduledAt", now, { shouldValidate: true });
        form.setValue("selectedTime", now, {
          shouldValidate: true,
        });
      } else {
        form.setValue("scheduledAt", undefined);
        form.setValue("selectedTime", undefined);
      }
      return newState;
    });
  }, [form]);

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
      if (
        !selectedDate ||
        !businessSlug ||
        selectedServices.length === 0 ||
        isWalkIn // Skip fetching slots for walk-ins
      ) {
        return [];
      }
      return getAvailableSlots({
        businessSlug,
        date: selectedDate,
        serviceDurationMinutes: totalDuration,
      });
    },
    enabled:
      !!selectedDate &&
      !!businessSlug &&
      selectedServices.length > 0 &&
      !isWalkIn,
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
      if (!isWalkIn) {
        form.setValue("scheduledAt", undefined);
        form.setValue("selectedTime", undefined);
      }
      form.setValue("employeeId", undefined);
    }
  }, [selectedServices.length, form, isWalkIn]);

  useEffect(() => {
    if (!selectedDate && !isWalkIn) {
      form.setValue("selectedTime", undefined);
      form.setValue("employeeId", undefined);
    }
  }, [selectedDate, form, isWalkIn]);

  useEffect(() => {
    if (!selectedTime && !isWalkIn) {
      form.setValue("employeeId", undefined);
    }
  }, [selectedTime, form, isWalkIn]);

  const { mutate: createBookingAction, isPending } = useMutation({
    mutationFn: createBooking,
    onSuccess: (checkoutUrl) => {
      if (checkoutUrl && checkoutUrl.startsWith("http")) {
        window.location.href = checkoutUrl;
      } else if (isEmployee) {
        form.reset();
        setIsWalkIn(false); // Reset walk-in toggle
        setClaimedUniqueIds([]);
        setPendingFlows([]);
        setExistingCustomerEmail(null);
        toast.success("Booking successfully created");

        router.back();
      }
    },
    onError: (error) => {
      toast.error("Failed to create booking");
      console.error("Booking creation failed:", error);
    },
  });

  const onSubmit = useCallback(
    (data: any) => {
      if (!businessSlug) {
        console.error("Business slug not found in URL");
        toast.error("Business info missing. Please refresh the page.");
        return;
      }

      console.log("Submitting booking:", data);

      // For walk-in, force current time if not correctly set for some reason
      const scheduledAt = isWalkIn
        ? new Date()
        : data.selectedTime || data.scheduledAt;

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
        email: data.email,
      });
    },
    [
      businessSlug,
      isWalkIn,
      isEmployee,
      claimedUniqueIds,
      currentEmployeeId,
      createBookingAction,
    ],
  );

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
          console.error(
            "Form Validation Errors:",
            JSON.stringify(errors, null, 2),
          );
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  {isEmployee ? (
                    <CustomerSearchInput
                      form={form}
                      businessSlug={businessSlug!}
                      onCustomerSelect={handleCustomerSelect}
                    />
                  ) : (
                    <Input placeholder="Enter your full name" {...field} />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  {isEmployee && existingCustomerEmail ? (
                    <div className="text-sm bg-yellow-50 text-yellow-800 p-2 rounded-md border border-yellow-200 mb-2">
                      This customer already has an email linked (
                      {maskEmail(existingCustomerEmail)}).
                      <br />
                      <span className="text-xs opacity-80">
                        To change it, please update their profile separately.
                      </span>
                    </div>
                  ) : (
                    <>
                      <FormControl>
                        <Input placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Providing an email would let us remind you about your
                        bookings, and get updates from us like sales.
                      </p>
                    </>
                  )}
                </FormItem>
              );
            }}
          />

          {pendingFlows.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
              {pendingFlows.map((flow, idx) => (
                <div
                  key={idx}
                  className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Sparkles className="w-16 h-16 text-indigo-900" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="bg-white text-indigo-700 border-indigo-200 shadow-sm"
                      >
                        Authentication Journey
                      </Badge>
                      <span className="text-xs text-indigo-600 font-medium">
                        Based on their visit on{" "}
                        {format(new Date(flow.lastServiceDate), "MMM d")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm mb-3">
                      <div className="flex flex-col opacity-60">
                        <span className="text-[10px] uppercase tracking-wider font-semibold">
                          Previous
                        </span>
                        <span className="font-medium line-through decoration-indigo-300">
                          {flow.triggerServiceName}
                        </span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-indigo-400" />

                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-700">
                          Recommended Next
                        </span>
                        <span className="font-bold text-indigo-900 text-base">
                          {flow.suggestedServiceName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        {(() => {
                          const today = new Date();
                          const dueDate = new Date(flow.dueDate);
                          // Reset times for accurate day comparison
                          today.setHours(0, 0, 0, 0);
                          dueDate.setHours(0, 0, 0, 0);

                          const diffDays = Math.floor(
                            (today.getTime() - dueDate.getTime()) /
                              (1000 * 60 * 60 * 24),
                          );
                          const isOverdue = diffDays > 0;

                          return isOverdue ? (
                            <span className="text-orange-600 font-semibold flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                              <Calendar className="w-3 h-3" />
                              Overdue by {diffDays}{" "}
                              {diffDays === 1 ? "day" : "days"}
                            </span>
                          ) : (
                            <span className="text-indigo-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due {format(dueDate, "MMM d, yyyy")}
                            </span>
                          );
                        })()}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 h-8 text-xs shadow-indigo-200 shadow-md"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const currentServices =
                            form.getValues("services") || [];
                          const serviceToAdd = {
                            id: flow.suggestedServiceId,
                            name: flow.suggestedServiceName,
                            price: flow.suggestedServicePrice,
                            duration: flow.suggestedServiceDuration,
                            quantity: 1,
                          };

                          if (
                            !currentServices.some(
                              (s: any) => s.id === serviceToAdd.id,
                            )
                          ) {
                            form.setValue("services", [
                              ...currentServices,
                              serviceToAdd,
                            ]);
                            toast.success(
                              `Added ${flow.suggestedServiceName} to booking`,
                            );
                          } else {
                            toast.info(
                              "This service is already in the booking",
                            );
                          }
                        }}
                      >
                        <Sparkles className="w-3 h-3 mr-1.5" />
                        Add to Booking
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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

          {isEmployee && (
            <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border border-border/50">
              <div className="flex-1">
                <p className="text-sm font-medium">Walk-in / Immediate</p>
                <p className="text-xs text-muted-foreground">
                  Booking starts now. Skip scheduling.
                </p>
              </div>
              <div
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isWalkIn ? "bg-primary" : "bg-gray-300"}`}
                onClick={handleWalkInToggle}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${isWalkIn ? "translate-x-4" : ""}`}
                ></div>
              </div>
            </div>
          )}

          {!isWalkIn && selectedServices.length > 0 && (
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

          {!isWalkIn && selectedDate && selectedServices.length > 0 && (
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

          {(isWalkIn || selectedTime) && !isEmployee && (
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

          {(isWalkIn || selectedTime) &&
            isEmployee &&
            selectedServices.length > 0 && (
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

          {(isWalkIn || selectedTime) && selectedServices.length > 0 && (
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
          <Button
            disabled={isPending || (!selectedTime && !isWalkIn)}
            type="submit"
          >
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
