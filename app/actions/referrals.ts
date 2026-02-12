"use server";

import { z } from "zod";

import { createReferralLead } from "@/features/billing/subscription-service";

const createReferralLeadSchema = z.object({
  code: z.string().min(3),
  referredBusinessName: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function createReferralLeadAction(
  rawInput: z.infer<typeof createReferralLeadSchema>,
) {
  const input = createReferralLeadSchema.parse(rawInput);
  const lead = await createReferralLead(input);
  return { success: true as const, data: lead };
}
