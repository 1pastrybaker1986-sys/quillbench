/**
 * Create a Stripe Checkout Session for Quillbench studio packages.
 * Secret key + price ids live in Netlify env only — never log them.
 */
import Stripe from "stripe";

// full-edit and marketing removed Sep 30 2026 (Sarah approved packet v2, 9:52 AM): deliverables undefined, archived.
const ALLOWED_PACKAGES = new Set([
  "cover-design",
  "studio-bundle",
]);

const PROD_ORIGIN = "https://quillbench.netlify.app";
const ALLOWED_HOST = /^(quillbench\.netlify\.app|[a-z0-9-]+--quillbench\.netlify\.app)$/;

/** Origin of the deploy that served this request (prod or a Netlify preview); anything else falls back to prod. */
function siteOrigin(event) {
  const h = event.headers || {};
  const host = String(h["x-forwarded-host"] || h.host || "").toLowerCase().split(",")[0].trim();
  return ALLOWED_HOST.test(host) ? `https://${host}` : PROD_ORIGIN;
}

/** Keep a client cancel URL only if it is on the same origin; otherwise use the fallback. */
function sameOriginOr(candidate, origin, fallback) {
  try {
    if (candidate && new URL(candidate).origin === origin) return candidate;
  } catch {
    /* ignore */
  }
  return fallback;
}

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

function softLaunchCode() {
  return process.env.STRIPE_COUPON_SOFTLAUNCH?.trim() || "SOFTLAUNCH50";
}

/** Resolve SOFTLAUNCH50 as a promotion_code id or coupon id (Dashboard names often differ). */
async function softLaunchDiscount(stripe) {
  const code = softLaunchCode();
  try {
    const promos = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    if (promos.data[0]?.id) return { promotion_code: promos.data[0].id };
  } catch {
    /* fall through */
  }
  // Coupon ids are often auto-generated; only try when env/code looks like a coupon id
  // or matches a coupon that was deliberately named SOFTLAUNCH50.
  try {
    const coupon = await stripe.coupons.retrieve(code);
    if (coupon?.id) return { coupon: coupon.id };
  } catch {
    /* fall through */
  }
  return null;
}

async function createCheckoutSession(stripe, fields) {
  try {
    return await stripe.checkout.sessions.create({
      ...fields,
      branding_settings: { display_name: "Quillbench" },
    });
  } catch (brandErr) {
    const brandMsg =
      brandErr && typeof brandErr === "object" && "message" in brandErr
        ? String(brandErr.message)
        : "";
    if (!/branding_settings|unknown parameter/i.test(brandMsg)) throw brandErr;
    return await stripe.checkout.sessions.create(fields);
  }
}

function resolvePriceId(packageId, clientPriceId) {
  const envName = PRICE_ENV_BY_PACKAGE[packageId];
  const fromEnv = envName ? process.env[envName]?.trim() : "";
  // Prefer env only when it is a real Stripe Price id (price_…); ignore product ids etc.
  if (fromEnv && fromEnv.startsWith("price_")) return fromEnv;
  if (typeof clientPriceId === "string") {
    const fromClient = clientPriceId.trim();
    if (fromClient.startsWith("price_")) return fromClient;
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
  const cancelUrl = typeof payload.cancelUrl === "string" ? payload.cancelUrl.trim() : "";
  const clientPriceId = payload.priceId;

  if (!ALLOWED_PACKAGES.has(packageId)) {
    return json(400, {
      error: "Invalid packageId. Allowed: cover-design, studio-bundle.",
    });
  }

  // Success/cancel URLs are built on the server (packet softlaunch-successurl v1 item c, Rook 9:55 AM).
  // The client's successUrl is ignored so no caller can redirect buyers elsewhere.
  const origin = siteOrigin(event);
  const serverSuccessUrl = `${origin}/thank-you/?pkg=${encodeURIComponent(packageId)}&session_id={CHECKOUT_SESSION_ID}`;
  const serverCancelUrl = sameOriginOr(cancelUrl, origin, `${origin}/?checkout=cancel&pkg=${encodeURIComponent(packageId)}`);

  const priceId = packageId === "cover-design" ? "price_inline" : resolvePriceId(packageId, clientPriceId);
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
    // Every package, Cover Design included, uses its Stripe catalog Price (amount and
    // description live in Stripe). Cover default Price = $99 (Sarah, Sep 30 12:52 PM CT).
    const lineItem = { price: priceId, quantity: 1 };
    const fields = {
      mode: "payment",
      line_items: [lineItem],
      success_url: serverSuccessUrl,
      cancel_url: serverCancelUrl,
      metadata: { packageId },
    };
    // Stripe forbids discounts + allow_promotion_codes on the same session.
    let session;
    if (packageId === "studio-bundle") {
      const discount = await softLaunchDiscount(stripe);
      if (discount) {
        try {
          session = await createCheckoutSession(stripe, {
            ...fields,
            discounts: [discount],
          });
        } catch {
          session = await createCheckoutSession(stripe, {
            ...fields,
            allow_promotion_codes: true,
          });
        }
      } else {
        // Soft-launch code not found in this Stripe mode — keep typed promo field.
        session = await createCheckoutSession(stripe, {
          ...fields,
          allow_promotion_codes: true,
        });
      }
    } else if (packageId === "cover-design") {
      // Cover Design is a fixed $99; no promo-code field (Rook prod OK, Sep 29).
      session = await createCheckoutSession(stripe, fields);
    } else {
      session = await createCheckoutSession(stripe, {
        ...fields,
        allow_promotion_codes: true,
      });
    }

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
