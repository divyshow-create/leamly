import { getStore } from "@netlify/blobs";
// All data is stored in the EU (Frankfurt). Every store must be opened through st() so the region is always set.
export const REGION = "eu-central-1";
export const st = (name) => getStore({ name, region: REGION, consistency: "strong" });
export const testers = () => st("testers");
export const events = () => st("events");
export const profiles = () => st("profiles");
export const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export const clean = (s, n = 200) => String(s ?? "").slice(0, n);
export const validId = (id) => /^[a-z0-9]{8,40}$/i.test(String(id || ""));
export const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => (b % 36).toString(36)).join("") + Date.now().toString(36).slice(-4);
