/**
 * Soft-launch offer copy + pricing (cash-first, ~9/15).
 * Studio Bundle Checkout auto-applies Stripe promo/coupon SOFTLAUNCH50 ($449).
 */

export const SOFT_LAUNCH = {
  /** Catalog Studio Bundle price */
  bundlePrice: 499,
  /** Soft-launch display price when $50 off applies */
  bundleSoftPrice: 449,
  discountDollars: 50,
  /** Stripe promotion code / coupon writers see in messaging */
  couponCode: "SOFTLAUNCH50",
  /** Rough public window framing for early-access copy */
  windowLabel: "48-hour soft-launch window",
  softLaunchAround: "around September 15",
} as const;

export function formatSoftBundlePrice(): string {
  return `$${SOFT_LAUNCH.bundleSoftPrice}`;
}

export function formatCatalogBundlePrice(): string {
  return `$${SOFT_LAUNCH.bundlePrice}`;
}
