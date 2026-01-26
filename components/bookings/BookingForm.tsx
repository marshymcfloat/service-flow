"use client";

import { useParams } from "next/navigation";
import { Service } from "@/prisma/generated/prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBookingSchema,
  CreateBookingTypes,
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
import { Button } from "../ui/button";
import { useMutation } from "@tanstack/react-query";
import { createPayMongoCheckoutSession } from "@/lib/server actions/paymongo";

export default function BookingForm({ services }: { services: Service[] }) {
  const form = useForm<any>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      customerId: "",
      customerName: "",
      services: [],
    },
  });

  const { mutate: createCheckoutSession, isPending } = useMutation({
    mutationFn: createPayMongoCheckoutSession,
    onSuccess: (checkoutUrl) => {
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    },
    onError: (error) => {
      console.error("Checkout session creation failed:", error);
      // Ideally show a toast here
    },
  });

  // Get business slug from URL parameters
  const params = useParams<{ business_slug: string }>();

  const onSubmit = (data: any) => {
    const line_items = data.services.map((service: any) => ({
      name: service.name,
      amount: Math.round(service.price * 100), // Convert to cents
      currency: "PHP",
      quantity: service.quantity || 1,
      description: service.description || undefined,
    }));

    // Construct dynamic URLs based on current location and business slug
    const baseUrl = window.location.origin;
    const businessSlug = params.business_slug;

    // Fallback if slug is missing
    const successUrl = businessSlug
      ? `${baseUrl}/${businessSlug}/booking/success`
      : `${baseUrl}/booking/success`;

    const cancelUrl = businessSlug
      ? `${baseUrl}/${businessSlug}/booking`
      : `${baseUrl}/booking/cancel`;

    createCheckoutSession({
      line_items,
      description: `Booking for ${data.customerName || "Customer"}`,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error("Form Validation Errors:", errors);
        })}
        className="flex flex-col h-full"
      >
        <div className="flex flex-1 flex-col gap-4">
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Services</FormLabel>
                <FormControl>
                  <ServiceSelect form={form} services={services} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SelectedServiceList form={form} />
        </div>
        <div className="flex justify-end">
          <Button disabled={isPending} type="submit">
            {isPending ? "Processing..." : "Reserve & Pay"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
