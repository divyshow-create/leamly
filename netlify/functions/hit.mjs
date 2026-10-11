// POST /api/hit {id, step}  step: visit | start | finish | join
// Anonymous funnel counter: no personal data, just a random browser id and which steps it reached.
import { getStore } from "@netlify/blobs";
import { json, validId } from "../lib/store.mjs";
const STEPS = ["visit", "start", "finish", "join"];
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b; try { b = JSON.parse(await req.text()); } catch { return json({ error: "bad json" }, 400); }
  if (!validId(b.id) || !STEPS.includes(b.step)) return json({ error: "bad" }, 400);
  const store = getStore({ name: "visitors", consistency: "strong" });
  const now = new Date().toISOString(), day = now.slice(0, 10);
  const v = (await store.get(b.id, { type: "json" })) || { first: now, visits: 0, days: [] };
  if (b.step === "visit") { if ((v.visits || 0) < 1000) v.visits = (v.visits || 0) + 1; if (!v.days.includes(day)) v.days = v.days.concat(day).slice(-60); }
  else if (!v[b.step]) v[b.step] = now;
  v.last = now;
  await store.setJSON(b.id, v);
  return json({ ok: true });
};
export const config = { path: "/api/hit" };
