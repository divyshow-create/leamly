// GET /api/unsubscribe?id=...  — stops daily emails
import { testers, validId } from "../lib/store.mjs";
export default async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (validId(id)) { const s = testers(); const t = await s.get(id, { type: "json" }); if (t) await s.setJSON(id, { ...t, unsubscribed: true }); }
  return new Response("<p style='font-family:sans-serif;padding:40px'>You won't receive Leamly emails any more. / Non riceverai più email da Leamly. / Ya no recibirás emails de Leamly.</p>", { headers: { "content-type": "text/html; charset=utf-8" } });
};
export const config = { path: "/api/unsubscribe" };
