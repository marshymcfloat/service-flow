import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";

export function buildOnboardingStatusLink(token: string) {
  const baseUrl = getSiteUrl();
  return `${baseUrl}/apply/status?token=${encodeURIComponent(token)}`;
}

export async function sendOnboardingApplicationAcknowledgement(input: {
  ownerEmail: string;
  ownerName: string;
  businessName: string;
  statusToken: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn(
      "[Onboarding] RESEND_API_KEY is missing. Acknowledgement email skipped.",
      { ownerEmail: input.ownerEmail },
    );
    return { success: false as const, reason: "MISSING_RESEND_KEY" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const statusLink = buildOnboardingStatusLink(input.statusToken);
  const subject = `We received your ServiceFlow application (${input.businessName})`;
  const html = `
<!doctype html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
    <h2 style="margin-bottom: 8px;">Application received</h2>
    <p style="margin: 0 0 12px 0;">Hi ${input.ownerName},</p>
    <p style="margin: 0 0 12px 0;">
      Thanks for applying to ServiceFlow for <strong>${input.businessName}</strong>.
      Our team usually reviews applications within 1 business day.
    </p>
    <p style="margin: 0 0 12px 0;">
      Track your application status here:
      <a href="${statusLink}" style="color: #047857;">View application status</a>
    </p>
    <p style="margin: 0; color: #4b5563; font-size: 13px;">
      Statuses: NEW, CONTACTED, APPROVED, REJECTED, CONVERTED
    </p>
  </body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: "ServiceFlow <onboarding@serviceflow.store>",
      to: [input.ownerEmail],
      subject,
      html,
      text: `Hi ${input.ownerName}, we received your application for ${input.businessName}. Track status: ${statusLink}`,
    });

    if (error) {
      logger.error("[Onboarding] Failed to send acknowledgement email", {
        ownerEmail: input.ownerEmail,
        error,
      });
      return { success: false as const, reason: "SEND_ERROR" };
    }

    return { success: true as const };
  } catch (error) {
    logger.error("[Onboarding] Unexpected email error", {
      ownerEmail: input.ownerEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false as const, reason: "UNEXPECTED_ERROR" };
  }
}
