import { prisma } from "@/prisma/prisma";
import { createBookingInDb } from "@/lib/services/booking";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verify the event type
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
      services: servicesJson,
      scheduledAt: scheduledAtStr,
      estimatedEnd: estimatedEndStr,
      employeeId: employeeIdStr,
      currentEmployeeId: currentEmployeeIdStr,
      paymentMethod,
      paymentType,
    } = metadata;

    // Check required fields (customerId is optional for new customers)
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
      services,
      scheduledAt,
      estimatedEnd,
      employeeId,
      currentEmployeeId,
      paymentMethod: paymentMethod as "QRPH",
      paymentType: paymentType as "FULL" | "DOWNPAYMENT",
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
