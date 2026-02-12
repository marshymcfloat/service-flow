import crypto from "crypto";
import { getCurrentDateTimePH } from "@/lib/date-utils";
import { markInvoicePaid, qualifyAndRewardReferralForBusiness } from "@/features/billing/subscription-service";
import { prisma } from "@/prisma/prisma";

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

function verifyPayMongoSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const webhookSecret = process.env.PAYMONGO_SUBSCRIPTION_WEBHOOK_SECRET || process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const parts = signatureHeader.split(",");
  const signatureParts: Record<string, string> = {};
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) signatureParts[key] = value;
  }

  const timestamp = signatureParts.t;
  const providedSignature = signatureParts.li || signatureParts.te;
  if (!timestamp || !providedSignature) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
    return false;
  }

  const signatureString = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signatureString)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(providedSignature, "utf8"),
    );
  } catch {
    return false;
  }
}

function resolveWebhookEventId(body: Record<string, unknown>, rawBody: string) {
  const data = body.data as Record<string, unknown> | undefined;
  return (
    (typeof data?.id === "string" && data.id) ||
    (typeof body.id === "string" && body.id) ||
    crypto.createHash("sha256").update(rawBody).digest("hex")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractMetadata(body: unknown) {
  if (!isRecord(body)) return null;
  const data = isRecord(body.data) ? body.data : null;
  const dataAttributes = data && isRecord(data.attributes) ? data.attributes : null;
  const nestedData = dataAttributes && isRecord(dataAttributes.data) ? dataAttributes.data : null;
  const nestedAttributes = nestedData && isRecord(nestedData.attributes) ? nestedData.attributes : null;
  const metadata =
    (nestedAttributes && isRecord(nestedAttributes.metadata) && nestedAttributes.metadata) ||
    (dataAttributes && isRecord(dataAttributes.metadata) && dataAttributes.metadata);
  return metadata ?? null;
}

async function wasProcessed(eventId: string) {
  const found = await prisma.auditLog.findFirst({
    where: {
      entity_type: "PAYMONGO_SUBSCRIPTION_WEBHOOK",
      entity_id: eventId,
      action: "PROCESSED",
    },
    select: { id: true },
  });
  return Boolean(found);
}

async function markProcessed(eventId: string, eventType: string, businessId = "system") {
  await prisma.auditLog.create({
    data: {
      entity_type: "PAYMONGO_SUBSCRIPTION_WEBHOOK",
      entity_id: eventId,
      action: "PROCESSED",
      actor_type: "WEBHOOK",
      business_id: businessId,
      changes: {
        eventType,
        processedAt: getCurrentDateTimePH().toISOString(),
      },
    },
  });
}

async function acquireWebhookLock(eventId: string) {
  const key = `paymongo:subscription:webhook:${eventId}`;
  const [result] = await prisma.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${key})) AS locked
  `;
  return Boolean(result?.locked);
}

async function releaseWebhookLock(eventId: string) {
  const key = `paymongo:subscription:webhook:${eventId}`;
  await prisma.$queryRaw`
    SELECT pg_advisory_unlock(hashtext(${key}))
  `;
}

function extractPaidAmountCents(body: unknown) {
  if (!isRecord(body)) return null;
  const data = isRecord(body.data) ? body.data : null;
  const dataAttributes = data && isRecord(data.attributes) ? data.attributes : null;
  const nestedData = dataAttributes && isRecord(dataAttributes.data) ? dataAttributes.data : null;
  const nestedAttributes = nestedData && isRecord(nestedData.attributes) ? nestedData.attributes : null;
  const amount =
    (typeof nestedAttributes?.amount === "number" && nestedAttributes.amount) ||
    (typeof dataAttributes?.amount === "number" && dataAttributes.amount) ||
    null;
  return amount;
}

function extractPaymentReferences(body: unknown) {
  if (!isRecord(body)) return { paymentIntentId: null, paymentMethodId: null, paymentId: null };
  const data = isRecord(body.data) ? body.data : null;
  const dataAttributes = data && isRecord(data.attributes) ? data.attributes : null;
  const nestedData = dataAttributes && isRecord(dataAttributes.data) ? dataAttributes.data : null;
  const nestedAttributes = nestedData && isRecord(nestedData.attributes) ? nestedData.attributes : null;

  const paymentId =
    (typeof nestedData?.id === "string" && nestedData.id) ||
    (typeof data?.id === "string" && data.id) ||
    null;
  const paymentIntentId =
    (typeof nestedAttributes?.payment_intent_id === "string" &&
      nestedAttributes.payment_intent_id) ||
    null;
  const paymentMethodId =
    (typeof nestedAttributes?.payment_method_id === "string" &&
      nestedAttributes.payment_method_id) ||
    null;
  return { paymentIntentId, paymentMethodId, paymentId };
}

export async function GET() {
  return new Response("PayMongo subscription webhook endpoint is active", {
    status: 200,
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, paymongo-signature",
    },
  });
}

export async function POST(req: Request) {
  let eventId = "";
  let lockAcquired = false;

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("paymongo-signature");
    if (!verifyPayMongoSignature(rawBody, signature)) {
      return new Response("Invalid signature", { status: 401 });
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const data = (body.data ?? {}) as Record<string, unknown>;
    const attributes = (data.attributes ?? {}) as Record<string, unknown>;
    const eventType = typeof attributes.type === "string" ? attributes.type : "";
    if (!eventType) {
      return new Response("Missing event type", { status: 400 });
    }

    eventId = resolveWebhookEventId(body, rawBody);
    lockAcquired = await acquireWebhookLock(eventId);
    if (!lockAcquired) {
      return new Response("Webhook already being processed", { status: 200 });
    }

    if (await wasProcessed(eventId)) {
      return new Response("Webhook already processed", { status: 200 });
    }

    const metadata = extractMetadata(body);
    const billingContext =
      metadata && typeof metadata.billing_context === "string"
        ? metadata.billing_context
        : null;
    if (billingContext !== "SUBSCRIPTION") {
      await markProcessed(eventId, eventType);
      return new Response("Event ignored", { status: 200 });
    }

    const invoiceId =
      metadata && typeof metadata.invoiceId === "string" ? metadata.invoiceId : null;
    if (!invoiceId) {
      return new Response("Missing invoice metadata", { status: 400 });
    }

    if (eventType === "checkout_session.payment.paid" || eventType === "payment.paid") {
      const amountCents = extractPaidAmountCents(body);
      const refs = extractPaymentReferences(body);
      const invoice = await markInvoicePaid({
        invoiceId,
        paidAmountCentavos: amountCents ?? 0,
        paymentIntentId: refs.paymentIntentId,
        paymentMethodId: refs.paymentMethodId,
        paymentId: refs.paymentId,
      });

      await qualifyAndRewardReferralForBusiness(invoice.business_id);
      await markProcessed(eventId, eventType, invoice.business_id);
      return new Response("Webhook processed", { status: 200 });
    }

    await markProcessed(eventId, eventType);
    return new Response("Event ignored", { status: 200 });
  } catch (error) {
    console.error("Subscription webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  } finally {
    if (lockAcquired && eventId) {
      try {
        await releaseWebhookLock(eventId);
      } catch (error) {
        console.error("Failed to release subscription webhook lock:", error);
      }
    }
  }
}
