// GET /api/schedule -> lessons you fixed in the admin for specific days, used by the app when it plans a day.
// Response: { days: { "YYYY-MM-DD": { topic: { "1"|"3"|"5": lessonKey } } } }  (yesterday to +60 days)
import { json } from "../lib/store.mjs";
import { loadCal, addDays, todayIso } from "../lib/catalog.mjs";
export default async () => {
  const t = todayIso(), cal = await loadCal(addDays(t, -1), addDays(t, 60)), days = {};
  for (const [d, rec] of Object.entries(cal)) for (const [id, lv] of Object.entries(rec)) for (const [l, v] of Object.entries(lv)) if (v?.key) ((days[d] ||= {})[id] ||= {})[l] = v.key;
  return new Response(JSON.stringify({ days }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=60" } });
};
export const config = { path: "/api/schedule" };
