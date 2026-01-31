import { z } from "zod";

const serviceSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  duration: z.number().nullable(),
  business_id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  quantity: z.number().min(1).default(1),
});

export const paymentMethodEnum = z.enum(["CASH", "QRPH"]);
export const paymentTypeEnum = z.enum(["FULL", "DOWNPAYMENT"]);

export const createBookingSchema = z
  .object({
    customerId: z.string().optional(),
    customerName: z.string().min(1, "Customer name is required").optional(),
    services: z.array(serviceSchema),
    scheduledAt: z.coerce.date({ message: "Please select a date and time" }),
    selectedTime: z.date().optional(),
    employeeId: z.number().optional(),
    paymentMethod: paymentMethodEnum.default("QRPH"),
    paymentType: paymentTypeEnum.default("FULL"),
    email: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.customerId || data.customerName, {
    message: "Please select an existing customer or enter a new customer name",
    path: ["customerName"],
  });

export type CreateBookingTypes = z.infer<typeof createBookingSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;
export type PaymentType = z.infer<typeof paymentTypeEnum>;
