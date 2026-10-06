/**
 * Start a Studio Bundle Checkout for a buyer who already paid for Cover Design.
 *
 * Hosted Checkout on this account rejects customer-typed and URL-prefilled
 * promotion codes, so the credit is applied here with Checkout Session
 * `discounts` (one coupon, no promo field). SOFTLAUNCH50 is never added and
 * cannot stack. Coupon ids come from env; if they are unset the request fails
 * closed instead of charging list price or the soft-launch price.
 *
 * The secret key stays in this function. Amounts are read from Stripe, never
 * from the client.
 */
import Stripe from "stripe";
import {
  BUNDLE_LIST_CENTS,
  COVER_CREDIT_AMOUNTS,
  CoverCreditError,
  bundleCancelUrl,
  bundleSuccessUrl,
  coverPaidAtUnix,
  isCheckoutSessionId,
  isWithinCoverCreditWindow,
  resolveSiteOrigin,
} from "../lib/coverCredit.mjs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

/**
 * @param {number} statusCode
 * @param {Record<string, unknown>} body
 */
function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * @param {import("stripe").Stripe} stripe
 * @param {Record<string, unknown>} fields
 */
async function createCheckoutSession(stripe, fields, idempotencyKey) {
  // A failed branded call must not reuse the same idempotency key: Stripe
  // replays the first response, including a parameter error.
  try {
    return await stripe.checkout.sessions.create(
      { ...fields, branding_settings: { display_name: "Quillbench" } },
      { idempotencyKey: `${idempotencyKey}-brand` },
    );
  } catch (brandErr) {
    const brandMsg =
      brandErr && typeof brandErr === "object" && "message" in brandErr
        ? String(brandErr.message)
        : "";
    if (!/branding_settings|unknown parameter/i.test(brandMsg)) throw brandErr;
    return await stripe.checkout.sessions.create(fields, { idempotencyKey });
  }
}

/**
 * @param {import("stripe").Stripe} stripe
 * @param {string} coverSessionId
 * @param {{ metadata?: Record<string, string> }} coverSession
 */
async function findPriorUpgrades(stripe, coverSessionId, coverSession) {
  /** @type {Map<string, any>} */
  const found = new Map();
  try {
    const res = await stripe.checkout.sessions.search({
      query: `metadata['cover_session_id']:'${coverSessionId}'`,
      limit: 10,
    });
    if (res?.has_more) {
      throw new CoverCreditError(
        409,
        "This Cover purchase was already used toward a Studio Bundle.",
      );
    }
    for (const session of res?.data || []) {
      if (session?.id) found.set(session.id, session);
    }
  } catch (err) {
    if (err instanceof CoverCreditError) throw err;
    /* Search can be unavailable. The metadata pointer below still blocks reuse. */
  }

  const pointed = coverSession.metadata?.cover_credit_session;
  if (isCheckoutSessionId(pointed) && !found.has(pointed)) {
    try {
      const prior = await stripe.checkout.sessions.retrieve(pointed);
      if (prior?.metadata?.cover_session_id === coverSessionId && prior.id) {
        found.set(prior.id, prior);
      }
    } catch {
      /* Stale pointer. A new checkout is allowed when nothing else blocks. */
    }
  }
  return [...found.values()];
}

/**
 * A prior Bundle checkout still open, complete, or paid consumes the one use.
 * An expired unpaid checkout does not.
 * @param {any[]} priors
 */
function blockingPrior(priors) {
  return priors.find((session) => {
    if (!session) return false;
    if (session.payment_status === "paid") return true;
    return session.status === "open" || session.status === "complete";
  });
}

/**
 * @param {any} session
 */
function buyerEmail(session) {
  const email = session?.customer_details?.email;
  if (typeof email !== "string") return "";
  const trimmed = email.trim();
  if (!/^[^@\s]+@[^@\s]+$/.test(trimmed) || /[\r\n]/.test(trimmed)) return "";
  return trimmed;
}

/**
 * @param {import("stripe").Stripe} stripe
 * @param {any} coverSession
 * @param {string} bundleSessionId
 */
async function rememberUpgrade(stripe, coverSession, bundleSessionId) {
  await stripe.checkout.sessions.update(coverSession.id, {
    metadata: {
      ...(coverSession.metadata || {}),
      cover_credit_session: bundleSessionId,
      cover_credit_status: "checkout_open",
    },
  });

  const pi = coverSession.payment_intent;
  const piId = typeof pi === "string" ? pi : pi?.id;
  if (!piId || !stripe.paymentIntents?.update) return;
  try {
    await stripe.paymentIntents.update(piId, {
      metadata: {
        ...(typeof pi === "object" && pi.metadata ? pi.metadata : {}),
        cover_credit_session: bundleSessionId,
      },
    });
  } catch {
    /* The Checkout Session metadata and the Bundle session search are the lock. */
  }
}

/**
 * Verify a paid Cover Checkout Session and create the credited Bundle session.
 * Exported for tests. The HTTP handler is the only production entry.
 *
 * @param {object} input
 * @param {import("stripe").Stripe} input.stripe
 * @param {string} input.coverSessionId
 * @param {number} input.nowUnix
 * @param {string} input.origin
 * @param {Record<string, string | undefined>} input.env
 */
export async function createCoverCreditUpgrade({ stripe, coverSessionId, nowUnix, origin, env }) {
  if (!isCheckoutSessionId(coverSessionId)) {
    throw new CoverCreditError(400, "A Cover Checkout Session id is required.");
  }
  if (!origin) {
    throw new CoverCreditError(503, "Site URL is not configured on the server.");
  }

  let cover;
  try {
    cover = await stripe.checkout.sessions.retrieve(coverSessionId, {
      expand: ["payment_intent.latest_charge"],
    });
  } catch (err) {
    const missing =
      err &&
      typeof err === "object" &&
      (err.code === "resource_missing" || err.statusCode === 404);
    if (missing) {
      throw new CoverCreditError(404, "Cover checkout session was not found.");
    }
    throw err;
  }

  if (!cover || cover.payment_status !== "paid" || cover.status !== "complete") {
    throw new CoverCreditError(400, "This Cover checkout is not paid.");
  }

  const packageId =
    cover.metadata && typeof cover.metadata.packageId === "string"
      ? cover.metadata.packageId
      : "";
  if (packageId !== "cover-design") {
    throw new CoverCreditError(400, "That payment is not a Cover Design purchase.");
  }

  if (cover.currency !== "usd" || !Number.isInteger(cover.amount_total)) {
    throw new CoverCreditError(400, "This Cover payment amount cannot be credited.");
  }

  const envName = COVER_CREDIT_AMOUNTS[cover.amount_total];
  if (!envName) {
    throw new CoverCreditError(400, "This Cover payment amount cannot be credited.");
  }

  const paidAt = coverPaidAtUnix(cover);
  if (paidAt == null || nowUnix < paidAt) {
    throw new CoverCreditError(400, "This Cover payment is outside the credit window.");
  }
  if (!isWithinCoverCreditWindow(paidAt, nowUnix)) {
    throw new CoverCreditError(400, "The 30-day Cover credit window has ended.");
  }

  const priors = await findPriorUpgrades(stripe, cover.id || coverSessionId, cover);
  if (blockingPrior(priors)) {
    throw new CoverCreditError(
      409,
      "This Cover purchase was already used toward a Studio Bundle.",
    );
  }

  const couponId = typeof env[envName] === "string" ? env[envName].trim() : "";
  if (!couponId || /softlaunch50/i.test(couponId)) {
    throw new CoverCreditError(
      503,
      `Cover credit is not configured on the server (missing ${envName}).`,
    );
  }

  const bundlePriceId =
    typeof env.STRIPE_PRICE_STUDIO_BUNDLE === "string" ? env.STRIPE_PRICE_STUDIO_BUNDLE.trim() : "";
  if (!bundlePriceId.startsWith("price_")) {
    throw new CoverCreditError(
      503,
      "No Stripe price configured for studio-bundle. Set STRIPE_PRICE_STUDIO_BUNDLE on Netlify.",
    );
  }

  const coupon = await stripe.coupons.retrieve(couponId);
  const appliesTo = coupon?.applies_to?.products;
  if (
    coupon?.valid === false ||
    coupon?.duration !== "once" ||
    coupon?.currency !== "usd" ||
    coupon?.amount_off !== cover.amount_total ||
    coupon?.percent_off != null ||
    !Array.isArray(appliesTo) ||
    appliesTo.length === 0
  ) {
    throw new CoverCreditError(503, "Cover credit coupon does not match the amount paid.");
  }

  const price = await stripe.prices.retrieve(bundlePriceId);
  const productId = typeof price?.product === "string" ? price.product : price?.product?.id;
  if (
    price?.active === false ||
    price?.currency !== "usd" ||
    price?.unit_amount !== BUNDLE_LIST_CENTS ||
    !productId ||
    !appliesTo.includes(productId)
  ) {
    throw new CoverCreditError(503, "Studio Bundle price is not configured for this credit.");
  }

  const coverId = cover.id || coverSessionId;
  /** @type {Record<string, unknown>} */
  const fields = {
    mode: "payment",
    line_items: [{ price: bundlePriceId, quantity: 1 }],
    success_url: bundleSuccessUrl(origin),
    cancel_url: bundleCancelUrl(origin),
    client_reference_id: coverId,
    // Live checkout-status maps metadata.packageId to `pkg`. Live /thank-you/
    // unlocks studio-bundle from that field. Do not fork those files for this.
    metadata: {
      packageId: "studio-bundle",
      source: "cover-credit",
      cover_session_id: coverId,
      cover_paid_cents: String(cover.amount_total),
    },
    discounts: [{ coupon: couponId }],
  };
  const email = buyerEmail(cover);
  if (email) fields.customer_email = email;

  const idempotencyKey = `cover-credit-${coverId}`;
  let session = await createCheckoutSession(stripe, fields, idempotencyKey);
  if (session?.id) {
    const created = session;
    try {
      const current = await stripe.checkout.sessions.retrieve(session.id);
      if (current?.status) session = { ...current, url: current.url || created.url };
    } catch {
      /* The create response is enough when the new id cannot be read back yet. */
    }
  }
  if (session?.status === "expired") {
    session = await createCheckoutSession(stripe, fields, `${idempotencyKey}-${nowUnix}`);
  }
  if (!session?.url || !session.id) {
    throw new CoverCreditError(502, "Stripe did not return a Checkout URL.");
  }

  await rememberUpgrade(stripe, cover, session.id);

  return {
    url: session.url,
    sessionId: session.id,
    expectedChargeCents: BUNDLE_LIST_CENTS - cover.amount_total,
  };
}

/**
 * @param {any} event
 * @param {{ stripe?: import("stripe").Stripe, env?: Record<string, string | undefined>, nowUnix?: number }} [deps]
 */
export async function handleUpgradeCheckout(event, deps = {}) {
  if (event?.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event?.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." });
  }

  const env = deps.env ?? process.env;
  const secretKey = typeof env.STRIPE_SECRET_KEY === "string" ? env.STRIPE_SECRET_KEY.trim() : "";
  if (!secretKey && !deps.stripe) {
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

  const coverSessionId =
    typeof payload.coverSessionId === "string" ? payload.coverSessionId.trim() : "";
  const origin = resolveSiteOrigin(env);
  const nowUnix = Number.isFinite(deps.nowUnix) ? deps.nowUnix : Math.floor(Date.now() / 1000);

  try {
    const stripe = deps.stripe ?? new Stripe(secretKey);
    const result = await createCoverCreditUpgrade({
      stripe,
      coverSessionId,
      nowUnix,
      origin,
      env,
    });
    return json(200, { url: result.url });
  } catch (err) {
    if (err instanceof CoverCreditError) {
      return json(err.statusCode, { error: err.message });
    }
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "Failed to create Checkout Session.";
    console.error("upgrade-checkout failed:", message);
    return json(502, { error: `Could not start the upgrade checkout. ${message}` });
  }
}

export const handler = (event) => handleUpgradeCheckout(event);
