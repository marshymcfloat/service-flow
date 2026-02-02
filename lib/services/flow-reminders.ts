import { prisma } from "@/prisma/prisma";
import { Resend } from "resend";
import {
  addDays,
  addWeeks,
  addMonths,
  isSameDay,
  startOfDay,
  endOfDay,
} from "date-fns";

export async function sendFlowReminders() {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const today = new Date();

    // 1. Get all active service flows
    const activeFlows = await prisma.serviceFlow.findMany({
      include: {
        trigger_service: true,
        suggested_service: true,
      },
    });

    console.log(
      `[Flow Reminders] Found ${activeFlows.length} configured flows.`,
    );

    let sentCount = 0;

    // 2. For each flow, find bookings that trigger it today
    for (const flow of activeFlows) {
      // Calculate the "completed_at" date we are looking for.
      // If we want to send reminder TODAY, the booking must have happened X days ago.
      // So target_completion_date = today - delay
      // BUT calculating exact date subtraction is tricky with variable units.
      // Instead, let's fetch recent completed bookings and filter in memory or find a range.
      // A better approach for scalability: Find bookings completed roughly X time ago.

      // Let's use a wide range query for bookings of the trigger service
      // Better Query: Find "AvailedService" items where service_id == trigger_service_id
      // and status == COMPLETED.

      // Optimization: Calculate the specific date range based on the unit
      let targetDateStart: Date;
      let targetDateEnd: Date;

      // We want: completed_at + delay == today
      // So: completed_at == today - delay
      const lookbackDate = today;

      // Helper to subtract time
      const subtractDelay = (
        date: Date,
        amount: number,
        unit: "DAYS" | "WEEKS" | "MONTHS",
      ) => {
        const d = new Date(date);
        if (unit === "DAYS") d.setDate(d.getDate() - amount);
        if (unit === "WEEKS") d.setDate(d.getDate() - amount * 7);
        if (unit === "MONTHS") d.setMonth(d.getMonth() - amount);
        return d;
      };

      const checkDate = subtractDelay(
        lookbackDate,
        flow.delay_duration,
        flow.delay_unit,
      );

      const startOfCheck = startOfDay(checkDate);
      const endOfCheck = endOfDay(checkDate);

      const qualifyingServices = await prisma.availedService.findMany({
        where: {
          service_id: flow.trigger_service_id,
          // Use 'completed_at' if available, otherwise 'served_at' or 'created_at' as fallback
          // Assuming 'completed_at' is populated for completed services
          OR: [
            { completed_at: { gte: startOfCheck, lte: endOfCheck } },
            // Fallback: if served_at matches date
            {
              completed_at: null,
              served_at: { gte: startOfCheck, lte: endOfCheck },
            },
          ],
          status: "COMPLETED",
          booking: {
            customer: {
              email: { not: null },
            },
          },
        },
        include: {
          booking: {
            include: {
              customer: true,
              business: true,
            },
          },
        },
      });

      console.log(
        `[Flow Reminders] Flow ${flow.id}: Found ${qualifyingServices.length} qualifying services from ${checkDate.toDateString()}`,
      );

      for (const item of qualifyingServices) {
        if (!item.booking.customer.email) continue;

        const customerName = item.booking.customer.name;
        const businessName = item.booking.business.name;
        const serviceName = flow.trigger_service.name;
        const nextServiceName = flow.suggested_service.name;

        const isRequired = flow.type === "REQUIRED";

        const subject = isRequired
          ? `Action Required: Next step for your ${serviceName} is due`
          : `Recommendation: Try ${nextServiceName} at ${businessName}`;

        const content = isRequired
          ? `It's time for the next step in your treatment process. Please book your <strong>${nextServiceName}</strong> to continue correctly.`
          : `Based on your recent <strong>${serviceName}</strong>, we highly recommend trying our <strong>${nextServiceName}</strong>. It's the perfect follow-up!`;

        // Simple Template
        const emailHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: sans-serif; padding: 20px; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd; }
                .btn { display: inline-block; background: #10b981; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>${isRequired ? "Upcoming Appointment Due" : "Recommended for You"}</h2>
                <p>Hi ${customerName},</p>
                <p>${content}</p>
                <p>
                  <strong>Service:</strong> ${nextServiceName}
                </p>
                <a href="https://serviceflow.store" class="btn">Book Now</a>
                <p style="margin-top: 30px; font-size: 12px; color: #999;">
                   You visited ${businessName} on ${item.completed_at?.toLocaleDateString() ?? "recently"}.
                </p>
              </div>
            </body>
            </html>
         `;

        const { error } = await resend.emails.send({
          from: "ServiceFlow <reminders@serviceflow.store>",
          to: [item.booking.customer.email],
          subject: subject,
          html: emailHtml,
        });

        if (error) {
          console.error(
            `[Flow Reminders] Failed to send to ${item.booking.customer.email}`,
            error,
          );
        } else {
          sentCount++;
        }
      }
    }

    return {
      success: true,
      flows_checked: activeFlows.length,
      emails_sent: sentCount,
    };
  } catch (error) {
    console.error("[Flow Reminders] Error:", error);
    throw error;
  }
}
