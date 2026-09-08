/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BILLING_MODE?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PRICE_FULL_EDIT?: string;
  readonly VITE_STRIPE_PRICE_COVER_DESIGN?: string;
  readonly VITE_STRIPE_PRICE_MARKETING?: string;
  readonly VITE_STRIPE_PRICE_STUDIO_BUNDLE?: string;
  readonly VITE_STRIPE_CHECKOUT_SESSION_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
