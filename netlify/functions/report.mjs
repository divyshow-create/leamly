// POST /api/report {id, kind, ref, title, page, reasons[], text, lang, screen} -> stored in "reports", shown on the admin page
import { clean, json, st, validId } from "../lib/store.mjs";
const OK = ["fact", "graphic", "read", "lang", "unclear", "spoiler", "source", "other"];
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b; try { b = JSON.parse(await req.text()); } catch { return json({ error: "bad json" }, 400); }
  const id = validId(b.id) ? b.id : "anon";
  const reasons = Array.isArray(b.reasons) ? b.reasons.filter(r => OK.includes(r)).slice(0, 8) : [];
  const text = clean(b.text, 1500).trim();
  if (!reasons.length && !text) return json({ error: "empty" }, 400);
  const at = new Date().toISOString();
  const item = { at, id, kind: ["lesson", "flash", "ix"].includes(b.kind) ? b.kind : "other", ref: clean(b.ref, 60), title: clean(b.title, 200), page: Number.isFinite(+b.page) ? +b.page : null, reasons, text, lang: clean(b.lang, 5), screen: clean(b.screen, 20), status: "open" };
  await st("reports").setJSON(`${at}-${Math.random().toString(36).slice(2, 8)}`, item);
  return json({ ok: true });
};
export const config = { path: "/api/report" };
