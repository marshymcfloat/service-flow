"use server";

import { Resend } from "resend";
import { formatPH } from "@/lib/date-utils";

export async function sendEmployeeInviteEmail({
  to,
  employeeName,
  businessName,
  tempPassword,
  expiresAt,
  changePasswordUrl,
}: {
  to: string;
  employeeName: string;
  businessName: string;
  tempPassword: string;
  expiresAt: Date;
  changePasswordUrl: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const expiryDate = formatPH(expiresAt, "MMMM d, yyyy");
  const expiryTime = formatPH(expiresAt, "h:mm a");

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #ffffff; color: #1f2937; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #ffffff; padding-bottom: 60px; }
    .main-table { margin: 0 auto; max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid #f3f4f6; margin-top: 40px; }
    .header { background-color: #111827; padding: 40px 40px; text-align: center; }
    .header-title { margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; }
    .content { padding: 40px; }
    .greeting { font-size: 20px; color: #111827; margin-bottom: 20px; font-weight: 600; }
    .greeting strong { color: #10b981; }
    .text-body { color: #4b5563; font-size: 16px; margin-bottom: 24px; }
    .highlight-card { background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 16px; padding: 28px 24px; text-align: center; margin-bottom: 24px; }
    .highlight-label { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #059669; font-weight: 700; margin-bottom: 12px; }
    .highlight-time { font-size: 32px; font-weight: 800; color: #111827; line-height: 1; letter-spacing: -0.03em; margin: 0; }
    .highlight-date { font-size: 13px; font-weight: 600; color: #059669; margin-top: 10px; }
    .cta { margin-top: 18px; }
    .cta a { display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-weight: 700; }
    .cta a:hover { background: #059669; }
    .note { font-size: 13px; color: #6b7280; margin-top: 16px; }
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
        <p class="greeting">Hello, <strong>${employeeName}</strong></p>
        <p class="text-body">
          You've been added as a staff member at ${businessName}. Use the temporary password below to sign in.
          You'll be required to change it immediately.
        </p>
        <div class="highlight-card">
          <div class="highlight-label">Temporary Password</div>
          <div class="highlight-time">${tempPassword}</div>
          <div class="highlight-date">Expires ${expiryDate} - ${expiryTime}</div>
        </div>
        <div class="cta">
          <a href="${changePasswordUrl}" target="_blank" rel="noopener noreferrer">Change Password</a>
        </div>
        <p class="note">
          If the button doesn't work, copy and paste this link into your browser:
          <br />
          ${changePasswordUrl}
        </p>
      </div>
      <div class="footer">
        <p class="footer-text">If you did not expect this email, please contact ${businessName}.</p>
        <p class="footer-text">&copy; ${new Date().getFullYear()} ${businessName} &middot; Powered by <a href="https://serviceflow.com" target="_blank" class="brand-link">ServiceFlow</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const { data, error } = await resend.emails.send({
    from: "ServiceFlow <reminders@serviceflow.store>",
    to: [to],
    subject: `Your temporary password for ${businessName}`,
    html: emailHtml,
  });

  if (error) {
    return { success: false, error };
  }

  return { success: true, data };
}
