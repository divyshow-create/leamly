// Admin pages: ?view=lessons (all lessons by topic and level) and ?view=schedule&date=YYYY-MM-DD (what is shown that day, editable)
import { st, testers } from "./store.mjs";
import { catalog, schedule, loadCal, predict, vkeys, LVLS, LVL_NAME, LVL_HINT, addDays, todayIso } from "./catalog.mjs";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const CSS = `<style>body{font-family:system-ui;background:#101E24;color:#F4F3EA;padding:20px;max-width:1100px;margin:auto}
td,th{padding:6px 10px;border-bottom:1px solid #2a434b;text-align:left;vertical-align:top}table{border-collapse:collapse;width:100%}
a{color:#D7F36B}.c{background:#17282f;border-radius:14px;padding:14px;margin:10px 0;overflow-x:auto}.m{color:#8a9a9f}.s{font-size:.85rem}
nav a{margin-right:16px}nav{margin-bottom:10px}.tag{display:inline-block;font-size:.72rem;padding:1px 6px;border-radius:6px;background:#2a434b;margin-left:4px}
.on{background:#D7F36B;color:#101E24}.ov{outline:2px solid #D7F36B;border-radius:8px}select{max-width:300px;width:100%;background:#101E24;color:#F4F3EA;border:1px solid #2a434b;border-radius:8px;padding:6px}
button,input{font:inherit;background:#101E24;color:#F4F3EA;border:1px solid #2a434b;border-radius:8px;padding:6px 10px}button{background:#D7F36B;color:#101E24;font-weight:700;border:0;cursor:pointer}
button.sec{background:#2a434b;color:#F4F3EA}.l{margin:4px 0}</style>`;
const page = (title, body) => new Response(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${CSS}${body}`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
const nav = k => `<nav><a href="?key=${k}">← Dashboard</a><a href="?key=${k}&view=lessons">All lessons</a><a href="?key=${k}&view=schedule">Schedule by date</a></nav>`;
const langTags = L => ["it", "es"].map(l => L.title[l] ? `<span class=tag>${l.toUpperCase()}</span>` : "").join("");
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || "");

export async function lessonsAdmin(req, u) {
  const k = encodeURIComponent(u.searchParams.get("key"));
  const view = u.searchParams.get("view");
  let C; try { C = await catalog(req.url); } catch (e) { return page("Error", `${nav(k)}<p>Could not read the lessons: ${esc(e.message)}</p>`); }

  if (view === "lessons") {
    // How many testers finished each lesson
    const P = st("profiles"), doneBy = {};
    for (const { key } of (await P.list()).blobs) { const p = await P.get(key, { type: "json" }); new Set(Object.values(p?.doneDays || {}).concat(p?.done || [])).forEach(x => doneBy[x] = (doneBy[x] || 0) + 1); }
    const n = Object.keys(C.lessons).length;
    const jump = C.topics.map(t => `<a href="#${t.id}">${esc(t.name)}</a>`).join(" · ");
    const cards = C.topics.map(t => `<div class=c id="${t.id}"><h2 style="margin:0 0 4px">${esc(t.name)} <span class="m s">${esc(t.desc)}</span></h2><table><tr>${LVLS.map(l => `<th>${LVL_NAME[l]}<br><span class="m s">${LVL_HINT[l]}</span></th>`).join("")}</tr><tr>
      ${LVLS.map(l => `<td>${vkeys(C.keys, t.id, l).map(key => { const L = C.lessons[key]; return `<div class=l><b>${L.variant}</b> · ${esc(L.title.en)}<br><span class="m s">${esc(key)} · ${L.minutes || "?"} min${L.deep ? " · deep dive" : ""} · finished by ${doneBy[key] || 0}</span>${langTags(L)}</div>`; }).join("") || "<span class=m>–</span>"}</td>`).join("")}</tr></table></div>`).join("");
    return page("Leamly lessons", `${nav(k)}<h1>All lessons (${n})</h1><p class=m>${C.topics.length} topics × 3 levels. Variants A, B, C are shown to a tester in that order, skipping ones they already finished. IT/ES = translated.</p><p class=s>${jump}</p>${cards}`);
  }

  // ---- schedule ----
  const date = isDate(u.searchParams.get("date")) ? u.searchParams.get("date") : todayIso();
  const S = schedule();
  if (req.method === "POST") {
    const f = await req.formData();
    const d = isDate(f.get("date")) ? f.get("date") : date;
    const repeat = Math.max(0, Math.min(60, parseInt(f.get("repeat") || "0", 10) || 0));
    const rec = {};
    if (f.get("clear") !== "1") for (const t of C.topics) for (const l of LVLS) {
      const v = String(f.get(`o:${t.id}:${l}`) || ""); if (v && C.lessons[v] && C.lessons[v].id === t.id) (rec[t.id] ||= {})[l] = { key: v, title: C.lessons[v].title };
    }
    for (let i = 0; i <= repeat; i++) { const di = addDays(d, i); if (Object.keys(rec).length) await S.setJSON(di, rec); else await S.delete(di); }
    return new Response(null, { status: 303, headers: { location: `?key=${k}&view=schedule&date=${d}&saved=${repeat + 1}` } });
  }
  const today = todayIso();
  const cal = await loadCal(today < date ? today : date, addDays(date > today ? date : today, 60));
  const rec = cal[date] || {};
  const opts = (id, l, cur) => {
    const first = C.lessons[vkeys(C.keys, id, l)[0]];
    const auto = `<option value="">Auto${first ? ` · ${esc(first.variant)} · ${esc(first.title.en)}` : ""}</option>`;
    return auto + LVLS.map(x => `<optgroup label="${LVL_NAME[x]}">${vkeys(C.keys, id, x).map(key => `<option value="${key}"${key === cur ? " selected" : ""}>${C.lessons[key].variant} · ${esc(C.lessons[key].title.en)}</option>`).join("")}</optgroup>`).join("");
  };
  const grid = C.topics.map(t => `<tr><th>${esc(t.name)}</th>${LVLS.map(l => { const cur = rec[t.id]?.[l]?.key; return `<td${cur ? " class=ov" : ""}><select name="o:${t.id}:${l}" aria-label="${esc(t.name)} ${LVL_NAME[l]}">${opts(t.id, l, cur)}</select></td>`; }).join("")}</tr>`).join("");
  const nOv = Object.values(rec).reduce((a, x) => a + Object.keys(x).length, 0);

  // What each tester gets that day
  const ts = testers(), P = st("profiles"), rows = [];
  for (const { key } of (await ts.list()).blobs) {
    const t = await ts.get(key, { type: "json" }); if (!t) continue;
    const p = await P.get(key, { type: "json" });
    const r = predict(p, date, cal, C.keys); const L = r && C.lessons[r.key];
    rows.push(`<tr><td><a href="?key=${k}&id=${encodeURIComponent(t.id)}">${esc(t.name || t.email)}</a></td><td>${esc(p?.main || "–")}${p?.main ? ` (level ${p.levels?.[p.main] ?? "–"})` : ""}</td><td>${L ? `${esc(L.title.en)}<br><span class="m s">${esc(r.key)}</span>` : "<span class=m>– (no profile yet)</span>"}</td><td class="m s">${r ? esc(r.how) : ""}</td></tr>`);
  }
  const upcoming = Object.keys(cal).filter(d => d >= today).sort().map(d => { const n = Object.values(cal[d]).reduce((a, x) => a + Object.keys(x).length, 0); return `<a href="?key=${k}&view=schedule&date=${d}">${d}</a> <span class=m>(${n})</span>`; }).join(" · ") || "<span class=m>None yet. Every day is on Auto.</span>";
  const saved = u.searchParams.get("saved");
  return page(`Schedule ${date}`, `${nav(k)}<h1>Schedule for ${new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h1>
  ${saved ? `<p class="tag on">Saved for ${esc(saved)} day(s)</p>` : ""}
  <form method=get class=s><input type=hidden name=key value="${esc(u.searchParams.get("key"))}"><input type=hidden name=view value=schedule>
   <a href="?key=${k}&view=schedule&date=${addDays(date, -1)}">← Previous day</a> &nbsp; <input type=date name=date value="${date}"> <button class=sec>Go</button> &nbsp; <a href="?key=${k}&view=schedule&date=${today}">Today</a> &nbsp; <a href="?key=${k}&view=schedule&date=${addDays(date, 1)}">Next day →</a></form>
  <div class=c><p class="m s" style="margin-top:0">Each day the app picks <b>one topic</b> per tester (rotating through their interests, main one first) at <b>their level</b>. If you fix a lesson below for that topic and level, the tester gets it that day, unless they already finished it. Cells on <b>Auto</b> keep the normal behaviour: the next variant the tester hasn't done (a new tester gets the one shown). ${nOv} fixed for this day.</p>
  <form method=post><input type=hidden name=date value="${date}"><table><tr><th>Topic</th>${LVLS.map(l => `<th>${LVL_NAME[l]}<br><span class="m s">${LVL_HINT[l]}</span></th>`).join("")}</tr>${grid}</table>
  <p>Also apply the same choices to the next <input type=number name=repeat min=0 max=60 value=0 style="width:70px"> day(s). &nbsp; <button>Save</button> &nbsp; <button class=sec name=clear value=1 onclick="return confirm('Set every topic and level back to Auto for this day?')">Reset day to Auto</button></p></form></div>
  <h2>What each tester gets on this day</h2><div class=c><table><tr><th>Tester</th><th>Main topic</th><th>Lesson</th><th>Why</th></tr>${rows.join("") || "<tr><td colspan=4>No testers yet</td></tr>"}</table>
  <p class="m s">Future days are an estimate: it assumes the tester opens the app every day and their level doesn't change. Today's lesson is fixed once they open the app; if you change today, it updates the next time they open it (if they haven't finished it).</p></div>
  <h2>Days with fixed lessons</h2><div class=c>${upcoming}</div>`);
}
