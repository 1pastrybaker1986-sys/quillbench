/**
 * GET /.netlify/functions/checkout-status?session_id=cs_...
 * Looks up a Stripe Checkout Session server-side and returns ONLY
 * { status: "paid" | "processing" | "unpaid", pkg } — no email, name, or amount.
 * Packet softlaunch-successurl v1 item c (Rook 9:55 AM Sep 30 2026).
 */
import Stripe from "stripe";

const PKGS = new Set(["cover-design", "studio-bundle"]);

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== "GET") return json(405, { error: "GET only." });
  const id = String((event.queryStringParameters || {}).session_id || "").trim();
  if (!/^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(id)) {
    return json(400, { error: "Invalid session_id." });
  }
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return json(503, { error: "Not configured." });
  try {
    const stripe = new Stripe(secretKey);
    const s = await stripe.checkout.sessions.retrieve(id);
    const pkgRaw = s.metadata && s.metadata.packageId;
    const pkg = PKGS.has(pkgRaw) ? pkgRaw : null;
    let status = "unpaid";
    if (s.payment_status === "paid" || s.payment_status === "no_payment_required") status = "paid";
    else if (s.status === "complete") status = "processing"; // delayed method (e.g. bank debit) not cleared yet
    return json(200, { status, pkg });
  } catch {
    // Unknown, forged, or other-mode session ids all look the same to the caller.
    return json(200, { status: "unpaid", pkg: null });
  }
}
