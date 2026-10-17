// POST /api/login {action:"send", email, lang}  -> emails a one-time login link (valid 30 min) if the email is registered
// POST /api/login {action:"verify", token}      -> exchanges the link for the tester id + saved profile (single use)
import { json, st, profiles, findByEmail, newId, clean } from "../lib/store.mjs";
import { sendMail, mailReady, shell, btn } from "../lib/mail.mjs";
const TXT = {
  en: { s: "Your Leamly login link", h: "Log in to Leamly", b: "Tap the button to continue where you left off. The link works once and expires in 30 minutes. If you didn't ask for it, ignore this email.", c: "Log in", u: "Unsubscribe" },
  it: { s: "Il tuo link di accesso a Leamly", h: "Accedi a Leamly", b: "Tocca il pulsante per riprendere da dove avevi lasciato. Il link funziona una sola volta e scade tra 30 minuti. Se non l'hai chiesto tu, ignora questa email.", c: "Accedi", u: "Disiscriviti" },
  es: { s: "Tu enlace para entrar en Leamly", h: "Entra en Leamly", b: "Pulsa el botón para seguir donde lo dejaste. El enlace funciona una sola vez y caduca en 30 minutos. Si no lo has pedido tú, ignora este email.", c: "Entrar", u: "Darse de baja" } };
const TTL = 30 * 60 * 1000;
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b; try { b = JSON.parse(await req.text()); } catch { return json({ error: "bad json" }, 400); }
  const L = st("logins");
  if (b.action === "send") {
    const email = clean(b.email, 200).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "bad email" }, 400);
    const t = await findByEmail(email);
    if (!t) return json({ ok: true, found: false });
    const site = process.env.SITE_URL; if (!site || !mailReady()) return json({ error: "mail not configured" }, 500);
    const token = newId() + newId();
    await L.setJSON(token, { id: t.id, exp: Date.now() + TTL });
    const X = TXT[["en","it","es"].includes(b.lang) ? b.lang : (t.lang || "en")] || TXT.en;
    const r = await sendMail(t.email, X.s, shell(`<h2 style="margin:0 0 8px">${X.h}</h2><p>${X.b}</p>${btn(`${site}/?login=${token}`, X.c)}`, site, t.id, X.u));
    if (!r || !r.ok) { console.log("login mail failed", r && r.status); return json({ error: "send failed" }, 502); }
    return json({ ok: true, found: true });
  }
  if (b.action === "verify") {
    const token = String(b.token || ""); if (!/^[a-z0-9]{20,80}$/i.test(token)) return json({ error: "bad token" }, 400);
    const rec = await L.get(token, { type: "json" }); await L.delete(token);
    if (!rec || rec.exp < Date.now()) return json({ error: "expired" }, 410);
    const profile = await profiles().get(rec.id, { type: "json" });
    return json({ ok: true, id: rec.id, profile: profile || null });
  }
  return json({ error: "unknown action" }, 400);
};
export const config = { path: "/api/login" };
