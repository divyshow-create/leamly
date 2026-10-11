// GET /api/admin?key=ADMIN_KEY            -> dashboard
// GET /api/admin?key=ADMIN_KEY&csv=events -> all events as CSV ; &csv=testers -> testers as CSV
import { testers, events } from "../lib/store.mjs";
const esc = s => String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
export default async (req) => {
  const u = new URL(req.url);
  if (!process.env.ADMIN_KEY || u.searchParams.get("key") !== process.env.ADMIN_KEY) return new Response("Not allowed", { status: 403 });
  const ts = testers(), es = events();
  const T = []; for (const { key } of (await ts.list()).blobs) T.push(await ts.get(key, { type: "json" }));
  const E = []; for (const { key } of (await es.list()).blobs) { const arr = await es.get(key, { type: "json" }) || []; const tid = key.split("/")[0]; arr.forEach(e => E.push({ tid, ...e })); }
  const csv = u.searchParams.get("csv");
  if (csv) {
    const rows = csv === "testers" ? T : E; const cols = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const body = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(typeof r[c] === "object" ? JSON.stringify(r[c]) : (r[c] ?? ""))).join(","))].join("\n");
    return new Response(body, { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename=leamly-${csv}.csv` } });
  }
  const by = (f) => E.filter(f);
  const days = {}; E.forEach(e => { (days[e.tid] ||= new Set()).add(e.day); });
  const active3 = Object.values(days).filter(s => s.size >= 3).length;
  const done = by(e => e.ev === "complete"), ans = by(e => e.ev === "answer");
  const acc = ans.length ? Math.round(100 * ans.filter(e => e.ok).length / ans.length) : 0;
  const pages = {}; by(e => e.ev === "page").forEach(e => { const k = `${e.pg + 1}/${e.of}`; pages[k] = (pages[k] || 0) + 1; });
  const count = ev => by(e => e.ev === ev).length;
  const why = {}; by(e => e.ev === "why").forEach(e => why[e.answer] = (why[e.answer] || 0) + 1);
  const html = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Leamly beta results</title>
  <style>body{font-family:system-ui;background:#101E24;color:#F4F3EA;padding:20px;max-width:900px;margin:auto}td,th{padding:6px 10px;border-bottom:1px solid #2a434b;text-align:left}.k{color:#D7F36B;font-size:2rem;font-weight:800}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}.c{background:#17282f;border-radius:14px;padding:14px}a{color:#D7F36B}</style>
  <h1>Leamly beta</h1><div class=g>
  <div class=c><div class=k>${T.length}</div>sign-ups</div><div class=c><div class=k>${T.filter(t => t.consentAnalytics).length}</div>tracking consent</div>
  <div class=c><div class=k>${active3}</div>active on 3+ days</div><div class=c><div class=k>${done.length}</div>lessons finished</div>
  <div class=c><div class=k>${acc}%</div>quiz answers right</div><div class=c><div class=k>${count("offer_view")} / ${count("offer_click")}</div>offer views / clicks</div>
  <div class=c><div class=k>${count("deep_open")}</div>deep dives opened</div><div class=c><div class=k>${count("feedback")}</div>feedback sent</div></div>
  <h2>Why people use Leamly</h2><p>${Object.entries(why).map(([k, v]) => `${esc(k)}: ${v}`).join(" · ") || "–"}</p>
  <h2>Page reached (page/total : count)</h2><p>${Object.entries(pages).sort().map(([k, v]) => `${k}: ${v}`).join(" · ") || "–"}</p>
  <h2>Testers</h2><table><tr><th>Name</th><th>Email</th><th>Lang</th><th>Source</th><th>Days active</th><th>Finished</th></tr>
  ${T.map(t => `<tr><td>${esc(t.name)}</td><td>${esc(t.email)}</td><td>${t.lang}</td><td>${esc(t.source)}</td><td>${days[t.id]?.size || 0}</td><td>${done.filter(e => e.tid === t.id).length}</td></tr>`).join("")}</table>
  <p><a href="?key=${encodeURIComponent(u.searchParams.get("key"))}&csv=events">Download events CSV</a> · <a href="?key=${encodeURIComponent(u.searchParams.get("key"))}&csv=testers">Download testers CSV</a></p>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};
export const config = { path: "/api/admin" };
