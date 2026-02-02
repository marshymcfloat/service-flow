import { z } from "zod";

const serviceSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    price: z.number(),
    duration: z.number().nullable().optional(),
    business_id: z.string().optional(),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
    quantity: z.number().min(1).default(1),
    // Allow extra fields like packageId, originalPrice
  })
  .passthrough();

export const paymentMethodEnum = z.enum(["CASH", "QRPH"]);
export const paymentTypeEnum = z.enum(["FULL", "DOWNPAYMENT"]);

export const createBookingSchema = z
  .object({
    customerId: z.string().optional(),
    customerName: z.string().min(1, "Customer name is required").optional(),
    services: z
      .array(serviceSchema)
      .min(1, "Please select at least one service"),
    scheduledAt: z.coerce.date({ message: "Please select a date and time" }),
    selectedTime: z.date().optional(),
    employeeId: z.number().optional(),
    paymentMethod: paymentMethodEnum.default("QRPH"),
    paymentType: paymentTypeEnum.default("FULL"),
    email: z
      .string()
      .optional()
      .refine(
        (val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        { message: "Invalid email address" },
      ),
  })
  .refine((data) => data.customerId || data.customerName, {
    message: "Please select an existing customer or enter a new customer name",
    path: ["customerName"],
  });

export type CreateBookingTypes = z.infer<typeof createBookingSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;
export type PaymentType = z.infer<typeof paymentTypeEnum>;
