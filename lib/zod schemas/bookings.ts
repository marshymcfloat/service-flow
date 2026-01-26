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

export const createBookingSchema = z
  .object({
    customerId: z.string().optional(),
    customerName: z.string().min(1, "Customer name is required").optional(),
    services: z.array(serviceSchema),
  })
  .refine((data) => data.customerId || data.customerName, {
    message: "Please select an existing customer or enter a new customer name",
    path: ["customerName"],
  });

export type CreateBookingTypes = z.infer<typeof createBookingSchema>;
