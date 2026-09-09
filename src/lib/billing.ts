/**
 * Billing facade — stub unlock by default, Stripe Checkout when VITE_BILLING_MODE=stripe.
 */

import { purchase, type PackageId } from "./packages";

export type BillingMode = "stub" | "stripe";

export type CheckoutResult =
  | { ok: true; mode: "stub"; owned: string[] }
  | { ok: true; mode: "stripe"; redirected: true }
  | { ok: false; reason: string };

/** Flip via VITE_BILLING_MODE=stripe once Netlify env + create-checkout-session are live. */
function readMode(): BillingMode {
  const raw = (import.meta.env.VITE_BILLING_MODE as string | undefined)?.trim().toLowerCase();
  return raw === "stripe" ? "stripe" : "stub";
}

export const BILLING_MODE: BillingMode = readMode();

export const STRIPE_CONFIG = {
  publishableKey: (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? "",
  priceIds: {
    "full-edit": (import.meta.env.VITE_STRIPE_PRICE_FULL_EDIT as string | undefined)?.trim() ?? "",
    "cover-design":
      (import.meta.env.VITE_STRIPE_PRICE_COVER_DESIGN as string | undefined)?.trim() ?? "",
    marketing: (import.meta.env.VITE_STRIPE_PRICE_MARKETING as string | undefined)?.trim() ?? "",
    "studio-bundle":
      (import.meta.env.VITE_STRIPE_PRICE_STUDIO_BUNDLE as string | undefined)?.trim() ?? "",
  } satisfies Record<PackageId, string>,
} as const;

/**
 * Checkout Session create URL (Netlify Function).
 * Browser-only apps cannot safely create sessions with the secret key.
 */
export const STRIPE_CHECKOUT_SESSION_URL =
  (import.meta.env.VITE_STRIPE_CHECKOUT_SESSION_URL as string | undefined)?.trim() ||
  "/.netlify/functions/create-checkout-session";

async function readErrorReason(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown; reason?: unknown };
    if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
    if (typeof data.reason === "string" && data.reason.trim()) return data.reason.trim();
  } catch {
    /* ignore non-JSON */
  }
  return fallback;
}

/**
 * Start checkout for a studio package.
 * - stub (default): instant local unlock via purchase()
 * - stripe: POST packageId (+ optional client priceId) to Netlify function, redirect to Checkout
 * Does not throw into Unlock handlers — panels toast the reason and stay usable.
 */
export async function startCheckout(packageId: PackageId): Promise<CheckoutResult> {
  if (BILLING_MODE === "stub") {
    const owned = purchase(packageId);
    return { ok: true, mode: "stub", owned };
  }

  const priceId = STRIPE_CONFIG.priceIds[packageId] || undefined;
  const body: {
    packageId: PackageId;
    successUrl: string;
    cancelUrl: string;
    priceId?: string;
  } = {
    packageId,
    successUrl: `${window.location.origin}?checkout=success&pkg=${packageId}`,
    cancelUrl: `${window.location.origin}?checkout=cancel&pkg=${packageId}`,
  };
  if (priceId) body.priceId = priceId;

  try {
    const res = await fetch(STRIPE_CHECKOUT_SESSION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const reason = await readErrorReason(
        res,
        res.status === 404
          ? "Checkout function not found. Deploy netlify/functions/create-checkout-session and set STRIPE_* on Netlify."
          : res.status === 503
            ? "Checkout is not configured on the server. Set STRIPE_SECRET_KEY and STRIPE_PRICE_* on Netlify."
            : "Checkout failed. Please try again or email hello@quillbench.app.",
      );
      return { ok: false, reason };
    }

    const data = (await res.json()) as { url?: string };
    if (!data.url || typeof data.url !== "string") {
      return {
        ok: false,
        reason: "Checkout session did not return a URL. Check Stripe Dashboard prices and Netlify env.",
      };
    }

    window.location.assign(data.url);
    return { ok: true, mode: "stripe", redirected: true };
  } catch {
    return {
      ok: false,
      reason:
        "Could not reach checkout. Confirm the create-checkout-session function is deployed and you are online.",
    };
  }
}
