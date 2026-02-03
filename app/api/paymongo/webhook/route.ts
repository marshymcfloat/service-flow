import crypto from "crypto";
import { createBookingInDb } from "@/lib/services/booking";

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

    const eventType = body.data.attributes.type;
    if (eventType !== "checkout_session.payment.paid") {
      return new Response("Event ignored", { status: 200 });
    }

    const attributes = body.data.attributes.data.attributes;
    const metadata = attributes.metadata;

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

    if (!businessSlug) {
      console.error("Missing required metadata fields: businessSlug");
      return new Response("Missing metadata", { status: 400 });
    }

    const services = JSON.parse(servicesJson);
    const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : new Date();
    const estimatedEnd = estimatedEndStr
      ? new Date(estimatedEndStr)
      : new Date();
    const employeeId = employeeIdStr ? parseInt(employeeIdStr, 10) : undefined;
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
    });

    console.log(
      `Booking created successfully: ${booking.id} (${booking.status})`,
    );

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
