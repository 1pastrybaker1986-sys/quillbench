/**
 * Cover Design → Studio Bundle credit rules (owner-locked).
 *
 * A paid Cover checkout can be credited toward the $499 Studio Bundle within
 * 30 calendar days. The credit replaces SOFTLAUNCH50; it never stacks.
 * $99 paid → $400 due. $179 paid → $320 due. Any other amount is refused.
 *
 * The window ends at 11:59:59 PM America/Chicago on the 30th calendar day
 * after the Cover paid date. That is a calendar date in Chicago, not
 * paidAt + 30 * 86400 (DST makes those differ).
 */

export const CHICAGO_TZ = "America/Chicago";

/** Studio Bundle list price in cents. Never taken from the client. */
export const BUNDLE_LIST_CENTS = 49900;

/** Cover amounts that have a matching one-time credit coupon. */
export const COVER_CREDIT_AMOUNTS = Object.freeze({
  9900: "STRIPE_COUPON_COVER_CREDIT_99",
  17900: "STRIPE_COUPON_COVER_CREDIT_179",
});

export class CoverCreditError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   */
  constructor(statusCode, message) {
    super(message);
    this.name = "CoverCreditError";
    this.statusCode = statusCode;
  }
}

/**
 * @param {number} unixSeconds
 * @returns {{ year: number, month: number, day: number }}
 */
export function chicagoCalendarDate(unixSeconds) {
  const parts = chicagoParts(unixSeconds);
  return { year: parts.year, month: parts.month, day: parts.day };
}

/**
 * @param {{ year: number, month: number, day: number }} date
 * @param {number} days
 */
export function addCalendarDays(date, days) {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

/**
 * Unix seconds for a Chicago wall-clock time. 23:59:59 is unambiguous
 * (it is not inside a DST gap or overlap).
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 */
export function chicagoWallTimeToUnix(year, month, day, hour, minute, second) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const adjusted = utcGuess - timeZoneOffsetMs(utcGuess, CHICAGO_TZ);
  return Math.floor((utcGuess - timeZoneOffsetMs(adjusted, CHICAGO_TZ)) / 1000);
}

/**
 * 11:59:59 PM America/Chicago on the 30th calendar day after `paidAtUnix`.
 * @param {number} paidAtUnix
 */
export function coverCreditExpiresAtUnix(paidAtUnix) {
  const paidDay = chicagoCalendarDate(paidAtUnix);
  const expiresDay = addCalendarDays(paidDay, 30);
  return chicagoWallTimeToUnix(
    expiresDay.year,
    expiresDay.month,
    expiresDay.day,
    23,
    59,
    59,
  );
}

/**
 * Inclusive of the expiry second. Rejects a paid time in the future.
 * @param {number} paidAtUnix
 * @param {number} nowUnix
 */
export function isWithinCoverCreditWindow(paidAtUnix, nowUnix) {
  if (!Number.isFinite(paidAtUnix) || !Number.isFinite(nowUnix)) return false;
  if (nowUnix < paidAtUnix) return false;
  return nowUnix <= coverCreditExpiresAtUnix(paidAtUnix);
}

/**
 * When the Cover charge succeeded. Falls back to the PaymentIntent, then
 * the Checkout Session `created` time, when the charge is not expanded.
 * @param {object} session
 * @returns {number | null}
 */
export function coverPaidAtUnix(session) {
  const pi = session?.payment_intent;
  if (pi && typeof pi === "object") {
    const charge = pi.latest_charge;
    if (charge && typeof charge === "object" && Number.isFinite(charge.created)) {
      return charge.created;
    }
    if (Number.isFinite(pi.created)) return pi.created;
  }
  if (Number.isFinite(session?.created)) return session.created;
  return null;
}

/**
 * @param {string | undefined} raw
 */
export function isCheckoutSessionId(raw) {
  return typeof raw === "string" && /^cs_[A-Za-z0-9_]+$/.test(raw) && raw.length <= 255;
}

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} env
 */
export function resolveSiteOrigin(env) {
  const context = typeof env.CONTEXT === "string" ? env.CONTEXT.trim() : "";
  const candidates =
    context === "production"
      ? [env.URL, env.SITE_URL]
      : [env.DEPLOY_PRIME_URL, env.URL, env.SITE_URL];
  for (const candidate of candidates) {
    const origin = normalizeOrigin(candidate);
    if (origin) return origin;
  }
  return "";
}

/**
 * Success URL Stripe will redirect to. `{CHECKOUT_SESSION_ID}` is a Stripe
 * placeholder and must not be encoded.
 * @param {string} origin
 */
export function bundleSuccessUrl(origin) {
  return `${origin}/thank-you/?pkg=studio-bundle&session_id={CHECKOUT_SESSION_ID}`;
}

/**
 * Buyer who leaves Checkout returns to their paid Cover confirmation.
 * The live thank-you page loads this session id and asks checkout-status.
 * @param {string} origin
 * @param {string} coverSessionId
 */
export function bundleCancelUrl(origin, coverSessionId) {
  return `${origin}/thank-you/?session_id=${encodeURIComponent(coverSessionId)}`;
}

/**
 * @param {number} unixSeconds
 */
function chicagoParts(unixSeconds) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(unixSeconds * 1000));
  /** @type {Record<string, string>} */
  const bag = {};
  for (const part of formatted) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour) % 24,
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

/**
 * @param {number} utcMs
 * @param {string} timeZone
 */
function timeZoneOffsetMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  /** @type {Record<string, string>} */
  const bag = {};
  for (const part of parts) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(bag.year),
    Number(bag.month) - 1,
    Number(bag.day),
    Number(bag.hour) % 24,
    Number(bag.minute),
    Number(bag.second),
  );
  return asUtc - utcMs;
}

/**
 * @param {unknown} value
 */
function normalizeOrigin(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.origin;
  } catch {
    return "";
  }
}
