import { Resend } from "resend";
import { render } from "@react-email/render";
import BookingConfirmationEmail from "@/components/emails/BookingConfirmationEmail";
import { prisma } from "@/prisma/prisma";
import { formatPH } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendBookingConfirmation(bookingId: number) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        business: true,
        availed_services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!booking || !booking.customer.email) {
      logger.warn(
        `[BookingConfirmation] Booking ${bookingId} not found or customer has no email.`,
      );
      return;
    }

    const servicesList = booking.availed_services.map((as) => ({
      name: as.service.name,
      price: as.final_price,
      quantity: 1, // AvailedService implies 1 qty per row usually
    }));

    const totalAmountValue = booking.availed_services.reduce(
      (sum, s) => sum + s.final_price,
      0,
    );
    const totalAmount = `₱${totalAmountValue.toFixed(2)}`;

    // Format Date & Time using Philippine Time
    const scheduledAt = booking.scheduled_at;
    const scheduledDate = scheduledAt
      ? formatPH(scheduledAt, "MMMM d, yyyy")
      : "N/A";
    const scheduledTime = scheduledAt ? formatPH(scheduledAt, "h:mm a") : "N/A";
    const businessName = booking.business.name;
    const customerName = booking.customer.name;
    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${booking.business.slug}/bookings/${booking.id}`;

    const emailHtml = await render(
      BookingConfirmationEmail({
        customerName,
        businessName,
        serviceName: "Services",
        date: scheduledDate,
        time: scheduledTime,
        totalAmount,
        bookingUrl,
        services: servicesList,
      }),
    );

    const { data, error } = await resend.emails.send({
      from: "ServiceFlow <bookings@serviceflow.store>",
      to: [booking.customer.email],
      subject: `Booking Confirmed - ${businessName}`,
      html: emailHtml,
      text: `Hi ${customerName}, Your booking at ${businessName} is confirmed for ${scheduledDate} ${scheduledTime}. View details: ${bookingUrl}`,
    });

    if (error) {
      logger.error("[BookingConfirmation] Resend API Error:", { error });
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    logger.error("[BookingConfirmation] Error sending booking confirmation:", {
      error,
    });
    return { success: false, error };
  }
}
