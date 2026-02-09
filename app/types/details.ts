import { LeaveType } from "@/prisma/generated/prisma/enums";
import { z } from "zod";

export const createLeaveRequestSchema = z.object({
  employee_id: z.number(),
  business_id: z.string(),
  start_date: z.date(),
  end_date: z.date(),
  reason: z.string().min(1, "Reason is required"),
  type: z.nativeEnum(LeaveType),
  businessSlug: z.string(),
});
