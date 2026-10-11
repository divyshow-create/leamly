// Shared email sender: Brevo (BREVO_API_KEY + MAIL_FROM_EMAIL [+ MAIL_FROM_NAME]) or Resend (RESEND_API_KEY + MAIL_FROM)
export const mailReady = () => !!(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY);
export async function sendMail(to, subject, html) {
  if (process.env.BREVO_API_KEY) return fetch("https://api.brevo.com/v3/smtp/email", { method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME || "Leamly" }, to: [{ email: to }], subject, htmlContent: html }) });
  if (process.env.RESEND_API_KEY) return fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, html }) });
  return null;
}
export const shell = (inner, site, id, unsub) => `<div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#101E24;color:#F4F3EA;border-radius:16px">
<p style="color:#D7F36B;font:600 12px monospace;letter-spacing:.12em">LEAMLY</p>${inner}
<p style="font-size:12px;color:#8a9a9f;margin-top:24px"><a style="color:#8a9a9f" href="${site}/api/unsubscribe?id=${id}">${unsub}</a></p></div>`;
export const btn = (href, label) => `<p><a href="${href}" style="display:inline-block;background:#D7F36B;color:#101E24;padding:12px 20px;border-radius:99px;text-decoration:none;font-weight:700">${label} →</a></p>`;
