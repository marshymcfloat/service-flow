import { prisma } from "@/prisma/prisma";
import { Resend } from "resend";
import { formatPH } from "@/lib/date-utils";

export async function sendBookingReminders() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const now = new Date();
    const fortyFiveMinutesFromNow = new Date(now.getTime() + 45 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        status: "ACCEPTED",
        reminder_sent: false,
        // Appointment is coming up soon (next 45 mins)
        scheduled_at: {
          gt: now,
          lte: fortyFiveMinutesFromNow,
        },
        // Exclude bookings made just now (walk-ins / immediate appointments)
        // Only remind if the booking was made at least 30 mins ago
        created_at: {
          lte: new Date(now.getTime() - 30 * 60 * 1000),
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

    console.log(
      `[Reminders] Checking window: ${now.toISOString()} - ${fortyFiveMinutesFromNow.toISOString()}`,
    );
    console.log(`[Reminders] Found ${bookings.length} bookings to remind.`);

    // DEBUG: Check for bookings that SHOULD have been found but weren't
    if (bookings.length === 0) {
      const debugBookings = await prisma.booking.findMany({
        where: {
          status: "ACCEPTED",
          scheduled_at: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Next 24 hours
          },
        },
        select: {
          id: true,
          scheduled_at: true,
          reminder_sent: true,
          customer: { select: { name: true, email: true } },
        },
        take: 5,
      });
      console.log(
        "[Reminders DEBUG] Recent/Upcoming bookings in DB:",
        JSON.stringify(debugBookings, null, 2),
      );
    }

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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
  <style>
    /* Reset & Base */
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #ffffff; color: #1f2937; -webkit-font-smoothing: antialiased; }
    
    /* Layout */
    .wrapper { width: 100%; table-layout: fixed; background-color: #ffffff; padding-bottom: 60px; }
    .main-table { margin: 0 auto; max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid #f3f4f6; margin-top: 40px; }
    
    /* Brand Colors */
    .brand-color-mint { color: #10b981; }
    .brand-bg-mint-light { background-color: #ecfdf5; }
    .brand-border-mint { border-color: #d1fae5; }
    .brand-color-dark { color: #111827; }
    
    /* Header */
    .header { background-color: #111827; padding: 40px 40px; text-align: center; }
    .header-title { margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; }
    
    /* Content */
    .content { padding: 40px; }
    .greeting { font-size: 20px; color: #111827; margin-bottom: 24px; font-weight: 600; }
    .greeting strong { color: #10b981; } /* Highlight Name in Brand Color */
    .text-body { color: #4b5563; font-size: 16px; margin-bottom: 32px; }
    
    /* Highlight Card */
    .highlight-card { background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 16px; padding: 32px 24px; text-align: center; margin-bottom: 32px; }
    .highlight-label { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #059669; font-weight: 700; margin-bottom: 12px; }
    .highlight-time { font-size: 42px; font-weight: 800; color: #111827; line-height: 1; letter-spacing: -0.05em; margin: 0; }
    .highlight-date { font-size: 18px; font-weight: 600; color: #059669; margin-top: 12px; }
    
    /* Services List */
    .services-section { margin-top: 0; border-top: 1px dashed #e5e7eb; padding-top: 24px; }
    .services-header { font-size: 14px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    .service-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .service-row:last-child { border-bottom: none; }
    .service-name { font-weight: 600; color: #111827; font-size: 16px;}
    .service-icon { display: inline-block; width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; margin-right: 12px; vertical-align: middle; box-shadow: 0 0 0 2px #d1fae5; }

    /* Footer */
    .footer { background-color: #f9fafb; padding: 32px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer-text { font-size: 13px; color: #9ca3af; margin: 8px 0; }
    .brand-link { color: #10b981; text-decoration: none; font-weight: 700; transition: color 0.2s; }
    .brand-link:hover { color: #059669; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-table">
      <div class="header">
        <h1 class="header-title">${businessName}</h1>
      </div>
      
      <div class="content">
        <p class="greeting">Hello, <strong>${customerName}</strong></p>
        <p class="text-body">This is a friendly reminder that your appointment is coming up soon. We're getting everything ready for you!</p>
        
        <div class="highlight-card">
          <div class="highlight-label">Scheduled Time</div>
          <div class="highlight-time">${scheduledTime}</div>
          <div class="highlight-date">${scheduledDate}</div>
        </div>
        
        <div class="services-section">
          <div class="services-header">Services Booked</div>
          ${booking.availed_services
            .map(
              (s) => `
            <div class="service-row">
              <span class="service-name"><span class="service-icon"></span>${s.service.name}</span>
            </div>`,
            )
            .join("")}
        </div>
      </div>
      
      <div class="footer">
        <p class="footer-text">Need to make changes? Contact ${businessName} directly.</p>
        <p class="footer-text">&copy; ${new Date().getFullYear()} ${businessName} &middot; Powered by <a href="https://serviceflow.com" target="_blank" class="brand-link">ServiceFlow</a></p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

        const { data, error } = await resend.emails.send({
          from: "ServiceFlow <reminders@serviceflow.store>",
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

    return {
      success: true,
      processed: results.length,
      details: results,
    };
  } catch (error) {
    console.error("Reminder service error:", error);
    throw error;
  }
}
