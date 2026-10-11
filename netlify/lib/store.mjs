import { getStore } from "@netlify/blobs";
export const testers = () => getStore({ name: "testers", consistency: "strong" });
export const events = () => getStore("events");
export const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
export const clean = (s, n = 200) => String(s ?? "").slice(0, n);
export const validId = (id) => /^[a-z0-9]{8,40}$/i.test(String(id || ""));
