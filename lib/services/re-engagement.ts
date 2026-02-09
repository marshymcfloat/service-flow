import { prisma } from "@/prisma/prisma";
import { Resend } from "resend";
import { getStartOfDayPH } from "@/lib/date-utils";

export async function sendReEngagementEmails() {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Get current date in Philippine timezone
    const nowPH = getStartOfDayPH(new Date());
    // Calculate 60 days ago in Philippine timezone
    const sixtyDaysAgo = new Date(nowPH.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get all businesses
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    console.log(`[Re-engagement] Processing ${businesses.length} businesses`);
    console.log(
      `[Re-engagement] Cutoff date (60 days ago PH time): ${sixtyDaysAgo.toISOString()}`,
    );

    const allResults = [];

    for (const business of businesses) {
      // Find customers who:
      // 1. Have at least one COMPLETED booking
      // 2. Their most recent booking was more than 60 days ago
      // 3. Have a valid email address
      const inactiveCustomers = await prisma.customer.findMany({
        where: {
          business_id: business.id,
          email: {
            not: null,
          },
          bookings: {
            some: {
              status: "COMPLETED", // Must have at least one completed booking
            },
          },
        },
        include: {
          bookings: {
            where: {
              status: "COMPLETED",
            },
            orderBy: {
              created_at: "desc",
            },
            take: 1,
          },
        },
      });

      console.log(
        `[Re-engagement] Business "${business.name}": Found ${inactiveCustomers.length} customers with completed bookings`,
      );

      // Filter customers whose last booking was 60+ days ago
      const customersToEmail = inactiveCustomers.filter((customer) => {
        if (customer.bookings.length === 0) return false;
        const lastBooking = customer.bookings[0];
        const isInactive = lastBooking.created_at <= sixtyDaysAgo;

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[Re-engagement] Customer ${customer.name} (${customer.email}): Last booking ${lastBooking.created_at.toISOString()}, 60 days ago: ${sixtyDaysAgo.toISOString()}, Inactive: ${isInactive}`,
          );
        }

        return isInactive;
      });

      console.log(
        `[Re-engagement] Business "${business.name}": ${customersToEmail.length} customers inactive for 60+ days`,
      );

      // Send emails
      for (const customer of customersToEmail) {
        if (!customer.email) continue;

        const lastBookingDate = customer.bookings[0]?.created_at;
        const emailHtml = generateReEngagementEmail(
          business.name,
          customer.name,
        );

        try {
          const { data, error } = await resend.emails.send({
            from: "ServiceFlow <reminders@serviceflow.store>",
            to: [customer.email],
            subject: `We Miss You at ${business.name}!`,
            html: emailHtml,
          });

          if (error) {
            console.error(
              `[Re-engagement] Failed to send email to ${customer.email}:`,
              error,
            );
            allResults.push({
              business: business.name,
              customerId: customer.id,
              customerEmail: customer.email,
              success: false,
              error,
            });
          } else {
            console.log(
              `[Re-engagement] Email sent to ${customer.email} (last booking: ${lastBookingDate?.toISOString()})`,
            );
            allResults.push({
              business: business.name,
              customerId: customer.id,
              customerEmail: customer.email,
              success: true,
            });
          }
        } catch (emailError) {
          console.error(
            `[Re-engagement] Error sending to ${customer.email}:`,
            emailError,
          );
          allResults.push({
            business: business.name,
            customerId: customer.id,
            customerEmail: customer.email,
            success: false,
            error: emailError,
          });
        }
      }
    }

    const successCount = allResults.filter((r) => r.success).length;
    const failCount = allResults.filter((r) => !r.success).length;

    console.log(
      `[Re-engagement] Summary: ${successCount} sent, ${failCount} failed`,
    );

    return {
      success: true,
      totalProcessed: allResults.length,
      sent: successCount,
      failed: failCount,
      details: allResults,
    };
  } catch (error) {
    console.error("[Re-engagement] Service error:", error);
    throw error;
  }
}

function generateReEngagementEmail(
  businessName: string,
  customerName: string,
): string {
  const bookingLink = `https://www.serviceflow.store/${businessName
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We Miss You</title>
  <style>
    /* Reset & Base */
    body { margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1f2937; }
    table { border-spacing: 0; width: 100%; }
    td { padding: 0; }
    img { border: 0; }
    a { text-decoration: none; color: inherit; }
    
    /* Layout */
    .wrapper { width: 100%; background-color: #ffffff; padding-bottom: 40px; }
    .main-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f3f4f6; border-radius: 8px; overflow: hidden; }
    
    /* Header (Navy Blue) */
    .header { background-color: #111827; padding: 40px 20px; text-align: center; }
    .business-name { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
    
    /* Content */
    .content-body { padding: 40px 30px; }
    .greeting { font-size: 16px; color: #111827; margin: 0 0 16px 0; font-weight: 700; }
    .greeting-name { color: #10b981; } /* The Green Name Color */
    .text-paragraph { color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 30px; margin-top: 0; }
    
    /* The Green "Info" Box */
    .highlight-box { background-color: #ecfdf5; border-radius: 8px; padding: 30px 20px; text-align: center; margin-bottom: 40px; border: 1px solid #d1fae5; }
    .box-label { color: #059669; font-size: 11px; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; display: block; }
    .box-main-text { color: #111827; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px; line-height: 1.2; }
    .box-sub-text { color: #059669; font-size: 14px; font-weight: 600; margin-top: 5px; display: block; }
    
    /* Services/Links List */
    .section-divider { border-top: 1px dashed #e5e7eb; margin-bottom: 25px; }
    .section-label { color: #6b7280; font-size: 11px; letter-spacing: 1px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; display: block; }
    
    .action-item { display: block; margin-bottom: 10px; }
    .dot { height: 8px; width: 8px; background-color: #10b981; border-radius: 50%; display: inline-block; margin-right: 12px; vertical-align: middle; }
    .action-text { color: #111827; font-size: 14px; font-weight: 600; vertical-align: middle; }
    
    /* Footer */
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #f3f4f6; }
    .footer-text { color: #9ca3af; font-size: 11px; margin-bottom: 6px; line-height: 1.5; }
    .brand-link { color: #2563eb; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-container">
      
      <!-- Dark Header -->
      <div class="header">
        <h1 class="business-name">${businessName}</h1>
      </div>

      <!-- Main Body -->
      <div class="content-body">
        
        <!-- Greeting -->
        <div class="greeting">
          Hello, <span class="greeting-name">${customerName}</span>
        </div>

        <p class="text-paragraph">
          This is a friendly reminder that we haven't seen you in a while. We are getting everything ready for your return!
        </p>

        <!-- The Green Highlight Box -->
        <a href="${bookingLink}" style="text-decoration: none; display: block;">
          <div class="highlight-box">
            <span class="box-label">BOOKING STATUS</span>
            <div class="box-main-text">Time to Return?</div>
            <span class="box-sub-text">Book your next appointment today</span>
          </div>
        </a>

        <!-- Divider -->
        <div class="section-divider"></div>

        <!-- Action Section (Mimicking Services Booked) -->
        <span class="section-label">RECOMMENDED</span>
        
        <a href="${bookingLink}" class="action-item">
          <span class="dot"></span>
          <span class="action-text">Book Appointment</span>
        </a>
        
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-text">
          Need to make changes? Contact ${businessName} directly.
        </div>
        <div class="footer-text">
          &copy; ${new Date().getFullYear()} ${businessName} &middot; Powered by <a href="https://www.serviceflow.store" class="brand-link">ServiceFlow</a>
        </div>
      </div>

    </div>
  </div>
</body>
</html>
  `;
}
