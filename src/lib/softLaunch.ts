/**
 * Soft-launch offer copy + pricing (cash-first).
 * Studio Bundle Checkout auto-applies Stripe promo/coupon SOFTLAUNCH50 ($449).
 * Quiet extend through Oct 10 — no fake urgency / no 48-hour clock.
 */

export const SOFT_LAUNCH = {
  /** Catalog Studio Bundle price */
  bundlePrice: 499,
  /** Soft-launch display price when $50 off applies */
  bundleSoftPrice: 449,
  discountDollars: 50,
  /** Stripe promotion code / coupon writers see in messaging */
  couponCode: "SOFTLAUNCH50",
  /** Soft window end for public framing (no countdown urgency) */
  softLaunchThrough: "through October 10",
  /** @deprecated prefer softLaunchThrough — kept for any leftover call sites */
  windowLabel: "soft-launch pricing",
  softLaunchAround: "through October 10",
} as const;

export function formatSoftBundlePrice(): string {
  return `$${SOFT_LAUNCH.bundleSoftPrice}`;
}

export function formatCatalogBundlePrice(): string {
  return `$${SOFT_LAUNCH.bundlePrice}`;
}
