// Scheduled every day at 05:55 UTC (07:55 Spain/Italy summer time). Env: SITE_URL + Brevo or Resend vars (see lib/mail.mjs)
import { st, testers } from "../lib/store.mjs";
import { schedule, lessonLevel, todayIso } from "../lib/catalog.mjs";
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
  const day = todayIso(), fixed = (await schedule().get(day, { type: "json" })) || {};   // lessons fixed in the admin for today
  for (const { key: id } of blobs) {
    const t = await store.get(id, { type: "json" });
    if (!t || !t.consentEmail || t.unsubscribed || !t.email) continue;
    const L = TXT[t.lang] || TXT.en;
    let next = t.next;
    if (next && next.day === day && next.key) {   // a lesson fixed in the admin replaces the one the app planned
      const topic = next.key.split("-")[0], ov = fixed[topic]?.[lessonLevel((t.levels || {})[topic] || 1)];
      if (ov && ov.key !== next.key) { const p = await st("profiles").get(id, { type: "json" }); if (!Object.values(p?.doneDays || {}).includes(ov.key)) next = { ...next, key: ov.key, title: ov.title }; }
    }
    const title = next && next.title ? (next.title[t.lang] || next.title.en) : "";
    const subject = title ? `${L.t}: ${title}` : L.s;
    const head = title ? `<p style="color:#8a9a9f;margin:0">${L.s}</p><h2 style="margin:6px 0 8px">${esc(title)}</h2>` : `<h2 style="margin:0 0 8px">${L.s}</h2>`;
    const html = shell(`${head}<p>${L.b}</p>${btn(`${site}/?src=email&tid=${id}`, L.c)}`, site, id, L.u);
    const r = await sendMail(t.email, subject, html);
    if (r && r.ok) sent++; else console.log("send failed", id, r && r.status);
  }
  console.log("daily-email sent", sent);
};
export const config = { schedule: "55 5 * * *" };
