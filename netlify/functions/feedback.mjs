// POST /api/feedback {id, rating, text, name, lesson, screen, lang, stats}  -> stored anonymously or linked to the tester id
import { getStore } from "@netlify/blobs";
import { json, validId, clean } from "../lib/store.mjs";
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b; try { b = JSON.parse(await req.text()); } catch { return json({ error: "bad json" }, 400); }
  if (!validId(b.id)) return json({ error: "bad id" }, 400);
  const rating = ["love", "ok", "no"].includes(b.rating) ? b.rating : null;
  const text = clean(b.text, 2000).trim();
  if (!rating && !text) return json({ error: "empty" }, 400);
  const at = new Date().toISOString();
  const item = { at, id: b.id, rating, text, name: clean(b.name, 80), lesson: clean(b.lesson, 40), screen: clean(b.screen, 20), lang: clean(b.lang, 5), stats: typeof b.stats === "object" ? b.stats : {} };
  await getStore("feedback").setJSON(`${at}-${b.id}`, item);
  return json({ ok: true });
};
export const config = { path: "/api/feedback" };
