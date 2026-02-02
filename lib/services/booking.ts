import { prisma } from "@/prisma/prisma";

export type BookingServiceParams = {
  businessSlug: string;
  customerId?: string;
  customerName: string;
  services: {
    id: number;
    name: string;
    price: number;
    quantity: number;
    duration?: number;
    claimedByCurrentEmployee?: boolean;
    packageId?: number;
    originalPrice?: number;
  }[];
  scheduledAt: Date;
  estimatedEnd: Date;
  employeeId?: number | null;
  currentEmployeeId?: number | null;
  paymentMethod: "CASH" | "QRPH";

  paymentType: "FULL" | "DOWNPAYMENT";
  email?: string;
};

export async function createBookingInDb({
  businessSlug,
  customerId,
  customerName,
  services,
  scheduledAt,
  estimatedEnd,
  employeeId,
  currentEmployeeId,
  paymentMethod,

  paymentType,
  email,
}: BookingServiceParams) {
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
  });

  if (!business) {
    throw new Error(`Business with slug ${businessSlug} not found`);
  }

  let finalCustomerId = customerId;

  // Logic to handle existing customer update or lookup
  if (finalCustomerId) {
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: finalCustomerId },
    });

    if (existingCustomer) {
      // Update email if provided and not set
      if (email && !existingCustomer.email) {
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: { email },
        });
      }
    }
  } else {
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        AND: [
          { business_id: business.id },
          { name: { equals: customerName, mode: "insensitive" } },
        ],
      },
    });

    if (existingCustomer) {
      finalCustomerId = existingCustomer.id;
      // Update email if provided and not set
      if (email && !existingCustomer.email) {
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: { email },
        });
      }
    } else {
      const newCustomer = await prisma.customer.create({
        data: {
          name: customerName,
          email: email,
          business_id: business.id,
        },
      });
      finalCustomerId = newCustomer.id;
    }
  }

  const total = services.reduce((acc, s) => acc + s.price * s.quantity, 0);

  const isDownpayment = paymentType === "DOWNPAYMENT";
  const bookingStatus: "ACCEPTED" | "COMPLETED" = "ACCEPTED";

  const downpaymentAmount = isDownpayment ? total * 0.5 : null;

  const booking = await prisma.booking.create({
    data: {
      business_id: business.id,
      customer_id: finalCustomerId,
      grand_total: total,
      total_discount: 0,
      payment_method: paymentMethod,
      status: bookingStatus,
      scheduled_at: scheduledAt,
      estimated_end: estimatedEnd,
      downpayment: downpaymentAmount,
      availed_services: {
        create: services.map((s, index) => {
          const serviceDuration = s.duration || 30;
          const previousDurations = services
            .slice(0, index)
            .reduce(
              (sum, prev) => sum + (prev.duration || 30) * prev.quantity,
              0,
            );

          const serviceStart = new Date(
            scheduledAt.getTime() + previousDurations * 60 * 1000,
          );
          const serviceEnd = new Date(
            serviceStart.getTime() + serviceDuration * s.quantity * 60 * 1000,
          );

          const isClaimed = s.claimedByCurrentEmployee && !!currentEmployeeId;
          const serverId = isClaimed ? currentEmployeeId : employeeId;
          const status = isClaimed ? "CLAIMED" : "PENDING";
          const claimedAt = isClaimed ? new Date() : null;

          // Logic for packages
          const originalPrice = s.originalPrice || s.price;
          const finalPrice = s.price;
          const discount = originalPrice - finalPrice;

          return {
            service_id: s.id,
            price: originalPrice,
            discount: discount,
            final_price: finalPrice,
            commission_base: finalPrice,
            served_by_id: serverId,
            status: status,
            claimed_at: claimedAt,
            scheduled_at: serviceStart,
            estimated_end: serviceEnd,
            package_id: s.packageId,
          };
        }),
      },
    },
  });

  return booking;
}
