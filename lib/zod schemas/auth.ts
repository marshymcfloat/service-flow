import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(0, { message: "Password is required" }),
});

export const registerSchema = z.object({});
export type LoginSchemaType = z.infer<typeof loginSchema>;
