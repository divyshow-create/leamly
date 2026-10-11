// POST /api/privacy {id, action, value?, vid?}
//   action "analytics": turn usage sharing on/off (off also deletes stored detailed activity)
//   action "rotate":    give the tester a new private id; the old personal link stops working immediately
//   action "delete":    delete everything stored about this tester (+ the anonymous visitor record if vid is sent)
import { st, testers, profiles, events, json, validId, newId } from "../lib/store.mjs";
const DETAIL = ["lessonHist", "exitFb", "lenFb"];
async function delPrefix(store, prefix) { const { blobs } = await store.list({ prefix }); for (const { key } of blobs) await store.delete(key); }
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b; try { b = JSON.parse(await req.text()); } catch { return json({ error: "bad json" }, 400); }
  if (!validId(b.id)) return json({ error: "bad id" }, 400);
  const T = testers(), P = profiles(), E = events(), F = st("feedback");
  const t = await T.get(b.id, { type: "json" });
  if (b.action === "analytics") {
    if (!t) return json({ error: "not registered" }, 404);
    const on = !!b.value; await T.setJSON(b.id, { ...t, consentAnalytics: on, consentChangedAt: new Date().toISOString() });
    if (!on) { await delPrefix(E, b.id + "/"); const p = await P.get(b.id, { type: "json" }); if (p) { DETAIL.forEach(k => delete p[k]); await P.setJSON(b.id, p); } }
    return json({ ok: true, analytics: on });
  }
  if (b.action === "rotate") {
    if (!t) return json({ error: "not registered" }, 404);
    const nid = newId(); const p = await P.get(b.id, { type: "json" });
    await T.setJSON(nid, { ...t, id: nid }); if (p) await P.setJSON(nid, p);
    const { blobs } = await E.list({ prefix: b.id + "/" }); for (const { key } of blobs) { const v = await E.get(key, { type: "json" }); await E.setJSON(nid + key.slice(b.id.length), v); await E.delete(key); }
    await T.delete(b.id); await P.delete(b.id);
    return json({ ok: true, id: nid });
  }
  if (b.action === "delete") {
    await T.delete(b.id); await P.delete(b.id); await delPrefix(E, b.id + "/");
    const { blobs } = await F.list(); for (const { key } of blobs) if (key.endsWith("-" + b.id)) await F.delete(key);
    if (validId(b.vid)) await st("visitors").delete(b.vid);
    return json({ ok: true, deleted: true });
  }
  return json({ error: "unknown action" }, 400);
};
export const config = { path: "/api/privacy" };
