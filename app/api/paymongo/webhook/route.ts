import crypto from "crypto";
import { createBookingInDb } from "@/lib/services/booking";
import { prisma } from "@/prisma/prisma";
import { getPayMongoPaymentIntentById } from "@/lib/server actions/paymongo";
import { extractPaymentIntentReferences } from "@/lib/paymongo/webhook-utils";
import { sendBookingConfirmation } from "@/lib/email/send-booking-details";

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

  // Parse the signature header: t=timestamp,te=testsig,li=livesig
  const parts = signatureHeader.split(",");
  const signatureParts: Record<string, string> = {};
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) {
      signatureParts[key] = value;
    }
  }

  const timestamp = signatureParts["t"];
  const testSignature = signatureParts["te"];
  const liveSignature = signatureParts["li"];

  if (!timestamp) {
    console.error("No timestamp in signature header");
    return false;
  }

  // Create the signature string: timestamp.rawBody
  const signatureString = `${timestamp}.${rawBody}`;

  // Generate HMAC-SHA256
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signatureString)
    .digest("hex");

  // Check against test or live signature based on which is present
  const providedSignature = liveSignature || testSignature;

  if (!providedSignature) {
    console.error("No signature found in header");
    return false;
  }

  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature),
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("paymongo-signature");

    // Verify signature
    if (!verifyPayMongoSignature(rawBody, signatureHeader)) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType = body?.data?.attributes?.type;

    if (!eventType) {
      return new Response("Missing event type", { status: 400 });
    }

    if (eventType === "checkout_session.payment.paid") {
      const attributes = body.data.attributes.data.attributes;
      const metadata = attributes.metadata;
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
        isWalkIn: isWalkInStr,
      } = metadata;

      if (!businessSlug) {
        console.error("Missing required metadata fields: businessSlug");
        return new Response("Missing metadata", { status: 400 });
      }

      const services = JSON.parse(servicesJson);
      const scheduledAt = scheduledAtStr
        ? new Date(scheduledAtStr)
        : new Date();
      const estimatedEnd = estimatedEndStr
        ? new Date(estimatedEndStr)
        : new Date();
      const employeeId = employeeIdStr
        ? parseInt(employeeIdStr, 10)
        : undefined;
      const currentEmployeeId = currentEmployeeIdStr
        ? parseInt(currentEmployeeIdStr, 10)
        : undefined;

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

      console.log(
        `Booking created successfully: ${booking.id} (${booking.status})`,
      );

      if (isWalkInStr !== "true") {
        await sendBookingConfirmation(booking.id);
      }

      return new Response("Webhook processed", { status: 200 });
    }

    if (eventType === "payment.paid") {
      const { paymentIntentId, paymentId, paymentMethodId } =
        extractPaymentIntentReferences(body);

      if (!paymentIntentId) {
        console.error("Missing payment intent ID in payment.paid event");
        return new Response("Missing payment intent ID", { status: 400 });
      }

      const existingBooking = await prisma.booking.findFirst({
        where: { paymongo_payment_intent_id: paymentIntentId },
      });

      if (existingBooking) {
        if (existingBooking.status !== "ACCEPTED") {
          await prisma.booking.update({
            where: { id: existingBooking.id },
            data: {
              status: "ACCEPTED",
              hold_expires_at: null,
              paymongo_payment_id: paymentId,
              paymongo_payment_method_id:
                paymentMethodId || existingBooking.paymongo_payment_method_id,
            },
          });
        }

        // Send email if not walk-in
        if (existingBooking.payment_method === "QRPH") {
          // We can rely on the existing booking data, no need to parse metadata again for isWalkIn
          // We might need to check if it IS a walk-in, but usually online payments are not walk-ins in this flow?
          // actually, walk-ins can pay via QR.
          // Let's fetch metadata just for that flag if needed, or check the booking details if we stored it.
          // booking model doesn't seem to have isWalkIn flag directly?
          // It's checked in createBooking.
          // For safety, let's just send the email. If it's a walk-in, they get an email, which is fine.
          await sendBookingConfirmation(existingBooking.id);
        }

        return new Response("Webhook processed", { status: 200 });
      }

      console.error(
        `[Webhook] Payment ${paymentIntentId} successful but no matching booking found.`,
      );
      return new Response("Booking not found", { status: 404 });
    }

    if (eventType === "payment.failed" || eventType === "qrph.expired") {
      const { paymentIntentId } = extractPaymentIntentReferences(body);

      if (paymentIntentId) {
        const booking = await prisma.booking.findFirst({
          where: { paymongo_payment_intent_id: paymentIntentId },
        });

        if (booking && booking.status !== "CANCELLED") {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { status: "CANCELLED" },
          });
        }
      }

      return new Response("Webhook processed", { status: 200 });
    }

    return new Response("Event ignored", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
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
  metadata: Record<string, any>;
  paymentIntentId?: string;
  paymentMethodId?: string;
  paymentId?: string;
}) {
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
    isWalkIn: isWalkInStr,
  } = metadata;

  if (!businessSlug) {
    throw new Error("Missing required metadata fields: businessSlug");
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
