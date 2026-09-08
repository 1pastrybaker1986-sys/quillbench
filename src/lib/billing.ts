/**
 * Billing facade — stub unlock today, Stripe Checkout later.
 * Default mode is "stub" so Unlock keeps working offline with no keys.
 */

import { purchase, type PackageId } from "./packages";

export type BillingMode = "stub" | "stripe";

export type CheckoutResult =
  | { ok: true; mode: "stub"; owned: string[] }
  | { ok: true; mode: "stripe"; redirected: true }
  | { ok: false; reason: string };

/** Flip via VITE_BILLING_MODE=stripe once a Checkout Session backend exists. */
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
 * Placeholder Checkout Session create URL.
 * Browser-only apps cannot safely create sessions with the secret key —
 * a tiny serverless function must own that step. See /workspace/books/STRIPE.md.
 */
export const STRIPE_CHECKOUT_SESSION_URL =
  (import.meta.env.VITE_STRIPE_CHECKOUT_SESSION_URL as string | undefined)?.trim() ||
  "/.netlify/functions/create-checkout-session";

function stripeKeysReady(packageId: PackageId): boolean {
  return Boolean(STRIPE_CONFIG.publishableKey && STRIPE_CONFIG.priceIds[packageId]);
}

/**
 * Start checkout for a studio package.
 * - stub (default): instant local unlock via purchase()
 * - stripe + missing keys / no session endpoint: { ok:false, reason:"Configure VITE_STRIPE_*" }
 * - stripe ready: POST session endpoint, redirect to Stripe Checkout URL
 * Does not throw into Unlock handlers — panels toast the reason and stay usable.
 */
export async function startCheckout(packageId: PackageId): Promise<CheckoutResult> {
  if (BILLING_MODE === "stub") {
    const owned = purchase(packageId);
    return { ok: true, mode: "stub", owned };
  }

  if (!stripeKeysReady(packageId)) {
    return { ok: false, reason: "Configure VITE_STRIPE_*" };
  }

  const priceId = STRIPE_CONFIG.priceIds[packageId];
  try {
    // Documented placeholder: backend creates a Checkout Session with the secret key.
    const res = await fetch(STRIPE_CHECKOUT_SESSION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        packageId,
        successUrl: `${window.location.origin}?checkout=success&pkg=${packageId}`,
        cancelUrl: `${window.location.origin}?checkout=cancel&pkg=${packageId}`,
      }),
    });

    if (!res.ok) {
      return { ok: false, reason: "Configure VITE_STRIPE_*" };
    }

    const data = (await res.json()) as { url?: string };
    if (!data.url || typeof data.url !== "string") {
      return { ok: false, reason: "Configure VITE_STRIPE_*" };
    }

    window.location.assign(data.url);
    return { ok: true, mode: "stripe", redirected: true };
  } catch {
    return { ok: false, reason: "Configure VITE_STRIPE_*" };
  }
}
