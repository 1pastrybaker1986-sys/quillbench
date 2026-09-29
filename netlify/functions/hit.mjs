// Records one page view per request as its own blob (no read-modify-write races).
// No cookies. Stores path, event, referrer host, utm tags, and a daily salted
// visitor hash (IP + user agent + date + secret), never the IP itself.
import { getStore } from "@netlify/blobs";
import { createHash, randomBytes } from "node:crypto";

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|curl|wget|python/i;

export default async (req) => {
  if (req.method !== "POST") return new Response("", { status: 405 });
  const ua = req.headers.get("user-agent") || "";
  if (BOT.test(ua) && !ua.includes("qb-verify")) return new Response(null, { status: 204 });
  let body = {};
  try { body = JSON.parse((await req.text()).slice(0, 2000)); } catch { return new Response("", { status: 400 }); }
  const path = String(body.p || "/").slice(0, 120);
  const EVENTS = new Set(["checkout_click", "tool_generate", "tool_copy", "tool_to_cover", "tool_email"]);
  const ev = EVENTS.has(body.e) ? body.e : "view";
  let refHost = "";
  try { refHost = body.r ? new URL(body.r).hostname.replace(/^www\./, "") : ""; } catch {}
  const q = new URLSearchParams(String(body.q || ""));
  const utm = { s: (q.get("utm_source") || "").slice(0, 40), c: (q.get("utm_content") || q.get("utm_campaign") || "").slice(0, 40) };
  const now = new Date();
  const day = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "";
  const salt = process.env.VISITS_STATS_KEY || "qb";
  const v = createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 16);
  const test = ua.includes("qb-verify") || path.startsWith("/__");
  const rec = { t: now.toISOString(), p: path, e: ev, ref: refHost, utm, v, test };
  const key = `hits/${day}/${now.getTime()}-${randomBytes(4).toString("hex")}`;
  await getStore("quillbench-visits").setJSON(key, rec);
  return new Response(null, { status: 204 });
};
