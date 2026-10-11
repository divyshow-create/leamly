// Reads the lesson catalog straight from the published index.html, so there is only one place where lessons live.
// Only the data part of the app script is evaluated (everything before EN_CONTENT, plus the interests list), in a sandbox.
import vm from "node:vm";
import { st } from "./store.mjs";

export const LVLS = [1, 3, 5];
export const LVL_NAME = { 1: "Level 1 · Beginner", 3: "Level 3 · Enthusiast", 5: "Level 5 · Deep diver" };
export const LVL_HINT = { 1: "testers at level 1–2", 3: "testers at level 3–4", 5: "testers at level 5" };
export const lessonLevel = l => (l >= 5 ? 5 : l >= 3 ? 3 : 1);
export const schedule = () => st("schedule");   // key = YYYY-MM-DD, value = { topic: { 1|3|5: { key, title: {en,it,es} } } }

let cache = null, cachedAt = 0;
export async function catalog(origin) {
  if (cache && Date.now() - cachedAt < 5 * 60 * 1000) return cache;
  const base = process.env.SITE_URL || origin;
  const r = await fetch(new URL("/index.html", base), { headers: { "cache-control": "no-cache" } });
  if (!r.ok) throw new Error("Could not load index.html (" + r.status + ")");
  const html = await r.text();
  const s = html.indexOf("<script>") + 8, e = html.indexOf("const EN_CONTENT", s);
  const iS = html.indexOf("const INTERESTS_SRC"), iE = html.indexOf("const LEVELS_SRC", iS);
  if (s < 8 || e < 0 || iS < 0 || iE < 0) throw new Error("index.html layout changed: lesson data not found");
  const code = html.slice(s, e) + "\n" + html.slice(iS, iE).replace(/Object\.assign\(ICON,\s*NEW_ICONS\);?/, "") +
    "\n;globalThis.__R={LESSONS,DEEPER:typeof DEEPER!=='undefined'?DEEPER:{},I18N:typeof I18N_CONTENT!=='undefined'?I18N_CONTENT:{},INTERESTS_SRC};";
  const ctx = {}; vm.runInNewContext(code, ctx, { timeout: 8000 });
  const R = ctx.__R;
  const topics = R.INTERESTS_SRC.map(([id, name, desc]) => ({ id, name, desc }));
  const lessons = {};
  for (const [key, L] of Object.entries(R.LESSONS)) {
    const [id, lvl, v] = key.split("-");
    const title = { en: L.title };
    for (const lang of ["it", "es"]) { const x = R.I18N?.[lang]?.[id]?.lessons?.[key]; if (x?.title) title[lang] = x.title; }
    lessons[key] = { key, id, lvl: +lvl, variant: (v || "a").toUpperCase(), title, preview: L.preview || "", minutes: L.minutes || null, deep: !!R.DEEPER[key] };
  }
  cache = { topics, lessons, keys: new Set(Object.keys(lessons)) }; cachedAt = Date.now();
  return cache;
}

// Same order the app uses: id-l, id-l-b, id-l-c
export const vkeys = (keys, id, l) => [`${id}-${l}`, `${id}-${l}-b`, `${id}-${l}-c`].filter(k => keys.has(k));

export const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const todayIso = () => new Date().toISOString().slice(0, 10);

// Mirrors planFor() in index.html, to estimate what a tester will see on a given day.
// Assumes they open the app every day until then and that their levels don't change.
export function predict(p, target, cal, keys) {
  if (!p || !p.main || !(p.picks || []).length) return null;
  if (p.swap?.[target]) return { key: p.swap[target], how: "swapped by tester" };
  if (p.doneDays?.[target]) return { key: p.doneDays[target], how: "done" };
  const today = todayIso();
  if (p.plan?.[target]) {
    const pid = p.plan[target].split("-")[0], ov = cal[target]?.[pid]?.[lessonLevel(p.levels?.[pid] || 1)]?.key;
    if (target === today && ov && ov !== p.plan[target] && keys.has(ov) && !Object.values(p.doneDays || {}).includes(ov)) return { key: ov, how: "your schedule (replaces their planned lesson next time they open the app)" };
    return { key: p.plan[target], how: "already planned in the app" };
  }
  if (target < today) return null;
  const plan = { ...(p.plan || {}) }, done = new Set(Object.values(p.doneDays || {})), lv = p.levels || {};
  const order = [p.main, ...p.picks.filter(x => x !== p.main)];
  let how = "auto";
  for (let d = today; d <= target; d = addDays(d, 1)) {
    if (plan[d]) continue;
    const n = Object.keys(plan).length; let key = null; how = "auto";
    for (let t = 0; t < order.length && !key; t++) {
      const id = order[(n + t) % order.length], pref = lessonLevel(lv[id] || 1);
      const ov = cal[d]?.[id]?.[pref]?.key;
      if (ov && keys.has(ov) && !done.has(ov)) { key = ov; how = "your schedule"; break; }
      const cands = [pref, ...LVLS.filter(x => x !== pref && Math.abs(x - pref) <= 2).sort((a, b) => Math.abs(a - pref) - Math.abs(b - pref))].flatMap(l => vkeys(keys, id, l));
      key = cands.find(k => !done.has(k) && !Object.values(plan).includes(k)) || null;
    }
    plan[d] = key || `${p.main}-${lessonLevel(lv[p.main] || 1)}`;
  }
  return { key: plan[target], how: how + " (estimate)" };
}

export async function loadCal(from, to) {
  const S = schedule(), cal = {};
  for (const { key } of (await S.list()).blobs) if (key >= from && key <= to) cal[key] = (await S.get(key, { type: "json" })) || {};
  return cal;
}
