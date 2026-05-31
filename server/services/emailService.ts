/**
 * Email Service — Sends emails via Resend HTTP API (serverless-friendly).
 * 
 * Configure in env:
 *   RESEND_API_KEY=re_xxxxxxxx
 *   EMAIL_FROM=Safedify <noreply@yourdomain.com>   (must be verified in Resend)
 * 
 * If RESEND_API_KEY is not set, emails are logged to console instead and
 * reported as not delivered so notification state does not claim success.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Safedify <onboarding@resend.dev>';

const isConfigured = !!RESEND_API_KEY;

if (isConfigured) {
  console.log('[Email] Resend API configured');
} else {
  console.log('[Email] Resend API key not set — emails will be logged to console');
}

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email via Resend HTTP API. Falls back to console.log if not configured.
 */
export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  try {
    if (isConfigured) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [payload.to],
          subject: payload.subject,
          text: payload.text,
          html: payload.html || wrapHtml(payload.subject, payload.text),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        console.error(`[Email] Resend API error (${res.status}):`, err);
        return false;
      }

      console.log(`[Email] Sent to ${payload.to}: ${payload.subject}`);
      return true;
    } else {
      // Preview email locally without claiming delivery.
      console.log(`[Email Preview] To: ${payload.to} | Subject: ${payload.subject}`);
      console.log(`[Email Preview] ${payload.text}`);
      console.warn('[Email] Delivery skipped because RESEND_API_KEY is not configured');
      return false;
    }
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${payload.to}:`, err.message);
    return false;
  }
};

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

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
      <h1 style="color:#f97316;margin:0;font-size:22px">&#128737;&#65039; Safedify</h1>
      <p style="color:#94a3b8;margin:4px 0 0;font-size:12px">HSE Platform Notification</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#0f172a;margin:0 0 16px;font-size:18px">${escapeHtml(subject)}</h2>
      <p style="color:#475569;line-height:1.6;font-size:14px;white-space:pre-line">${escapeHtml(text)}</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">This is an automated notification from Safedify HSE Platform.</p>
    </div>
  </div>
</body>
</html>`;

export { isConfigured as isEmailConfigured };
