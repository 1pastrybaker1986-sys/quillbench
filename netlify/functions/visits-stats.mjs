// Private dashboard: /stats?key=VISITS_STATS_KEY  (add &format=json for raw numbers)
import { getStore } from "@netlify/blobs";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default async (req) => {
  const url = new URL(req.url);
  const key = process.env.VISITS_STATS_KEY;
  if (!key || url.searchParams.get("key") !== key) return new Response("Not found", { status: 404 });
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "30", 10)));
  const store = getStore("quillbench-visits");
  const { blobs } = await store.list({ prefix: "hits/" });
  const cutoff = Date.now() - days * 86400000;
  const recs = [];
  await Promise.all(
    blobs
      .filter((b) => parseInt(b.key.split("/")[2], 10) >= cutoff)
      .map(async (b) => { const r = await store.get(b.key, { type: "json" }); if (r) recs.push(r); }),
  );
  const real = url.searchParams.get("include_test") === "1" ? recs : recs.filter((r) => !r.test);
  const tally = (arr, f) => arr.reduce((m, r) => { const k = f(r); if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
  const views = real.filter((r) => r.e === "view");
  const byDay = {};
  for (const r of views) {
    const d = new Date(r.t).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
    byDay[d] ??= { views: 0, visitors: new Set(), checkout: 0 };
    byDay[d].views++; byDay[d].visitors.add(r.v);
  }
  for (const r of real.filter((r) => r.e === "checkout_click")) {
    const d = new Date(r.t).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
    byDay[d] ??= { views: 0, visitors: new Set(), checkout: 0 };
    byDay[d].checkout++;
  }
  const out = {
    days,
    totals: {
      views: views.length,
      visitors: new Set(views.map((r) => `${new Date(r.t).toISOString().slice(0, 10)}|${r.v}`)).size,
      checkout_clicks: real.filter((r) => r.e === "checkout_click").length,
      test_hits_excluded: recs.length - real.length,
    },
    by_day: Object.fromEntries(Object.entries(byDay).sort().reverse().map(([d, x]) => [d, { views: x.views, visitors: x.visitors.size, checkout_clicks: x.checkout }])),
    checkout_clicks_by_offer: tally(real.filter((r) => r.e === "checkout_click"), (r) => {
      const path = (r.p || "").replace(/\/+$/, "");
      if (path === "/pricing/cover") return "Cover Design $99 (/pricing/cover)";
      if (path === "/pricing/bundle") return "Studio Bundle $449 (/pricing/bundle)";
      if (path === "/waitlist" || path === "/waitlist.html") return "Studio Bundle $449 (/waitlist)";
      if (path === "/app/studio-bundle") return "Studio Bundle $449 (in-app)";
      if (path === "/app/cover-design") return "Cover Design $99 (in-app)";
      return `other (${path || "/"})`;
    }),
    pages: tally(views, (r) => r.p),
    referrers: tally(views, (r) => r.ref || "(direct / none)"),
    utm: tally(views, (r) => (r.utm?.s ? `${r.utm.s}${r.utm.c ? " / " + r.utm.c : ""}` : "")),
  };
  if (url.searchParams.get("format") === "json") return Response.json(out, { headers: { "cache-control": "no-store" } });
  const table = (title, obj) => `<h2>${esc(title)}</h2><table>${Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join("") || "<tr><td>None yet</td><td></td></tr>"}</table>`;
  const dayRows = Object.entries(out.by_day).map(([d, x]) => `<tr><td>${d}</td><td>${x.views}</td><td>${x.visitors}</td><td>${x.checkout_clicks}</td></tr>`).join("") || "<tr><td colspan=4>None yet</td></tr>";
  const html = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>Quillbench visits</title>
<style>body{font:15px system-ui;margin:24px;max-width:720px;color:#2a2320;background:#faf6f1}table{border-collapse:collapse;width:100%;margin-bottom:16px}td,th{border-bottom:1px solid #e6ddd5;padding:6px 8px;text-align:left}h1{font-size:22px}h2{font-size:16px;margin-top:22px}.big{display:flex;gap:24px;flex-wrap:wrap}.big div{font-size:28px;font-weight:700}.big span{display:block;font-size:13px;font-weight:400;color:#6b6460}</style>
<h1>Quillbench visits, last ${days} days (Central time)</h1>
<div class=big><div>${out.totals.views}<span>page views</span></div><div>${out.totals.visitors}<span>daily unique visitors</span></div><div>${out.totals.checkout_clicks}<span>checkout clicks</span></div></div>
<h2>By day</h2><table><tr><th>Day</th><th>Views</th><th>Visitors</th><th>Checkout clicks</th></tr>${dayRows}</table>
${table("Checkout clicks by offer", out.checkout_clicks_by_offer)}${table("Pages", out.pages)}${table("Where visitors came from", out.referrers)}${table("Campaign tags (utm)", out.utm)}
<p style="color:#6b6460;font-size:13px">No cookies. Visitors are counted per day from a one-way hash, and IP addresses are never stored. Bots and test hits are left out (${out.totals.test_hits_excluded} test hits excluded).</p>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};
