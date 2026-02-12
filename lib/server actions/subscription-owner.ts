"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createCheckoutForInvoice,
  createInvoiceForSubscription,
  getBillingCollectionMode,
} from "@/features/billing/subscription-service";
import { requireAuth } from "@/lib/auth/guards";
import { getCurrentDateTimePH } from "@/lib/date-utils";
import { publishEvent } from "@/lib/services/outbox";
import { Prisma } from "@/prisma/generated/prisma/client";
import { prisma } from "@/prisma/prisma";

const submitManualPaymentReferenceSchema = z.object({
  invoiceId: z.string().min(1),
  paymentReference: z.string().trim().min(2).max(120),
  amountCentavos: z.number().int().positive().max(1_000_000_000).optional(),
  note: z.string().trim().max(1000).optional(),
  proofUrl: z.string().trim().url().max(2000).optional(),
});

export async function createOwnerSubscriptionInvoiceAction(reason = "OWNER_MANUAL_RENEWAL") {
  const auth = await requireAuth();
  if (!auth.success) return auth;

  const business = await prisma.business.findUnique({
    where: { slug: auth.businessSlug },
    select: {
      id: true,
      subscriptions: {
        select: { id: true },
      },
    },
  });
  const subscriptionId = business?.subscriptions[0]?.id;
  if (!subscriptionId) return { success: false as const, error: "Subscription not found" };

  const invoice = await createInvoiceForSubscription(subscriptionId, reason);
  revalidatePath(`/app/${auth.businessSlug}/billing`);
  return { success: true as const, data: invoice };
}

export async function createOwnerSubscriptionCheckoutAction(invoiceId: string) {
  const auth = await requireAuth();
  if (!auth.success) return auth;

  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      business: {
        select: { slug: true },
      },
    },
  });
  if (!invoice) return { success: false as const, error: "Invoice not found" };
  if (invoice.business.slug !== auth.businessSlug) {
    return { success: false as const, error: "Forbidden" };
  }

  const checkout = await createCheckoutForInvoice(invoiceId);
  revalidatePath(`/app/${auth.businessSlug}/billing`);
  return { success: true as const, data: checkout };
}

export async function redirectOwnerSubscriptionCheckoutAction(invoiceId: string) {
  const result = await createOwnerSubscriptionCheckoutAction(invoiceId);
  if (!result.success) {
    throw new Error(result.error);
  }
  redirect(result.data.checkoutUrl);
}

export async function submitManualPaymentReferenceAction(
  rawInput: z.infer<typeof submitManualPaymentReferenceSchema>,
) {
  const auth = await requireAuth();
  if (!auth.success) return auth;

  if (getBillingCollectionMode() !== "MANUAL_ONLY") {
    return {
      success: false as const,
      error:
        "Manual payment submission is disabled while checkout collection is enabled.",
    };
  }

  const parsedInput = submitManualPaymentReferenceSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return {
      success: false as const,
      error:
        parsedInput.error.issues[0]?.message ||
        "Invalid manual payment submission.",
    };
  }

  const input = parsedInput.data;
  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: input.invoiceId },
    select: {
      id: true,
      status: true,
      business_id: true,
      business: {
        select: { slug: true },
      },
      metadata: true,
    },
  });

  if (!invoice) {
    return { success: false as const, error: "Invoice not found" };
  }
  if (invoice.business.slug !== auth.businessSlug) {
    return { success: false as const, error: "Forbidden" };
  }
  if (!["OPEN", "DRAFT"].includes(invoice.status)) {
    return {
      success: false as const,
      error: "Manual payment can only be submitted for open invoices.",
    };
  }

  const submittedAt = getCurrentDateTimePH();
  const existingMetadata =
    invoice.metadata &&
    typeof invoice.metadata === "object" &&
    !Array.isArray(invoice.metadata)
      ? (invoice.metadata as Record<string, unknown>)
      : {};

  const hasExistingManualSubmission =
    typeof existingMetadata.manual_payment_submitted_at === "string" &&
    existingMetadata.manual_payment_submitted_at.trim().length > 0;

  if (hasExistingManualSubmission) {
    return {
      success: false as const,
      error:
        "Manual payment already submitted for this invoice. Wait for verification before sending another reference.",
    };
  }

  const nextMetadata: Record<string, unknown> = {
    ...existingMetadata,
    manual_payment_reference: input.paymentReference,
    manual_payment_submitted_at: submittedAt.toISOString(),
  };

  if (typeof input.amountCentavos === "number") {
    nextMetadata.manual_payment_amount_centavos = input.amountCentavos;
  } else {
    delete nextMetadata.manual_payment_amount_centavos;
  }

  if (input.note) {
    nextMetadata.manual_payment_note = input.note;
  } else {
    delete nextMetadata.manual_payment_note;
  }

  if (input.proofUrl) {
    nextMetadata.manual_payment_proof_url = input.proofUrl;
  } else {
    delete nextMetadata.manual_payment_proof_url;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedInvoice = await tx.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: {
        metadata: nextMetadata as Prisma.InputJsonValue,
      },
    });

    await publishEvent(tx, {
      type: "MANUAL_PAYMENT_SUBMITTED",
      aggregateType: "SubscriptionInvoice",
      aggregateId: invoice.id,
      businessId: invoice.business_id,
      payload: {
        invoiceId: invoice.id,
        businessId: invoice.business_id,
        businessSlug: auth.businessSlug,
        submittedByUserId: auth.session.user.id,
        paymentReference: input.paymentReference,
        amountCentavos: input.amountCentavos,
        note: input.note,
        proofUrl: input.proofUrl,
        submittedAt: submittedAt.toISOString(),
      },
    });

    return updatedInvoice;
  });

  revalidatePath(`/app/${auth.businessSlug}/billing`);
  revalidatePath("/platform/invoices");

  return { success: true as const, data: updated };
}
