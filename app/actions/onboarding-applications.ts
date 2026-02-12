"use server";

import { z } from "zod";

import { prisma, supportsOnboardingApplicationModel } from "@/prisma/prisma";
import { createOnboardingStatusToken } from "@/lib/security/onboarding-status-token";
import { sendOnboardingApplicationAcknowledgement } from "@/lib/services/onboarding-applications";

const createOnboardingApplicationSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().max(30).optional(),
  notes: z.string().max(1000).optional(),
  referralCode: z.string().max(50).optional(),
});

export async function createOnboardingApplicationAction(
  rawInput: z.infer<typeof createOnboardingApplicationSchema>,
) {
  if (!supportsOnboardingApplicationModel()) {
    return {
      success: false as const,
      error: "Onboarding applications are unavailable. Please restart the server.",
    };
  }

  const input = createOnboardingApplicationSchema.parse(rawInput);
  const normalizedReferralCode = input.referralCode?.trim().toUpperCase() || null;

  let referralCodeId: string | null = null;
  if (normalizedReferralCode) {
    const referralCode = await prisma.referralCode.findUnique({
      where: { code: normalizedReferralCode },
      select: { id: true, is_active: true },
    });
    if (!referralCode || !referralCode.is_active) {
      return { success: false as const, error: "Referral code is invalid or inactive." };
    }
    referralCodeId = referralCode.id;
  }

  const application = await prisma.onboardingApplication.create({
    data: {
      business_name: input.businessName.trim(),
      owner_name: input.ownerName.trim(),
      owner_email: input.ownerEmail.trim().toLowerCase(),
      owner_phone: input.ownerPhone?.trim() || null,
      notes: input.notes?.trim() || null,
      referral_code_input: normalizedReferralCode,
      referral_code_id: referralCodeId,
      status: "NEW",
    },
  });

  const statusToken = createOnboardingStatusToken({
    applicationId: application.id,
    ownerEmail: application.owner_email,
  });

  const acknowledgement = await sendOnboardingApplicationAcknowledgement({
    ownerEmail: application.owner_email,
    ownerName: application.owner_name,
    businessName: application.business_name,
    statusToken,
  });

  return {
    success: true as const,
    data: application,
    statusToken,
    acknowledgementSent: acknowledgement.success,
  };
}
