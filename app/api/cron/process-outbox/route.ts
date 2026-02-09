import { NextResponse, connection } from "next/server";
import { prisma } from "@/prisma/prisma";
import type { OutboxEventType } from "@/lib/services/outbox";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 10;

/**
 * Event handler registry - add handlers for each event type here
 */
async function handleEvent(
  eventType: string,
  payload: Record<string, unknown>,
  businessId: string,
): Promise<void> {
  switch (eventType as OutboxEventType) {
    case "BOOKING_CREATED":
      await handleBookingCreated(payload, businessId);
      break;
    case "BOOKING_CONFIRMED":
      await handleBookingConfirmed(payload, businessId);
      break;
    case "BOOKING_CANCELLED":
      await handleBookingCancelled(payload, businessId);
      break;
    case "PAYMENT_CONFIRMED":
      await handlePaymentConfirmed(payload, businessId);
      break;
    case "REMINDER_DUE":
      await handleReminderDue(payload, businessId);
      break;
    case "PAYSLIP_GENERATED":
      await handlePayslipGenerated(payload, businessId);
      break;
    default:
      console.warn(`Unknown event type: ${eventType}`);
  }
}

// Event handlers - implement your email/webhook logic here
// Event handlers - implement your email/webhook logic here
async function handleBookingCreated(
  payload: Record<string, unknown>,
  _businessId: string,
) {
  const bookingId = payload.bookingId as number;
  if (bookingId) {
    const { sendBookingConfirmation } =
      await import("@/lib/email/send-booking-details");
    const result = await sendBookingConfirmation(bookingId);
    if (!result || !result.success) {
      throw new Error(
        `Failed to send booking confirmation email: ${result?.error}`,
      );
    }
  }
}

async function handleBookingConfirmed(
  payload: Record<string, unknown>,
  _businessId: string,
) {
  // exact same logic as created for now, as sendBookingConfirmation handles the template
  const bookingId = payload.bookingId as number;
  if (bookingId) {
    const { sendBookingConfirmation } =
      await import("@/lib/email/send-booking-details");
    const result = await sendBookingConfirmation(bookingId);
    if (!result || !result.success) {
      throw new Error(
        `Failed to send booking confirmed email: ${result?.error}`,
      );
    }
  }
}

async function handleBookingCancelled(
  payload: Record<string, unknown>,
  _businessId: string,
) {
  const { email, customerName, reason } = payload;
  if (email && typeof email === "string") {
    console.log(
      `[Outbox] Would send cancellation email to ${email} for ${customerName}, reason: ${reason}`,
    );
  }
}

async function handlePaymentConfirmed(
  payload: Record<string, unknown>,
  _businessId: string,
) {
  const { email, amount } = payload;
  if (email && typeof email === "string") {
    console.log(
      `[Outbox] Would send payment receipt to ${email} for ${amount}`,
    );
  }
}

async function handleReminderDue(
  payload: Record<string, unknown>,
  _businessId: string,
) {
  const { email, customerName, scheduledAt } = payload;
  if (email && typeof email === "string") {
    console.log(
      `[Outbox] Would send reminder to ${email} for ${customerName} at ${scheduledAt}`,
    );
  }
}

async function handlePayslipGenerated(
  payload: Record<string, unknown>,
  _businessId: string,
) {
  const { employeeEmail, period } = payload;
  if (employeeEmail && typeof employeeEmail === "string") {
    console.log(
      `[Outbox] Would send payslip to ${employeeEmail} for period ${period}`,
    );
  }
}

/**
 * Processes pending outbox messages.
 * Configure this to run every 1-2 minutes via cron-job.org or similar.
 */
export async function GET(request: Request) {
  await connection();
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": "Basic realm='Secure Area'" },
      });
    }

    const [scheme, encoded] = authHeader.split(" ");

    if (scheme !== "Basic" || !encoded) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const decoded = Buffer.from(encoded, "base64").toString();
    const [user, pass] = decoded.split(":");

    const validUser = process.env.CRON_USER || "admin";
    const validPass = process.env.CRON_PASSWORD;

    if (!validPass || user !== validUser || pass !== validPass) {
      console.error("Invalid cron credentials");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch unprocessed messages that haven't exceeded max attempts
    const messages = await prisma.outboxMessage.findMany({
      where: {
        processed: false,
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: { created_at: "asc" },
      take: BATCH_SIZE,
    });

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const msg of messages) {
      try {
        await handleEvent(
          msg.event_type,
          msg.payload as Record<string, unknown>,
          msg.business_id,
        );

        // Mark as processed
        await prisma.outboxMessage.update({
          where: { id: msg.id },
          data: {
            processed: true,
            processed_at: new Date(),
          },
        });

        results.push({ id: msg.id, success: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Increment attempts and record error
        await prisma.outboxMessage.update({
          where: { id: msg.id },
          data: {
            attempts: { increment: 1 },
            last_error: errorMessage,
          },
        });

        results.push({ id: msg.id, success: false, error: errorMessage });
        console.error(`[Outbox] Failed to process ${msg.id}:`, errorMessage);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `[Outbox] Processed ${messages.length} messages: ${successCount} success, ${failCount} failed`,
    );

    return NextResponse.json({
      success: true,
      processed: messages.length,
      succeeded: successCount,
      failed: failCount,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Process outbox cron error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
