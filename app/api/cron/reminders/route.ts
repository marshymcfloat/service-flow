import { prisma } from "@/prisma/prisma";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { formatPH } from "@/lib/date-utils";

const resend = new Resend(process.env.RESEND_API_KEY);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const fortyFiveMinutesFromNow = new Date(now.getTime() + 45 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        status: "ACCEPTED",
        reminder_sent: false,
        scheduled_at: {
          gt: now,
          lt: fortyFiveMinutesFromNow,
        },
        customer: {
          email: {
            not: null,
          },
        },
      },
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

    console.log(`Found ${bookings.length} bookings to remind.`);

    const results = await Promise.all(
      bookings.map(async (booking) => {
        if (!booking.customer.email) return null;

        const scheduledAt = booking.scheduled_at;
        if (!scheduledAt) return null;

        const scheduledTime = formatPH(scheduledAt, "h:mm a");
        const scheduledDate = formatPH(scheduledAt, "MMMM d, yyyy");
        const businessName = booking.business.name;
        const customerName = booking.customer.name;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f9fafb; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); margin-top: 20px; margin-bottom: 20px; }
    .header { background-color: #ffffff; padding: 24px 32px; border-bottom: 1px solid #e5e7eb; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; color: #111827; letter-spacing: -0.025em; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; margin-bottom: 24px; color: #4b5563; }
    .card { background-color: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb; }
    .time-slot { font-size: 32px; font-weight: 700; color: #1f2937; margin: 0; line-height: 1; letter-spacing: -0.03em; }
    .date-slot { font-size: 16px; font-weight: 500; color: #6b7280; margin-top: 8px; }
    .business-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; color: #9ca3af; margin-bottom: 8px; }
    .services-title { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .service-list { list-style: none; padding: 0; margin: 0; }
    .service-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 15px; color: #4b5563; display: flex; justify-content: space-between; }
    .service-item:last-child { border-bottom: none; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${businessName}</h1>
    </div>
    <div class="content">
      <p class="greeting">Hi ${customerName},</p>
      <p style="margin-bottom: 24px;">This is a friendly reminder about your upcoming appointment.</p>
      
      <div class="card">
        <div class="business-label">Appointment Time</div>
        <div class="time-slot">${scheduledTime}</div>
        <div class="date-slot">${scheduledDate}</div>
      </div>

      <div style="margin-bottom: 24px;">
        <div class="services-title">Services Scheduled</div>
        <ul class="service-list">
          ${booking.availed_services.map((s) => `<li class="service-item"><span>${s.service.name}</span></li>`).join("")}
        </ul>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">We look forward to seeing you soon!</p>
      </div>
    </div>
    <div class="footer">
      <p>Need to reschedule? Please contact ${businessName} directly.</p>
      <p style="margin-top: 8px;">&copy; ${new Date().getFullYear()} ${businessName} via ServiceFlow</p>
    </div>
  </div>
</body>
</html>
        `;

        const { data, error } = await resend.emails.send({
          from: "ServiceFlow <reminders@updates.serviceflow.app>",
          to: [booking.customer.email],
          subject: `Reminder: Appointment at ${businessName} - ${scheduledTime}`,
          html: emailHtml,
        });

        if (error) {
          console.error(
            `Failed to send email to ${booking.customer.email}:`,
            error,
          );
          return { id: booking.id, success: false, error };
        }

        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminder_sent: true },
        });

        return { id: booking.id, success: true };
      }),
    );

    return NextResponse.json({
      success: true,
      processed: results.length,
      details: results,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
