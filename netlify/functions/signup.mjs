// POST /api/signup  {testerId,email,name,lang,consentEmail,consentAnalytics,source,interests,levels}
import { clean, json, st, testers, validId, findByEmail } from "../lib/store.mjs";
import { sendMail, mailReady, shell, btn } from "../lib/mail.mjs";
const W = {
  en: { s: "You're in: welcome to the Leamly beta", h: "You're in!", b: "Thanks for joining the Leamly beta. From tomorrow, every morning at 07:55 you'll get the link to your daily discovery: one curiosity, a few minutes, then you're done.", c: "Open Leamly", u: "Unsubscribe" },
  it: { s: "Ci sei: benvenuto nella beta di Leamly", h: "Ci sei!", b: "Grazie per esserti unito alla beta di Leamly. Da domani, ogni mattina alle 07:55 riceverai il link alla tua scoperta del giorno: una curiosità, pochi minuti, e hai finito.", c: "Apri Leamly", u: "Disiscriviti" },
  es: { s: "Ya estás dentro: bienvenido a la beta de Leamly", h: "¡Ya estás dentro!", b: "Gracias por unirte a la beta de Leamly. Desde mañana, cada día a las 07:55 recibirás el enlace a tu descubrimiento del día: una curiosidad, unos minutos y listo.", c: "Abrir Leamly", u: "Darse de baja" } };
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b; try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!validId(b.testerId)) return json({ error: "bad id" }, 400);
  const email = clean(b.email, 200).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "bad email" }, 400);
  const other = await findByEmail(email);
  if (other && other.id !== b.testerId) return json({ error: "exists" }, 409);   // one account per email: they should log in instead
  const store = testers(); const prev = (await store.get(b.testerId, { type: "json" })) || {};
  const now = new Date().toISOString();
  const t = { ...prev, id: b.testerId, email, name: clean(b.name, 80), lang: ["en","it","es"].includes(b.lang) ? b.lang : "en",
    consentEmail: !!b.consentEmail, consentAnalytics: !!b.consentAnalytics, source: clean(b.source, 40),
    interests: Array.isArray(b.interests) ? b.interests.slice(0, 20).map(x => clean(x, 30)) : [], levels: typeof b.levels === "object" ? b.levels : {},
    createdAt: prev.createdAt || now, updatedAt: now, unsubscribed: false, privacyVersion: clean(b.privacyVersion, 20), consentAt: now };
  let welcome = false;
  if (!prev.welcomeSent && mailReady() && process.env.SITE_URL) {
    const L = W[t.lang] || W.en, site = process.env.SITE_URL;
    try { const r = await sendMail(email, L.s, shell(`<h2 style="margin:0 0 8px">${L.h}</h2><p>${L.b}</p>${btn(site, L.c)}`, site, b.testerId, L.u)); welcome = !!(r && r.ok); } catch (e) { console.log("welcome failed", e); }
    t.welcomeSent = welcome;
  }
  await store.setJSON(b.testerId, t);
  return json({ ok: true, welcome });
};
export const config = { path: "/api/signup" };
