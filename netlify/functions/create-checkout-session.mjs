/**
 * Create a Stripe Checkout Session for Quillbench studio packages.
 * Secret key + price ids live in Netlify env only — never log them.
 */
import Stripe from "stripe";

const ALLOWED_PACKAGES = new Set([
  "full-edit",
  "cover-design",
  "marketing",
  "studio-bundle",
]);

const PRICE_ENV_BY_PACKAGE = {
  "full-edit": "STRIPE_PRICE_FULL_EDIT",
  "cover-design": "STRIPE_PRICE_COVER_DESIGN",
  marketing: "STRIPE_PRICE_MARKETING",
  "studio-bundle": "STRIPE_PRICE_STUDIO_BUNDLE",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function resolvePriceId(packageId, clientPriceId) {
  const envName = PRICE_ENV_BY_PACKAGE[packageId];
  const fromEnv = envName ? process.env[envName]?.trim() : "";
  if (fromEnv) return fromEnv;
  if (typeof clientPriceId === "string" && clientPriceId.trim()) {
    return clientPriceId.trim();
  }
  return "";
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return json(503, {
      error: "Checkout is not configured on the server (missing STRIPE_SECRET_KEY).",
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const packageId = typeof payload.packageId === "string" ? payload.packageId.trim() : "";
  const successUrl = typeof payload.successUrl === "string" ? payload.successUrl.trim() : "";
  const cancelUrl = typeof payload.cancelUrl === "string" ? payload.cancelUrl.trim() : "";
  const clientPriceId = payload.priceId;

  if (!ALLOWED_PACKAGES.has(packageId)) {
    return json(400, {
      error: "Invalid packageId. Allowed: full-edit, cover-design, marketing, studio-bundle.",
    });
  }

  if (!successUrl || !cancelUrl) {
    return json(400, { error: "successUrl and cancelUrl are required." });
  }

  const priceId = resolvePriceId(packageId, clientPriceId);
  if (!priceId) {
    return json(503, {
      error: `No Stripe price configured for ${packageId}. Set ${PRICE_ENV_BY_PACKAGE[packageId]} on Netlify.`,
    });
  }

  if (!priceId.startsWith("price_")) {
    return json(400, {
      error: "Invalid priceId: must use a Stripe Price ID (price_…), not a product id.",
    });
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { packageId },
    });

    if (!session.url) {
      return json(502, { error: "Stripe did not return a Checkout URL." });
    }

    return json(200, { url: session.url });
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "Failed to create Checkout Session.";
    // Do not log secret key or raw env; only a generic failure note.
    console.error("create-checkout-session failed:", message);
    return json(502, {
      error: `Could not create Checkout Session. ${message}`,
    });
  }
}
