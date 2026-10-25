/**
 * Studio Bundle pricing. The SOFTLAUNCH50 / $449 offer is retired: live price is $499 with no
 * auto-applied coupon (rebuilt from live bundle 6add746e, Oct 25 2026).
 */

export const SOFT_LAUNCH = {
  /** Catalog Studio Bundle price */
  bundlePrice: 499,
} as const;

export function formatCatalogBundlePrice(): string {
  return `$${SOFT_LAUNCH.bundlePrice}`;
}
