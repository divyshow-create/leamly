// Scheduled every day at 05:55 UTC (07:55 Spain/Italy summer time). Sends the daily reminder via Resend.
// Env vars: SITE_URL (e.g. https://leamly.netlify.app) and EITHER
//   BREVO_API_KEY + MAIL_FROM_EMAIL (+ optional MAIL_FROM_NAME)   (Brevo: works with a verified single sender, no domain needed)
//   RESEND_API_KEY + MAIL_FROM ("Leamly <hello@yourdomain>")      (Resend: needs your own domain to email other people)
import { testers } from "../lib/store.mjs";
const TXT = {
  en: { s: "Your Leamly discovery for today is ready", b: "One idea, a few minutes, then you're done.", c: "Open today's lesson", u: "Unsubscribe" },
  it: { s: "La tua scoperta Leamly di oggi è pronta", b: "Un'idea, pochi minuti, e hai finito.", c: "Apri la lezione di oggi", u: "Disiscriviti" },
  es: { s: "Tu descubrimiento Leamly de hoy está listo", b: "Una idea, unos minutos y listo.", c: "Abre la lección de hoy", u: "Darse de baja" } };
export default async () => {
  const site = process.env.SITE_URL, brevo = process.env.BREVO_API_KEY, resend = process.env.RESEND_API_KEY;
  if (!site || !(brevo || resend)) { console.log("daily-email: missing env vars"); return; }
  const send = (to, subject, html) => brevo
    ? fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": brevo, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME || "Leamly" }, to: [{ email: to }], subject, htmlContent: html }) })
    : fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resend}`, "content-type": "application/json" },
        body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, html }) });
  const store = testers(); const { blobs } = await store.list(); let sent = 0;
  for (const { key: id } of blobs) {
    const t = await store.get(id, { type: "json" });
    if (!t || !t.consentEmail || t.unsubscribed || !t.email) continue;
    const L = TXT[t.lang] || TXT.en; const link = `${site}/?src=email&tid=${id}`;
    const html = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#101E24;color:#F4F3EA;border-radius:16px">
      <p style="color:#D7F36B;font:600 12px monospace;letter-spacing:.12em">LEAMLY</p><h2 style="margin:0 0 8px">${L.s}</h2><p>${L.b}</p>
      <p><a href="${link}" style="display:inline-block;background:#D7F36B;color:#101E24;padding:12px 20px;border-radius:99px;text-decoration:none;font-weight:700">${L.c} →</a></p>
      <p style="font-size:12px;color:#8a9a9f"><a style="color:#8a9a9f" href="${site}/api/unsubscribe?id=${id}">${L.u}</a></p></div>`;
    const r = await send(t.email, L.s, html);
    if (r.ok) sent++; else console.log("send failed", id, r.status);
  }
  console.log("daily-email sent", sent);
};
export const config = { schedule: "55 5 * * *" };
