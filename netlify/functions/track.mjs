// POST /api/track {testerId, events:[{t,day,ev,...}]}  — stored only if the tester consented to analytics
import { testers, events, json, validId } from "../lib/store.mjs";
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b; try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!validId(b.testerId) || !Array.isArray(b.events)) return json({ error: "bad" }, 400);
  const t = await testers().get(b.testerId, { type: "json" });
  if (!t || !t.consentAnalytics) return json({ ok: true, stored: 0 });
  const evs = b.events.slice(0, 200).filter(e => e && typeof e.ev === "string").map(e => JSON.parse(JSON.stringify(e).slice(0, 2000)));
  if (!evs.length) return json({ ok: true, stored: 0 });
  const key = `${b.testerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await events().setJSON(key, evs);
  await testers().setJSON(b.testerId, { ...t, lastSeen: new Date().toISOString() });
  return json({ ok: true, stored: evs.length });
};
export const config = { path: "/api/track" };
