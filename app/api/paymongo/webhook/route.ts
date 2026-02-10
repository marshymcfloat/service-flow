import crypto from "crypto";
import { Prisma } from "@/prisma/generated/prisma/client";
import { createBookingInDb } from "@/lib/services/booking";
import { prisma } from "@/prisma/prisma";
import { getPayMongoPaymentIntentById } from "@/lib/server actions/paymongo";
import { extractPaymentIntentReferences } from "@/lib/paymongo/webhook-utils";
import { publishEvent } from "@/lib/services/outbox";

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

// Handle preflight requests (CORS)
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

// Health check endpoint
export async function GET() {
  return new Response("PayMongo webhook endpoint is active", { status: 200 });
}

/**
 * Verify the PayMongo webhook signature
 * @see https://developers.paymongo.com/docs/creating-webhook#3-securing-a-webhook
 */
function verifyPayMongoSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) {
    console.error("No Paymongo-Signature header present");
    return false;
  }

  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("PAYMONGO_WEBHOOK_SECRET not configured");
    return false;
  }

  const parts = signatureHeader.split(",");
  const signatureParts: Record<string, string> = {};
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) {
      signatureParts[key] = value;
    }
  }

  const timestamp = signatureParts.t;
  const providedSignature = signatureParts.li || signatureParts.te;

  if (!timestamp || !providedSignature) {
    console.error("Missing timestamp or signature in header");
    return false;
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    console.error("Invalid timestamp in signature header");
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
    console.error("Webhook signature timestamp outside tolerance window");
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
  const bodyData = body?.data as Record<string, unknown> | undefined;
  const eventId =
    (typeof bodyData?.id === "string" && bodyData.id) ||
    (typeof body?.id === "string" && body.id) ||
    crypto.createHash("sha256").update(rawBody).digest("hex");

  return eventId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function acquireWebhookLock(eventId: string) {
  const lockKey = `paymongo:webhook:${eventId}`;
  const [result] = await prisma.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked
  `;

  return Boolean(result?.locked);
}

async function releaseWebhookLock(eventId: string) {
  const lockKey = `paymongo:webhook:${eventId}`;
  await prisma.$queryRaw`
    SELECT pg_advisory_unlock(hashtext(${lockKey}))
  `;
}

async function wasWebhookProcessed(eventId: string) {
  const existing = await prisma.auditLog.findFirst({
    where: {
      entity_type: "PAYMONGO_WEBHOOK_EVENT",
      entity_id: eventId,
      action: "PROCESSED",
    },
    select: { id: true },
  });

  return Boolean(existing);
}

async function markWebhookProcessed(
  eventId: string,
  eventType: string,
  businessId = "system",
) {
  await prisma.auditLog.create({
    data: {
      entity_type: "PAYMONGO_WEBHOOK_EVENT",
      entity_id: eventId,
      action: "PROCESSED",
      actor_type: "WEBHOOK",
      business_id: businessId,
      changes: {
        eventType,
        processedAt: new Date().toISOString(),
      } as Prisma.JsonObject,
    },
  });
}

async function cancelHeldBookingByPaymentIntent(
  paymentIntentId: string,
  reason: string,
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { paymongo_payment_intent_id: paymentIntentId },
      select: {
        id: true,
        business_id: true,
        status: true,
      },
    });

    if (!booking || booking.status !== "HOLD") {
      return booking?.business_id;
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        hold_expires_at: null,
      },
    });

    await tx.voucher.updateMany({
      where: { used_by_id: booking.id },
      data: {
        used_by_id: null,
        is_active: true,
      },
    });

    await publishEvent(tx as Prisma.TransactionClient, {
      type: "BOOKING_CANCELLED",
      aggregateType: "Booking",
      aggregateId: String(booking.id),
      businessId: booking.business_id,
      payload: {
        bookingId: booking.id,
        reason,
        status: "CANCELLED",
      },
    });

    return booking.business_id;
  });
}

export async function POST(req: Request) {
  let eventId = "";
  let lockAcquired = false;

  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("paymongo-signature");

    if (!verifyPayMongoSignature(rawBody, signatureHeader)) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType = body?.data?.attributes?.type;

    if (!eventType) {
      return new Response("Missing event type", { status: 400 });
    }

    eventId = resolveWebhookEventId(body, rawBody);
    lockAcquired = await acquireWebhookLock(eventId);

    if (!lockAcquired) {
      return new Response("Webhook already being processed", { status: 200 });
    }

    if (await wasWebhookProcessed(eventId)) {
      return new Response("Webhook already processed", { status: 200 });
    }

    let businessIdForAudit = "system";

    if (eventType === "checkout_session.payment.paid") {
      const attributes = body?.data?.attributes?.data?.attributes;
      const metadata = attributes?.metadata;
      const checkoutSessionId = body?.data?.attributes?.data?.id;

      if (!metadata) {
        console.error("No metadata found in webhook event");
        return new Response("No metadata", { status: 400 });
      }

      const {
        businessSlug,
        customerName,
        customerId,
        email,
        services: servicesJson,
        scheduledAt: scheduledAtStr,
        estimatedEnd: estimatedEndStr,
        employeeId: employeeIdStr,
        currentEmployeeId: currentEmployeeIdStr,
        paymentMethod,
        paymentType,
        voucherCode,
      } = metadata;

      if (!businessSlug || !servicesJson) {
        console.error("Missing required metadata fields");
        return new Response("Missing metadata", { status: 400 });
      }

      const services = JSON.parse(servicesJson);
      const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : new Date();
      const estimatedEnd = estimatedEndStr
        ? new Date(estimatedEndStr)
        : new Date();
      const employeeId = employeeIdStr
        ? parseInt(employeeIdStr, 10)
        : undefined;
      const currentEmployeeId = currentEmployeeIdStr
        ? parseInt(currentEmployeeIdStr, 10)
        : undefined;

      try {
        const booking = await createBookingInDb({
          businessSlug,
          customerId,
          customerName,
          email,
          services,
          scheduledAt,
          estimatedEnd,
          employeeId,
          currentEmployeeId,
          paymentMethod: paymentMethod as "QRPH",
          paymentType: paymentType as "FULL" | "DOWNPAYMENT",
          voucherCode,
          paymentConfirmed: true,
          paymongoCheckoutSessionId: checkoutSessionId,
        });
        businessIdForAudit = booking.business_id;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          checkoutSessionId
        ) {
          const existing = await prisma.booking.findFirst({
            where: { paymongo_checkout_session_id: checkoutSessionId },
            select: { business_id: true },
          });
          businessIdForAudit = existing?.business_id || "system";
        } else {
          throw error;
        }
      }

      await markWebhookProcessed(eventId, eventType, businessIdForAudit);
      return new Response("Webhook processed", { status: 200 });
    }

    if (eventType === "payment.paid") {
      const { paymentIntentId, paymentId, paymentMethodId } =
        extractPaymentIntentReferences(body);

      if (!paymentIntentId) {
        console.error("Missing payment intent ID in payment.paid event");
        return new Response("Missing payment intent ID", { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const existingBooking = await tx.booking.findFirst({
          where: { paymongo_payment_intent_id: paymentIntentId },
          select: {
            id: true,
            business_id: true,
            status: true,
            paymongo_payment_method_id: true,
          },
        });

        if (!existingBooking) {
          return { kind: "missing" as const, businessId: "system" };
        }

        if (existingBooking.status === "HOLD") {
          await tx.booking.update({
            where: { id: existingBooking.id },
            data: {
              status: "ACCEPTED",
              hold_expires_at: null,
              paymongo_payment_id: paymentId,
              paymongo_payment_method_id:
                paymentMethodId || existingBooking.paymongo_payment_method_id,
            },
          });

          await publishEvent(tx as Prisma.TransactionClient, {
            type: "BOOKING_CONFIRMED",
            aggregateType: "Booking",
            aggregateId: String(existingBooking.id),
            businessId: existingBooking.business_id,
            payload: {
              bookingId: existingBooking.id,
              status: "ACCEPTED",
            },
          });
        }

        return {
          kind: "found" as const,
          businessId: existingBooking.business_id,
        };
      });

      if (result.kind === "missing") {
        const metadata = await resolvePaymentIntentMetadata(paymentIntentId);

        if (isRecord(metadata)) {
          try {
            const booking = await createBookingFromMetadata({
              metadata,
              paymentIntentId,
              paymentMethodId,
              paymentId,
            });
            businessIdForAudit = booking.business_id;
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              const existing = await prisma.booking.findFirst({
                where: { paymongo_payment_intent_id: paymentIntentId },
                select: { business_id: true },
              });
              businessIdForAudit = existing?.business_id || "system";
            } else {
              throw error;
            }
          }
        } else {
          console.error(
            `[Webhook] Payment ${paymentIntentId} successful but metadata was unavailable.`,
          );
          throw new Error(
            `Missing metadata for paid payment intent ${paymentIntentId}`,
          );
        }
      } else {
        businessIdForAudit = result.businessId;
      }

      await markWebhookProcessed(eventId, eventType, businessIdForAudit);
      return new Response("Webhook processed", { status: 200 });
    }

    if (eventType === "payment.failed" || eventType === "qrph.expired") {
      const { paymentIntentId } = extractPaymentIntentReferences(body);
      if (paymentIntentId) {
        const bookingBusinessId = await cancelHeldBookingByPaymentIntent(
          paymentIntentId,
          eventType,
        );
        if (bookingBusinessId) {
          businessIdForAudit = bookingBusinessId;
        }
      }

      await markWebhookProcessed(eventId, eventType, businessIdForAudit);
      return new Response("Webhook processed", { status: 200 });
    }

    await markWebhookProcessed(eventId, eventType, businessIdForAudit);
    return new Response("Event ignored", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  } finally {
    if (lockAcquired && eventId) {
      try {
        await releaseWebhookLock(eventId);
      } catch (error) {
        console.error("Failed to release webhook lock:", error);
      }
    }
  }
}

async function resolvePaymentIntentMetadata(paymentIntentId: string) {
  const paymentIntent = await getPayMongoPaymentIntentById(paymentIntentId);
  return paymentIntent?.attributes?.metadata;
}

async function createBookingFromMetadata({
  metadata,
  paymentIntentId,
  paymentMethodId,
  paymentId,
}: {
  metadata: Record<string, unknown>;
  paymentIntentId?: string;
  paymentMethodId?: string;
  paymentId?: string;
}) {
  const metadataRecord = metadata as Record<string, string | undefined>;

  const {
    businessSlug,
    customerName,
    customerId,
    email,
    services: servicesJson,
    scheduledAt: scheduledAtStr,
    estimatedEnd: estimatedEndStr,
    employeeId: employeeIdStr,
    currentEmployeeId: currentEmployeeIdStr,
    paymentMethod,
    paymentType,
    voucherCode,
  } = metadataRecord;

  if (!businessSlug || !servicesJson || !customerName) {
    throw new Error("Missing required metadata fields");
  }

  const services = JSON.parse(servicesJson);
  const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : new Date();
  const estimatedEnd = estimatedEndStr ? new Date(estimatedEndStr) : new Date();
  const employeeId = employeeIdStr ? parseInt(employeeIdStr, 10) : undefined;
  const currentEmployeeId = currentEmployeeIdStr
    ? parseInt(currentEmployeeIdStr, 10)
    : undefined;

  return createBookingInDb({
    businessSlug,
    customerId,
    customerName,
    email,
    services,
    scheduledAt,
    estimatedEnd,
    employeeId,
    currentEmployeeId,
    paymentMethod: paymentMethod as "QRPH",
    paymentType: paymentType as "FULL" | "DOWNPAYMENT",
    voucherCode,
    paymentConfirmed: true,
    paymongoPaymentIntentId: paymentIntentId,
    paymongoPaymentMethodId: paymentMethodId,
    paymongoPaymentId: paymentId,
  });
}
