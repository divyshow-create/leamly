// POST /api/signup  {testerId,email,name,lang,consentEmail,consentAnalytics,source,interests,levels}
import { testers, json, clean, validId } from "../lib/store.mjs";
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b; try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!validId(b.testerId)) return json({ error: "bad id" }, 400);
  const email = clean(b.email, 200).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "bad email" }, 400);
  const store = testers(); const prev = (await store.get(b.testerId, { type: "json" })) || {};
  const now = new Date().toISOString();
  const t = { ...prev, id: b.testerId, email, name: clean(b.name, 80), lang: ["en","it","es"].includes(b.lang) ? b.lang : "en",
    consentEmail: !!b.consentEmail, consentAnalytics: !!b.consentAnalytics, source: clean(b.source, 40),
    interests: Array.isArray(b.interests) ? b.interests.slice(0, 20).map(x => clean(x, 30)) : [], levels: typeof b.levels === "object" ? b.levels : {},
    createdAt: prev.createdAt || now, updatedAt: now, unsubscribed: false };
  await store.setJSON(b.testerId, t);
  return json({ ok: true });
};
export const config = { path: "/api/signup" };
