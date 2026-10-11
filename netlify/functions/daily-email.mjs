// Scheduled every day at 05:55 UTC (07:55 Spain/Italy summer time). Env: SITE_URL + Brevo or Resend vars (see lib/mail.mjs)
import { testers } from "../lib/store.mjs";
import { sendMail, mailReady, shell, btn } from "../lib/mail.mjs";
const TXT = {
  en: { s: "Your Leamly discovery for today is ready", b: "One idea, a few minutes, then you're done.", c: "Open today's lesson", u: "Unsubscribe", t: "Today" },
  it: { s: "La tua scoperta Leamly di oggi è pronta", b: "Un'idea, pochi minuti, e hai finito.", c: "Apri la lezione di oggi", u: "Disiscriviti", t: "Oggi" },
  es: { s: "Tu descubrimiento Leamly de hoy está listo", b: "Una idea, unos minutos y listo.", c: "Abre la lección de hoy", u: "Darse de baja", t: "Hoy" } };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export default async () => {
  const site = process.env.SITE_URL;
  if (!site || !mailReady()) { console.log("daily-email: missing env vars"); return; }
  const store = testers(); const { blobs } = await store.list(); let sent = 0;
  for (const { key: id } of blobs) {
    const t = await store.get(id, { type: "json" });
    if (!t || !t.consentEmail || t.unsubscribed || !t.email) continue;
    const L = TXT[t.lang] || TXT.en;
    const title = t.next && t.next.title ? (t.next.title[t.lang] || t.next.title.en) : "";
    const subject = title ? `${L.t}: ${title}` : L.s;
    const head = title ? `<p style="color:#8a9a9f;margin:0">${L.s}</p><h2 style="margin:6px 0 8px">${esc(title)}</h2>` : `<h2 style="margin:0 0 8px">${L.s}</h2>`;
    const html = shell(`${head}<p>${L.b}</p>${btn(`${site}/?src=email&tid=${id}`, L.c)}`, site, id, L.u);
    const r = await sendMail(t.email, subject, html);
    if (r && r.ok) sent++; else console.log("send failed", id, r && r.status);
  }
  console.log("daily-email sent", sent);
};
export const config = { schedule: "55 5 * * *" };
