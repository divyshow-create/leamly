// Scheduled every day at 05:55 UTC (07:55 Spain/Italy summer time). Env: SITE_URL + Brevo or Resend vars (see lib/mail.mjs)
import { st, testers } from "../lib/store.mjs";
import { sendMail, mailReady, shell, btn } from "../lib/mail.mjs";
const TXT = {
  en: { s: "Your Leamly discovery for today is ready", b: "One curiosity, a few minutes, then you're done.", c: "Open today's lesson", u: "Unsubscribe", t: "Today", k: "Today's curiosity question", g: "Make a guess, then find out in 5 minutes." },
  it: { s: "La tua scoperta Leamly di oggi è pronta", b: "Una curiosità, pochi minuti, e hai finito.", c: "Apri la lezione di oggi", u: "Disiscriviti", t: "Oggi", k: "La domanda curiosa di oggi", g: "Prova a indovinare, poi scoprilo in 5 minuti." },
  es: { s: "Tu descubrimiento Leamly de hoy está listo", b: "Una curiosidad, unos minutos y listo.", c: "Abre la lección de hoy", u: "Darse de baja", t: "Hoy", k: "La pregunta curiosa de hoy", g: "Intenta adivinar y descúbrelo en 5 minutos." } };
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
    const q = t.next && t.next.q ? (t.next.q[t.lang] || t.next.q.en || "") : "";
    // Curiosity teaser: lessons titled "Why/How/What…" become a question in the subject line
    const asQ = /^(why|how|what|when|where|who|which|can|do|does|is|are|perch[eé]|come|cosa|quando|dove|chi|qual|por qu[eé]|c[oó]mo|qu[eé]|cu[aá]ndo|d[oó]nde|qui[eé]n|cu[aá]l)\b/i.test(title) && !/[?]$/.test(title);
    const lead = asQ && /^(por qu|c[oó]mo|qu[eé]|cu[aá]|d[oó]nde|qui[eé]n)/i.test(title) ? "¿" : "";
    const subject = title ? (asQ ? `${lead}${title}?` : `${L.t}: ${title}`) : L.s;
    const head = title ? `<p style="color:#8a9a9f;margin:0">${L.s}</p><h2 style="margin:6px 0 8px">${esc(title)}</h2>` : `<h2 style="margin:0 0 8px">${L.s}</h2>`;
    const tease = q ? `<div style="background:#F4F3EA;border-left:4px solid #9cbf2a;border-radius:0 12px 12px 0;padding:12px 16px;margin:14px 0"><div style="font:700 11px monospace;letter-spacing:.12em;text-transform:uppercase;color:#4d6a12;margin-bottom:6px">${L.k}</div><div style="font-weight:700;color:#13232A">${esc(q)}</div><div style="color:#5b6b70;font-size:14px;margin-top:6px">${L.g}</div></div>` : "";
    const html = shell(`${head}${tease}<p>${L.b}</p>${btn(`${site}/?src=email&tid=${id}`, L.c)}`, site, id, L.u);
    const r = await sendMail(t.email, subject, html);
    if (r && r.ok) sent++; else console.log("send failed", id, r && r.status);
  }
  console.log("daily-email sent", sent);
};
export const config = { schedule: "55 5 * * *" };
