"use client";

import { createBooking } from "@/lib/server actions/booking";
import {
  getAvailableSlots,
  getAvailableEmployees,
  checkCategoryAvailability,
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
import { verifyVoucherAction } from "@/lib/server actions/vouchers";

// [NEW] Import sale events action
import { getActiveSaleEvents } from "@/lib/server actions/sale-event";
import { getApplicableDiscount } from "@/lib/utils/pricing";

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
import { Sparkles, Calendar, ArrowRight, Ticket, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // [NEW] Fetch active sale events
  const { data: saleEventsResult } = useQuery({
    queryKey: ["activeSaleEvents", businessSlug],
    queryFn: () => getActiveSaleEvents(businessSlug),
    enabled: !!businessSlug,
  });
  const saleEvents = (saleEventsResult?.success && saleEventsResult.data) || [];

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

  // [NEW] Re-calculate prices when sale events change
  useEffect(() => {
    if (saleEvents.length > 0 && selectedServices.length > 0) {
      const updatedServices = selectedServices.map((service) => {
        // Recalculate discount
        const discountInfo = getApplicableDiscount(
          service.id,
          service.packageId ? Number(service.packageId) : undefined,
          service.originalPrice || service.price,
          saleEvents,
        );

        if (discountInfo) {
          // Only update if differ to avoid infinite loop
          if (service.price !== discountInfo.finalPrice) {
            return {
              ...service,
              price: discountInfo.finalPrice,
              originalPrice: service.originalPrice || service.price,
              discount: discountInfo.discount,
              discountReason: discountInfo.reason,
            };
          }
        }
        return service;
      });

      // Check if any changed
      const hasChanges = updatedServices.some(
        (s, i) => s.price !== selectedServices[i].price,
      );
      if (hasChanges) {
        console.log("Updating services with sale prices", updatedServices);
        form.setValue("services", updatedServices);
      }
    }
  }, [saleEvents]); // Run only when saleEvents loaded/changed

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
    const newState = !isWalkIn;
    setIsWalkIn(newState);

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
  }, [isWalkIn, form]);

  const { total } = useMemo(() => {
    const total = selectedServices.reduce((sum, s) => {
      return sum + s.price * (s.quantity || 1);
    }, 0);
    return { total };
  }, [selectedServices]);

  // Voucher State
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
    type: "PERCENTAGE" | "FLAT";
    value: number;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState(false);

  const handleVerifyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setIsVerifyingVoucher(true);
    setVoucherError(null);

    const result = await verifyVoucherAction(voucherCode, businessSlug!, total);

    setIsVerifyingVoucher(false);

    if (result.success && result.data) {
      setAppliedVoucher({
        code: result.data.code,
        discountAmount: result.data.discountAmount,
        type: result.data.type,
        value: result.data.value,
      });
      toast.success("Voucher applied successfully!");
    } else {
      setAppliedVoucher(null);
      setVoucherError(result.error || "Invalid voucher code");
      toast.error(result.error || "Invalid voucher code");
    }
  };

  const clearVoucher = () => {
    setVoucherCode("");
    setAppliedVoucher(null);
    setVoucherError(null);
  };

  // Re-verify voucher if total changes (e.g. added/removed services)
  useEffect(() => {
    if (appliedVoucher) {
      const revalidate = async () => {
        const result = await verifyVoucherAction(
          appliedVoucher.code,
          businessSlug!,
          total,
        );
        if (!result.success) {
          setAppliedVoucher(null);
          setVoucherError("Voucher removed: requirements no longer met");
          toast.error("Voucher removed: requirements no longer met");
        } else if (result.data) {
          // Update discount amount as it might have changed (percentage)
          setAppliedVoucher({
            code: result.data.code,
            discountAmount: result.data.discountAmount,
            type: result.data.type,
            value: result.data.value,
          });
        }
      };
      // Only run if total > 0
      if (total > 0) revalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, businessSlug]);

  const finalTotal = useMemo(() => {
    if (appliedVoucher) {
      return Math.max(0, total - appliedVoucher.discountAmount);
    }
    return total;
  }, [total, appliedVoucher]);

  const finalAmountToPay = useMemo(() => {
    const base = paymentType === "DOWNPAYMENT" ? finalTotal * 0.5 : finalTotal;
    return base;
  }, [finalTotal, paymentType]);

  const totalDuration = useMemo(() => {
    return selectedServices.reduce((total, s) => {
      const duration = s.duration || 30;
      return total + duration * (s.quantity || 1);
    }, 0);
  }, [selectedServices]);

  const targetCategory = useMemo(() => {
    if (selectedServices.length === 0) return "GENERAL";
    // Find the full service object to get the category
    const firstService = selectedServices[0];
    const fullService = services.find((s) => s.id === firstService.id);
    return fullService?.category || "GENERAL";
  }, [selectedServices, services]);

  // Fetch business hours for the selected category
  const { data: categoryInfo } = useQuery({
    queryKey: [
      "categoryAvailability",
      businessSlug,
      targetCategory,
      selectedDate,
    ],
    queryFn: async () => {
      if (!businessSlug) return null;
      return checkCategoryAvailability({
        businessSlug,
        category: targetCategory,
        date: selectedDate,
      });
    },
    enabled: !!businessSlug && !!targetCategory,
  });

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
        category: targetCategory,
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
        category: targetCategory,
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
        voucherCode: appliedVoucher?.code,
      });
    },
    [
      businessSlug,
      isWalkIn,
      isEmployee,
      claimedUniqueIds,
      currentEmployeeId,
      createBookingAction,
      appliedVoucher,
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
        className="flex flex-col 2xl:flex-row h-full gap-6 2xl:gap-8 relative isolate"
      >
        <div className="flex-1 space-y-6 overflow-y-auto pb-4 2xl:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Hidden Fields & Identification */}
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <input type="hidden" {...field} value={field.value || ""} />
            )}
          />

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                1
              </span>
              <h3 className="font-semibold text-lg tracking-tight">
                Customer Details
              </h3>
            </div>

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
                        {...field}
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
                      <div className="text-sm bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
                        This customer already has an email linked (
                        <span className="font-mono">
                          {maskEmail(existingCustomerEmail)}
                        </span>
                        ).
                        <br />
                        <span className="text-xs opacity-80">
                          To change it, update their profile separately.
                        </span>
                      </div>
                    ) : (
                      <>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </>
                    )}
                  </FormItem>
                );
              }}
            />
          </div>

          <Separator className="bg-border/40" />

          {/* Pending Flows / Upsells */}
          {pendingFlows.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
              {pendingFlows.map((flow, idx) => (
                <div
                  key={idx}
                  className="bg-indigo-50/50 hover:bg-indigo-50/80 transition-colors border border-indigo-200/60 rounded-xl p-4 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Sparkles className="w-20 h-20 text-indigo-900" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant="outline"
                        className="bg-white/80 text-indigo-700 border-indigo-200 shadow-sm backdrop-blur-sm"
                      >
                        Recommendation
                      </Badge>
                      <span className="text-xs text-indigo-600/80 font-medium">
                        Based on visit{" "}
                        {format(new Date(flow.lastServiceDate), "MMM d")}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-700/70 mb-0.5">
                          Suggested Service
                        </span>
                        <span className="font-bold text-indigo-950 text-lg leading-tight">
                          {flow.suggestedServiceName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium">
                        {(() => {
                          const today = new Date();
                          const dueDate = new Date(flow.dueDate);
                          today.setHours(0, 0, 0, 0);
                          dueDate.setHours(0, 0, 0, 0);

                          const diffDays = Math.floor(
                            (today.getTime() - dueDate.getTime()) /
                              (1000 * 60 * 60 * 24),
                          );
                          const isOverdue = diffDays > 0;

                          return isOverdue ? (
                            <span className="text-orange-600 flex items-center gap-1.5 bg-orange-50 px-2.5 py-1.5 rounded-md border border-orange-100/50">
                              <Calendar className="w-3.5 h-3.5" />
                              Overdue by {diffDays}{" "}
                              {diffDays === 1 ? "day" : "days"}
                            </span>
                          ) : (
                            <span className="text-indigo-600 flex items-center gap-1.5 bg-indigo-100/50 px-2.5 py-1.5 rounded-md">
                              <Calendar className="w-3.5 h-3.5" />
                              Due {format(dueDate, "MMMM d")}
                            </span>
                          );
                        })()}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50 shadow-lg transition-all active:scale-95"
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
                              `Added ${flow.suggestedServiceName}`,
                              { icon: "✨" },
                            );
                          } else {
                            toast.info("Already selected");
                          }
                        }}
                      >
                        Add to Booking
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Service Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                2
              </span>
              <h3 className="font-semibold text-lg tracking-tight">
                Select Services
              </h3>
            </div>

            <FormField
              control={form.control}
              name="services"
              render={() => (
                <FormItem>
                  <FormControl>
                    <ServiceSelect
                      form={form}
                      services={services}
                      packages={packages}
                      categories={categories}
                      saleEvents={saleEvents}
                      businessSlug={businessSlug!}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator className="bg-border/40" />

          {isEmployee && (
            <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-xl border border-secondary">
              <div className="flex-1 mr-4">
                <p className="text-sm font-semibold text-foreground">
                  Walk-in / Immediate
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Start booking immediately without scheduling
                </p>
              </div>
              <div
                className={cn(
                  "w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300",
                  isWalkIn ? "bg-primary" : "bg-muted-foreground/30",
                )}
                onClick={handleWalkInToggle}
              >
                <div
                  className={cn(
                    "bg-white w-5 h-5 rounded-full shadow-sm transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    isWalkIn ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </div>
            </div>
          )}

          <div
            className={cn(
              "space-y-6 transition-all duration-300",
              isWalkIn || selectedServices.length === 0
                ? "opacity-50 grayscale pointer-events-none hidden"
                : "opacity-100",
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  3
                </span>
                <h3 className="font-semibold text-lg tracking-tight">
                  Date & Time
                </h3>
              </div>

              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      Date
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={(date) => {
                          field.onChange(date);
                          form.setValue("selectedTime", undefined);
                        }}
                        placeholder="Pick a date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedDate && (
                <FormField
                  control={form.control}
                  name="selectedTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                        Available Slots
                      </FormLabel>
                      <FormControl>
                        <TimeSlotPicker
                          slots={timeSlots}
                          value={field.value}
                          onChange={field.onChange}
                          isLoading={isLoadingSlots}
                          category={targetCategory}
                          businessHours={categoryInfo?.businessHours || null}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          {(isWalkIn || selectedTime) && !isEmployee && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
              <Separator className="bg-border/40" />
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  4
                </span>
                <h3 className="font-semibold text-lg tracking-tight">
                  Preferred Staff
                </h3>
              </div>

              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <EmployeeSelect
                        employees={employees}
                        value={field.value}
                        onChange={field.onChange}
                        isLoading={isLoadingEmployees}
                        serviceCategory={targetCategory}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {(isWalkIn || selectedTime) &&
            isEmployee &&
            selectedServices.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                <Separator className="bg-border/40" />
                <div className="flex items-center gap-2 mb-2">
                  <User className="size-5 text-primary" />
                  <h3 className="font-semibold text-lg tracking-tight">
                    Claim Services
                  </h3>
                </div>

                <Card className="bg-card/50">
                  <CardContent className="pt-6">
                    <ServiceClaimSelector
                      services={selectedServices.flatMap((s) =>
                        Array.from({
                          length: Math.floor(Number(s.quantity) || 1),
                        }).map((_, i) => ({
                          id: s.id,
                          uniqueId: `${s.id}-${s.packageId ? `pkg${s.packageId}` : "std"}-${i}`,
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
              </div>
            )}
        </div>

        <div className="w-full 2xl:w-[380px] shrink-0">
          <div className="2xl:sticky 2xl:top-8 space-y-4">
            <Card className="border shadow-lg shadow-black/5 overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Booking Summary</span>
                  {selectedServices.length > 0 && (
                    <Badge variant="secondary" className="font-normal text-xs">
                      {selectedServices.length} items
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                <div className="max-h-[300px] overflow-y-auto pr-1 -mr-2">
                  <SelectedServiceList
                    form={form}
                    saleEvents={saleEvents}
                    services={selectedServices}
                  />
                </div>

                {selectedServices.length > 0 && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <Separator />

                    {(isWalkIn || selectedTime) && (
                      <div className="space-y-4">
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

                        <div className="pt-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="VOUCHER CODE"
                              className="uppercase font-mono text-sm tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:capitalize"
                              value={voucherCode}
                              onChange={(e) => setVoucherCode(e.target.value)}
                              disabled={!!appliedVoucher}
                            />
                            {appliedVoucher ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={clearVoucher}
                                className="shrink-0 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <X className="size-4" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={handleVerifyVoucher}
                                disabled={
                                  isVerifyingVoucher || !voucherCode.trim()
                                }
                                className="shrink-0 font-medium"
                              >
                                {isVerifyingVoucher ? "..." : "Apply"}
                              </Button>
                            )}
                          </div>

                          {voucherError && (
                            <p className="text-xs text-red-500 font-medium mt-1.5 animate-in slide-in-from-left-1">
                              {voucherError}
                            </p>
                          )}

                          {appliedVoucher && (
                            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200 mt-2">
                              <Ticket className="size-3.5" />
                              <span className="font-semibold">
                                {appliedVoucher.code}
                              </span>
                              <span className="ml-auto font-bold tabular-nums">
                                -₱
                                {appliedVoucher.discountAmount.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="bg-muted/40 -mx-6 -mb-6 px-6 py-4 border-t space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium tabular-nums">
                          ₱{total.toLocaleString()}
                        </span>
                      </div>

                      {appliedVoucher && (
                        <div className="flex justify-between items-center text-sm text-green-600">
                          <span className="flex items-center gap-1.5">
                            <Ticket className="w-3.5 h-3.5" /> Voucher Discount
                          </span>
                          <span className="font-medium tabular-nums">
                            - ₱{appliedVoucher.discountAmount.toLocaleString()}
                          </span>
                        </div>
                      )}

                      {paymentType === "DOWNPAYMENT" &&
                        (isWalkIn || selectedTime) && (
                          <>
                            <div className="flex justify-between items-center text-sm text-emerald-600">
                              <span className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Downpayment (50%)
                              </span>
                              <span className="font-medium tabular-nums">
                                - ₱
                                {(
                                  finalTotal - finalAmountToPay
                                ).toLocaleString()}
                              </span>
                            </div>
                            <Separator className="my-1 border-dashed" />
                            <div className="flex justify-between items-center text-xs text-muted-foreground opacity-80">
                              <span>Balance (Pay later)</span>
                              <span className="tabular-nums">
                                ₱
                                {(
                                  finalTotal - finalAmountToPay
                                ).toLocaleString()}
                              </span>
                            </div>
                          </>
                        )}

                      <Separator className="bg-border/60" />

                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-0.5">
                            {paymentType === "DOWNPAYMENT"
                              ? "Due Now"
                              : "Total Amount"}
                          </p>
                        </div>
                        <div className="text-2xl font-bold text-primary tabular-nums tracking-tight">
                          ₱{finalAmountToPay.toLocaleString()}
                        </div>
                      </div>

                      <Button
                        disabled={
                          isPending ||
                          (!selectedTime && !isWalkIn) ||
                          selectedServices.length === 0
                        }
                        type="submit"
                        size="lg"
                        className="w-full font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
                      >
                        {isPending
                          ? "Processing..."
                          : paymentMethod === "CASH"
                            ? "Confirm Booking"
                            : "Reserve & Pay"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
