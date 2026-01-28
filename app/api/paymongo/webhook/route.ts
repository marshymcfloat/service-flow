import { prisma } from "@/prisma/prisma";

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
      services: servicesJson,
      scheduledAt: scheduledAtStr,
      estimatedEnd: estimatedEndStr,
      employeeId: employeeIdStr,
      currentEmployeeId: currentEmployeeIdStr,
      paymentType,
    } = metadata;
    let { customerId } = metadata;

    const services = JSON.parse(servicesJson);
    const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : null;
    const estimatedEnd = estimatedEndStr ? new Date(estimatedEndStr) : null;
    const employeeId = employeeIdStr ? parseInt(employeeIdStr, 10) : null;
    const currentEmployeeId = currentEmployeeIdStr
      ? parseInt(currentEmployeeIdStr, 10)
      : null;

    // Find Business
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
    });

    if (!business) {
      console.error(`Business with slug ${businessSlug} not found`);
      return new Response("Business not found", { status: 404 });
    }

    // Handle Customer (Find or Create)
    if (!customerId) {
      const newCustomer = await prisma.customer.create({
        data: {
          name: customerName,
          business_id: business.id,
        },
      });
      customerId = newCustomer.id;
    }

    // Calculate total
    const total = services.reduce(
      (acc: number, s: any) => acc + s.price * s.quantity,
      0,
    );

    // Determine booking status based on payment type
    const isDownpayment = paymentType === "DOWNPAYMENT";
    const bookingStatus = isDownpayment ? "DOWNPAYMENT_PAID" : "COMPLETED";
    const downpaymentAmount = isDownpayment ? total * 0.5 : null;

    const booking = await prisma.booking.create({
      data: {
        business_id: business.id,
        customer_id: customerId,
        grand_total: total,
        total_discount: 0,
        payment_method: "QRPH",
        status: bookingStatus,
        scheduled_at: scheduledAt,
        estimated_end: estimatedEnd,
        downpayment: downpaymentAmount,
        availed_services: {
          create: services.map((s: any, index: number) => {
            const serviceDuration = s.duration || 30;
            const previousDurations = services
              .slice(0, index)
              .reduce(
                (sum: number, prev: any) =>
                  sum + (prev.duration || 30) * prev.quantity,
                0,
              );

            const serviceStart = scheduledAt
              ? new Date(scheduledAt.getTime() + previousDurations * 60 * 1000)
              : null;
            const serviceEnd = serviceStart
              ? new Date(
                  serviceStart.getTime() +
                    serviceDuration * s.quantity * 60 * 1000,
                )
              : null;

            // Determine claiming status
            const isClaimed = s.claimedByCurrentEmployee && !!currentEmployeeId;
            const serverId = isClaimed ? currentEmployeeId : employeeId;
            const status = isClaimed ? "CLAIMED" : "PENDING";
            const claimedAt = isClaimed ? new Date() : null;

            return {
              service_id: s.id,
              price: s.price,
              discount: 0,
              final_price: s.price,
              commission_base: s.price,
              served_by_id: serverId,
              status: status,
              claimed_at: claimedAt,
              scheduled_at: serviceStart,
              estimated_end: serviceEnd,
            };
          }),
        },
      },
    });

    console.log(
      `Booking created successfully: ${booking.id} (${bookingStatus})`,
    );

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
