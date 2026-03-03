/**
 * Email Service — Sends notification emails via SMTP (Nodemailer).
 * 
 * Configure in .env:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your@email.com
 *   SMTP_PASS=app-password
 *   SMTP_FROM=Safedify <noreply@safedify.com>
 * 
 * If SMTP is not configured, emails are logged to console instead.
 */
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'Safedify HSE <noreply@safedify.com>';

const isConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter: nodemailer.Transporter | null = null;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  console.log(`[Email] SMTP configured → ${SMTP_HOST}:${SMTP_PORT}`);
} else {
  console.log('[Email] SMTP not configured — emails will be logged to console');
}

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email notification. Falls back to console.log if SMTP is not configured.
 */
export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  try {
    if (transporter) {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html || wrapHtml(payload.subject, payload.text),
      });
      console.log(`[Email] Sent to ${payload.to}: ${payload.subject}`);
      return true;
    } else {
      // Log email for development
      console.log(`[Email Preview] To: ${payload.to} | Subject: ${payload.subject}`);
      console.log(`[Email Preview] ${payload.text}`);
      return true; // Treat as success for dev
    }
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${payload.to}:`, err.message);
    return false;
  }
};

/**
 * Wrap plain text in a simple branded HTML email template.
 */
const wrapHtml = (subject: string, text: string): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f1f5f9">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#0f172a;padding:24px 32px;text-align:center">
      <h1 style="color:#f97316;margin:0;font-size:22px">🛡️ Safedify</h1>
      <p style="color:#94a3b8;margin:4px 0 0;font-size:12px">HSE Platform Notification</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#0f172a;margin:0 0 16px;font-size:18px">${subject}</h2>
      <p style="color:#475569;line-height:1.6;font-size:14px;white-space:pre-line">${text}</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">This is an automated notification from Safedify HSE Platform.</p>
    </div>
  </div>
</body>
</html>`;

export { isConfigured as isEmailConfigured };
