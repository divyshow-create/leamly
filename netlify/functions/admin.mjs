// GET /api/admin?key=ADMIN_KEY            -> dashboard
// GET /api/admin?key=ADMIN_KEY&csv=events -> all events as CSV ; &csv=testers -> testers as CSV
import { testers, events } from "../lib/store.mjs";
import { getStore } from "@netlify/blobs";
const fmtT = x => { if (!x) return "–"; const m = Math.floor(x / 60), sec = Math.round(x % 60); return m ? `${m}m ${sec}s` : `${sec}s`; };
const esc = s => String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
export default async (req) => {
  const u = new URL(req.url);
  if (!process.env.ADMIN_KEY || u.searchParams.get("key") !== process.env.ADMIN_KEY) return new Response("Not allowed", { status: 403 });
  const ts = testers(), es = events();
  const T = []; for (const { key } of (await ts.list()).blobs) T.push(await ts.get(key, { type: "json" }));
  const E = []; for (const { key } of (await es.list()).blobs) { const arr = await es.get(key, { type: "json" }) || []; const tid = key.split("/")[0]; arr.forEach(e => E.push({ tid, ...e })); }
  const key = encodeURIComponent(u.searchParams.get("key"));
  const css = `<style>body{font-family:system-ui;background:#101E24;color:#F4F3EA;padding:20px;max-width:900px;margin:auto}td,th{padding:6px 10px;border-bottom:1px solid #2a434b;text-align:left;vertical-align:top}a{color:#D7F36B}.c{background:#17282f;border-radius:14px;padding:14px;margin:10px 0}.m{color:#8a9a9f}</style>`;
  const pid = u.searchParams.get("id");
  if (pid) {
    const t = T.find(x => x && x.id === pid); if (!t) return new Response("Not found", { status: 404 });
    const p = (await getStore("profiles").get(pid, { type: "json" })) || {};
    const evs = E.filter(e => e.tid === pid).sort((a, b) => (a.t < b.t ? 1 : -1));
    const row = (k, v) => `<tr><th>${k}</th><td>${v}</td></tr>`;
    const days = Object.entries(p.doneDays || {}).sort().map(([d, k]) => `${d}: ${esc(k)}`).join("<br>") || "–";
    const html = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${esc(t.name || t.email)}</title>${css}
    <p><a href="?key=${key}">← All testers</a></p><h1>${esc(t.name || "(no name)")}</h1><p class=m>${esc(t.email)}</p>
    <div class=c><table>${row("Language", esc(t.lang))}${row("Heard about Leamly", esc(t.source || "–"))}${row("Joined", esc((t.createdAt || "").slice(0, 16).replace("T", " ")))}${row("Last seen", esc((t.lastSeen || "–").slice(0, 16).replace("T", " ")))}
    ${row("Interests (level)", (p.picks || t.interests || []).map(i => `${esc(i)} (${((p.levels || t.levels || {})[i]) ?? "–"})`).join(", ") || "–")}${row("Main interest", esc(p.main || "–"))}
    ${row("Daily email", t.unsubscribed ? "unsubscribed" : (t.consentEmail ? "yes" : "no"))}${row("Usage sharing", t.consentAnalytics ? "yes" : "no")}
    ${row("Next lesson", esc(t.next?.key || "–") + (t.next?.title ? " — " + esc(t.next.title[t.lang] || t.next.title.en) : ""))}
    ${row("Why they use Leamly", esc(p.whyAnswered || "–"))}${row("Founding offer", esc(p.offerChosen || "not chosen"))}</table></div>
    <h2>Lessons opened (${Object.keys(p.lessonHist || {}).length})</h2><div class=c><table><tr><th>Lesson</th><th>First opened</th><th>Opens</th><th>Reached page</th><th>Time read</th><th>Finished</th><th>Quiz</th><th>Difficulty</th><th>Length</th><th>Left because</th></tr>
    ${Object.entries(p.lessonHist || {}).sort((a, b) => (a[1].first < b[1].first ? 1 : -1)).map(([k, h]) => `<tr><td>${esc(k)}</td><td>${esc(h.first || "–")}</td><td>${h.opens || 1}</td><td>${h.maxPg || 1}${h.of ? " / " + h.of : ""}</td><td>${fmtT(h.secs)}${h.est ? ` <span class=m>(exp. ${h.est}m)</span>` : ""}${(h.pageSecs || []).filter(x => x).length > 1 ? `<br><span class=m>per page: ${(h.pageSecs || []).slice(0, h.of || 20).map(x => fmtT(x)).join(" · ")}</span>` : ""}</td><td>${h.finished ? "✓ " + esc(h.finishedOn || "") : "✗ no"}</td><td>${h.right != null ? h.right + "/3" : "–"}</td><td>${esc((h.feel || "–").replace("_", " "))}</td><td>${esc(h.len || "–")}</td><td>${esc((h.exit || "–").replace("_", " "))}</td></tr>`).join("") || "<tr><td colspan=10>No lessons opened yet</td></tr>"}</table></div>
    <h2>Daily lessons finished</h2><div class=c>${days}</div>
    <h2>Ideas collected (${(p.ideas || []).length})</h2><div class=c>${(p.ideas || []).map(i => `${esc(i.k)} · ${esc(i.date)}${i.remembered ? " · remembered" : ""}${i.deep ? " · deep note" : ""}`).join("<br>") || "–"}</div>
    <h2>Kept in orbit (${(p.kept || []).length})</h2><div class=c>${(p.kept || []).map(i => esc(i.id) + " · " + esc(i.date)).join("<br>") || "–"}</div>
    <h2>Recent activity ${t.consentAnalytics ? "" : "<span class=m>(no usage sharing)</span>"}</h2><div class=c>${evs.slice(0, 60).map(e => `${esc((e.t || "").slice(0, 16).replace("T", " "))} · ${esc(e.ev)}${e.k ? " · " + esc(e.k) : ""}${e.ok !== undefined ? (e.ok ? " ✓" : " ✗") : ""}`).join("<br>") || "–"}</div>`;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
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
  const P = {}; for (const { key: pk } of (await getStore("profiles").list()).blobs) P[pk] = await getStore("profiles").get(pk, { type: "json" });
  const L = {}; const lk = k => (L[k] ||= { started: 0, finished: 0, exits: [], reasons: {}, len: {}, times: [] });
  by(e => e.ev === "open" && e.k).forEach(e => lk(e.k).started++);
  Object.values(P).forEach(p => { if (!p) return;
    Object.values(p.doneDays || {}).forEach(k => lk(k).finished++);
    (p.exitFb || []).forEach(x => { const r = lk(x.k); r.exits.push(`${x.pg}/${x.of}`); r.reasons[x.reason] = (r.reasons[x.reason] || 0) + 1; });
    (p.lenFb || []).forEach(x => { const r = lk(x.k); r.len[x.v] = (r.len[x.v] || 0) + 1; });
    Object.entries(p.lessonHist || {}).forEach(([k, h]) => { if (h.finished && h.secs) { const r = lk(k); r.times.push(h.secs); r.est = h.est; } }); });
  by(e => e.ev === "lesson_exit" && e.k).forEach(e => { const r = lk(e.k); if (!r.exits.includes(`${e.pg}/${e.of}`)) r.exits.push(`${e.pg}/${e.of}`); });
  const VS = getStore("visitors"); const V = []; for (const { key: vk } of (await VS.list()).blobs) { const v = await VS.get(vk, { type: "json" }); if (v) V.push(v); }
  const nV = V.length, visits = V.reduce((a, v) => a + (v.visits || 0), 0), nStart = V.filter(v => v.start).length, nFin = V.filter(v => v.finish).length, nJoin = V.filter(v => v.join).length;
  const nTriedNoJoin = V.filter(v => v.finish && !v.join).length, nVisitOnly = V.filter(v => !v.start).length;
  const pc = (x, y) => y ? Math.round(100 * x / y) + "%" : "–";
  const dayCount = {}; V.forEach(v => (v.days || []).forEach(d => dayCount[d] = (dayCount[d] || 0) + 1));
  const lastDays = Object.keys(dayCount).sort().slice(-14);
  const funnel = `<h2>Visitors (all, anonymous)</h2><div class=g>
  <div class=c><div class=k>${nV}</div>unique visitors</div><div class=c><div class=k>${visits}</div>total visits</div>
  <div class=c><div class=k>${pc(nStart, nV)}</div>started a lesson (${nStart})</div><div class=c><div class=k>${pc(nFin, nV)}</div>finished a lesson (${nFin})</div>
  <div class=c><div class=k>${pc(nJoin, nV)}</div>joined the beta (${nJoin})</div><div class=c><div class=k>${pc(nTriedNoJoin, nV)}</div>tried a lesson, didn't join (${nTriedNoJoin})</div>
  <div class=c><div class=k>${pc(nVisitOnly, nV)}</div>left without starting (${nVisitOnly})</div><div class=c><div class=k>${pc(nJoin, nFin)}</div>of finishers joined</div></div>
  <p style="color:#8a9a9f">Visitors per day: ${lastDays.map(d => `${d.slice(5)}: ${dayCount[d]}`).join(" · ") || "–"}</p>`;
  const fmt = o => Object.entries(o).map(([k, v]) => `${esc(k.replace("_", " "))}: ${v}`).join(", ") || "–";
  const lessonRows = Object.entries(L).sort((a, b) => (b[1].exits.length - a[1].exits.length) || a[0].localeCompare(b[0])).map(([k, r]) => `<tr><td>${esc(k)}</td><td>${r.started || "–"}</td><td>${r.finished}</td><td>${r.times.length ? fmtT(r.times.reduce((a, b) => a + b, 0) / r.times.length) + (r.est ? ` <span style="color:#8a9a9f">(exp. ${r.est}m)</span>` : "") : "–"}</td><td>${r.exits.join(", ") || "–"}</td><td>${fmt(r.reasons)}</td><td>${fmt(r.len)}</td></tr>`).join("");
  const html = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Leamly beta results</title>
  <style>body{font-family:system-ui;background:#101E24;color:#F4F3EA;padding:20px;max-width:900px;margin:auto}td,th{padding:6px 10px;border-bottom:1px solid #2a434b;text-align:left}.k{color:#D7F36B;font-size:2rem;font-weight:800}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}.c{background:#17282f;border-radius:14px;padding:14px}a{color:#D7F36B}</style>
  <h1>Leamly beta</h1>${funnel}<div class=g>
  <div class=c><div class=k>${T.length}</div>sign-ups</div><div class=c><div class=k>${T.filter(t => t.consentAnalytics).length}</div>tracking consent</div>
  <div class=c><div class=k>${active3}</div>active on 3+ days</div><div class=c><div class=k>${done.length}</div>lessons finished</div>
  <div class=c><div class=k>${acc}%</div>quiz answers right</div><div class=c><div class=k>${count("offer_view")} / ${count("offer_click")}</div>offer views / clicks</div>
  <div class=c><div class=k>${count("deep_open")}</div>deep dives opened</div><div class=c><div class=k>${count("feedback")}</div>feedback sent</div></div>
  <h2>Why people use Leamly</h2><p>${Object.entries(why).map(([k, v]) => `${esc(k)}: ${v}`).join(" · ") || "–"}</p>
  <h2>Lessons: where people stop and why</h2><p style="color:#8a9a9f">"Left at page" = page where someone left early (e.g. 2/5). Reasons come from the "Leaving this lesson?" question; length from the end-of-lesson question.</p>
  <table><tr><th>Lesson</th><th>Opened*</th><th>Finished</th><th>Avg time (finished)</th><th>Left at page</th><th>Reasons</th><th>Length</th></tr>${lessonRows || "<tr><td colspan=7>–</td></tr>"}</table><p style="color:#8a9a9f">*Opened counts only testers who allow usage sharing.</p>
  <h2>Page reached (page/total : count)</h2><p>${Object.entries(pages).sort().map(([k, v]) => `${k}: ${v}`).join(" · ") || "–"}</p>
  <h2>Testers</h2><table><tr><th>Name</th><th>Email</th><th>Lang</th><th>Source</th><th>Interests (level)</th><th>Lessons done</th><th>Ideas</th><th>Last seen</th><th>Next lesson</th><th>Days active</th></tr>
  ${T.map(t => `<tr><td><a href="?key=${key}&id=${encodeURIComponent(t.id)}">${esc(t.name || "(no name)")}</a></td><td>${esc(t.email)}</td><td>${t.lang}</td><td>${esc(t.source)}</td><td>${(t.interests || []).map(i => `${esc(i)} (${(t.levels || {})[i] ?? "–"})`).join(", ")}</td><td>${t.lessonsDone ?? done.filter(e => e.tid === t.id).length}</td><td>${t.ideas ?? "–"}</td><td>${esc((t.lastSeen || t.createdAt || "").slice(0, 16).replace("T", " "))}</td><td>${esc(t.next?.key || "–")}</td><td>${days[t.id]?.size || 0}</td></tr>`).join("")}</table>
  <p><a href="?key=${encodeURIComponent(u.searchParams.get("key"))}&csv=events">Download events CSV</a> · <a href="?key=${encodeURIComponent(u.searchParams.get("key"))}&csv=testers">Download testers CSV</a></p>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};
export const config = { path: "/api/admin" };
