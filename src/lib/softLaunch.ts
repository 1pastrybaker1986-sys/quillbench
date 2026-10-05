/**
 * Soft-launch offer copy + pricing (cash-first).
 * Studio Bundle Checkout auto-applies Stripe promo/coupon SOFTLAUNCH50 ($449).
 * $449 for the first 10 authors, then $499 (Sarah, Oct 5 2026). No live counter, no fake urgency.
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
  softLaunchThrough: "for the first 10 authors",
  /** @deprecated prefer softLaunchThrough — kept for any leftover call sites */
  windowLabel: "soft-launch pricing",
  softLaunchAround: "for the first 10 authors",
} as const;

export function formatSoftBundlePrice(): string {
  return `$${SOFT_LAUNCH.bundleSoftPrice}`;
}

export function formatCatalogBundlePrice(): string {
  return `$${SOFT_LAUNCH.bundlePrice}`;
}
