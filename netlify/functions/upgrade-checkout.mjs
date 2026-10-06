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

const NOT_CONFIGURED = "Checkout is not configured.";
const COULD_NOT_START = "The upgrade checkout could not be started.";
const CANNOT_CREDIT = "This Cover purchase cannot be credited.";
const ALREADY_USED = "This Cover purchase was already used toward a Studio Bundle.";

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
 * Log only Stripe's type, code, and request id. Never the message or the key.
 * @param {unknown} err
 */
function logStripeFailure(err) {
  const details = stripeErrorDetails(err);
  console.error("upgrade-checkout failed", details.type, details.code, details.requestId);
}

/**
 * @param {unknown} err
 */
function stripeErrorDetails(err) {
  if (!err || typeof err !== "object") {
    return { type: "Error", code: undefined, requestId: undefined };
  }
  const record = /** @type {any} */ (err);
  const raw = record.raw && typeof record.raw === "object" ? record.raw : null;
  const requestId =
    typeof record.requestId === "string"
      ? record.requestId
      : raw && typeof raw.requestId === "string"
        ? raw.requestId
        : undefined;
  const type = typeof record.type === "string" ? record.type : record.name || "Error";
  const code = typeof record.code === "string" ? record.code : undefined;
  return { type, code, requestId };
}

/**
 * @param {unknown} err
 */
function isMissing(err) {
  if (!err || typeof err !== "object") return false;
  const record = /** @type {any} */ (err);
  return record.code === "resource_missing" || record.statusCode === 404;
}

/**
 * A refund, a partial refund, or a dispute spends the credit.
 * @param {any} charge
 */
function chargeBlocksCredit(charge) {
  if (!charge || typeof charge !== "object") return true;
  if (charge.refunded === true) return true;
  const refundedCents = Number(charge.amount_refunded);
  if (Number.isFinite(refundedCents) && refundedCents > 0) return true;
  if (charge.disputed === true) return true;
  if (charge.dispute) return true;
  return false;
}

/**
 * @param {any} session
 * @param {number} nowUnix
 * @returns {"used" | "open" | "none"}
 */
function upgradeState(session, nowUnix) {
  if (!session) return "none";
  if (session.payment_status === "paid" || session.status === "complete") return "used";
  if (session.status === "expired") return "none";
  if (session.status === "open") {
    if (Number.isFinite(session.expires_at) && session.expires_at <= nowUnix) return "none";
    return "open";
  }
  // Unknown status: do not open a second checkout.
  return "used";
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
 * PaymentIntent metadata is the one-use lock. Live coupons have no redemption cap.
 * @param {import("stripe").Stripe} stripe
 * @param {any} paymentIntent
 * @param {string} coverId
 * @param {number} nowUnix
 */
async function lookupUpgrade(stripe, paymentIntent, coverId, nowUnix) {
  const pointer = paymentIntent?.metadata?.cover_credit_upgrade_session;
  if (!isCheckoutSessionId(pointer)) return null;
  let prior;
  try {
    prior = await stripe.checkout.sessions.retrieve(pointer);
  } catch (err) {
    if (isMissing(err)) return null;
    logStripeFailure(err);
    throw new CoverCreditError(502, COULD_NOT_START);
  }
  if (prior?.metadata?.cover_session_id && prior.metadata.cover_session_id !== coverId) {
    logStripeFailure({ type: "Error", code: "upgrade_pointer_mismatch" });
    throw new CoverCreditError(502, COULD_NOT_START);
  }
  if (upgradeState(prior, nowUnix) === "none") return null;
  return prior;
}

/**
 * Write the lock only after the Bundle session exists. If the write fails,
 * expire that session so a retry cannot pay it and also create another.
 * @param {import("stripe").Stripe} stripe
 * @param {any} paymentIntent
 * @param {string} bundleSessionId
 * @param {number} nowUnix
 */
async function recordUpgradePointer(stripe, paymentIntent, bundleSessionId, nowUnix) {
  const metadata = {
    ...(paymentIntent.metadata || {}),
    cover_credit_upgrade_session: bundleSessionId,
    cover_credit_used_at: String(nowUnix),
  };
  try {
    await stripe.paymentIntents.update(paymentIntent.id, { metadata });
    return;
  } catch (err) {
    logStripeFailure(err);
  }

  let expired = false;
  try {
    await stripe.checkout.sessions.expire(bundleSessionId);
    expired = true;
  } catch (err) {
    logStripeFailure(err);
  }

  if (!expired) {
    try {
      await stripe.paymentIntents.update(paymentIntent.id, { metadata });
    } catch (err) {
      logStripeFailure(err);
    }
  }
  throw new CoverCreditError(502, COULD_NOT_START);
}

/**
 * @param {import("stripe").Stripe} stripe
 * @param {any} cover
 */
async function loadCoverCharge(stripe, cover) {
  const piRef = cover?.payment_intent;
  const piId = typeof piRef === "string" ? piRef : piRef?.id;
  if (!piId) throw new CoverCreditError(409, CANNOT_CREDIT);
  const paymentIntent = await stripe.paymentIntents.retrieve(piId, {
    expand: ["latest_charge"],
  });
  const chargeRef = paymentIntent?.latest_charge;
  const chargeId = typeof chargeRef === "string" ? chargeRef : chargeRef?.id;
  if (!chargeId) throw new CoverCreditError(409, CANNOT_CREDIT);
  const charge = await stripe.charges.retrieve(chargeId);
  return { paymentIntent, charge };
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
    throw new CoverCreditError(503, NOT_CONFIGURED);
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

  const coverId = cover.id || coverSessionId;
  const { paymentIntent, charge } = await loadCoverCharge(stripe, cover);
  const existing = await lookupUpgrade(stripe, paymentIntent, coverId, nowUnix);
  if (chargeBlocksCredit(charge)) {
    if (existing && upgradeState(existing, nowUnix) === "open") {
      try {
        await stripe.checkout.sessions.expire(existing.id);
      } catch (err) {
        logStripeFailure(err);
      }
    }
    throw new CoverCreditError(409, CANNOT_CREDIT);
  }
  const existingState = upgradeState(existing, nowUnix);
  if (existingState === "used") {
    throw new CoverCreditError(409, ALREADY_USED);
  }
  if (existingState === "open") {
    if (!existing.url) throw new CoverCreditError(502, COULD_NOT_START);
    return {
      url: existing.url,
      sessionId: existing.id,
      expectedChargeCents: BUNDLE_LIST_CENTS - cover.amount_total,
    };
  }

  const couponId = typeof env[envName] === "string" ? env[envName].trim() : "";
  if (!couponId || /softlaunch50/i.test(couponId)) {
    throw new CoverCreditError(503, NOT_CONFIGURED);
  }

  const bundlePriceId =
    typeof env.STRIPE_PRICE_STUDIO_BUNDLE === "string" ? env.STRIPE_PRICE_STUDIO_BUNDLE.trim() : "";
  if (!bundlePriceId.startsWith("price_")) {
    throw new CoverCreditError(503, NOT_CONFIGURED);
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
    throw new CoverCreditError(503, NOT_CONFIGURED);
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
    throw new CoverCreditError(503, NOT_CONFIGURED);
  }

  /** @type {Record<string, unknown>} */
  const fields = {
    mode: "payment",
    line_items: [{ price: bundlePriceId, quantity: 1 }],
    success_url: bundleSuccessUrl(origin),
    cancel_url: bundleCancelUrl(origin, coverId),
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
  if (session?.status === "expired" && session.id) {
    // The first key replays the expired Checkout Session for up to 24 hours.
    // A clock-based retry key lets two callers in the same moment each open
    // a new credited session. Key off the expired session id so they collapse.
    session = await createCheckoutSession(
      stripe,
      fields,
      `cover-credit-retry:${coverId}:${session.id}`,
    );
  }
  if (!session?.url || !session.id) {
    throw new CoverCreditError(502, COULD_NOT_START);
  }

  await recordUpgradePointer(stripe, paymentIntent, session.id, nowUnix);

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
    return json(503, { error: NOT_CONFIGURED });
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
    logStripeFailure(err);
    return json(502, { error: COULD_NOT_START });
  }
}

export const handler = (event) => handleUpgradeCheckout(event);
