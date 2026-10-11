// GET  /api/profile?id=TESTER_ID            -> saved app profile for that tester (used when they open the app on another device)
// POST /api/profile {testerId, profile, next} -> save profile (only for registered testers)
import { json, profiles, testers, validId } from "../lib/store.mjs";
export default async (req) => {
  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id");
    if (!validId(id)) return json({ error: "bad id" }, 400);
    const p = await profiles().get(id, { type: "json" });
    return p ? json({ ok: true, profile: p }) : json({ ok: false }, 404);
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b; try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!validId(b.testerId) || typeof b.profile !== "object") return json({ error: "bad" }, 400);
  const raw = JSON.stringify(b.profile); if (raw.length > 200000) return json({ error: "too big" }, 413);
  const ts = testers(); const t = await ts.get(b.testerId, { type: "json" });
  if (!t) return json({ error: "not registered" }, 403);
  const prof = { ...b.profile };
  if (!t.consentAnalytics) { delete prof.lessonHist; delete prof.exitFb; delete prof.lenFb; }   // detailed activity only with usage-sharing consent
  await profiles().setJSON(b.testerId, { ...prof, savedAt: new Date().toISOString() });
  const upd = { ...t, interests: b.profile.picks || t.interests, levels: b.profile.levels || t.levels, lang: ["en","it","es"].includes(b.profile.prefLang) ? b.profile.prefLang : t.lang,
    lessonsDone: Object.keys(b.profile.doneDays || {}).length, ideas: (b.profile.ideas || []).length, lastSeen: new Date().toISOString() };
  if (b.next && typeof b.next === "object" && typeof b.next.key === "string") upd.next = { key: b.next.key.slice(0, 40), day: String(b.next.day || "").slice(0, 10), title: b.next.title || {} };
  await ts.setJSON(b.testerId, upd);
  return json({ ok: true });
};
export const config = { path: "/api/profile" };
