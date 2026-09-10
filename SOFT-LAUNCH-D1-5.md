# Soft launch Days 1–5 — conversion pieces

**Date:** 2026-09-10 (America/Chicago). Soft launch ~**2026-09-15**. Cash-first.  
Do **not** rebuild Eden’s Fall covers. Billing stays **env-based** (no Stripe Live keys in code).

App: `quillbench/`

## What shipped

1. **Landing Studio Bundle hero** — early-access framing, soft-launch **$449** ($50 off **$499**), 48-hour soft-launch window copy, code **SOFTLAUNCH50** (“use at checkout when prompted”). Honest note: checkout still uses Stripe catalog prices unless the coupon exists.
2. **Waitlist** — headline/lede for early access + $50 off Bundle; button **Save my spot**. Submits to Netlify Forms (`quillbench-waitlist`) **and** keeps `localStorage` (`quillbench.waitlist.v1`) for instant UX. Support: `hello@quillbench.app`.
3. **Post-export buy nudge** — after successful Print PDF or EPUB, dismissible rose-gold banner: Studio Bundle soft-launch primary, Cover Design / Full Edit alternatives, Not now. **See packages** switches to Publishing.
4. **Publishing / Editing / demo** — soft-launch price messaging on Bundle; still env-based Stripe Checkout (no fake discount charging).

## Sarah must click — Netlify Forms notifications

1. Open **Netlify** → your Quillbench site → **Forms**.
2. Confirm form **`quillbench-waitlist`** appears after deploy (hidden form in `index.html` + Landing POST).
3. Open the form → **Settings / Notifications** (or site **Forms → Form notifications**).
4. Add an **email notification** to **your Gmail** (and/or `hello@quillbench.app`) for new submissions.
5. Optional: outbound to Slack later — email is enough for soft launch.

Without this step, waitlist still saves on the visitor’s device but **you will not get email**.

## Sarah must click — Stripe coupon SOFTLAUNCH50

1. Stripe Dashboard → **Product catalog** → **Coupons** (or **Promotion codes**).
2. Create coupon id / code **`SOFTLAUNCH50`**: **$50 off** (fixed amount), once per customer (or as you prefer).
3. Attach a **promotion code** `SOFTLAUNCH50` so Checkout can accept it when “Allow promotion codes” is on for the session (optional wiring — if not enabled on the Checkout Session yet, tell writers the soft-launch price is the offer framing and apply the coupon manually / enable `allow_promotion_codes` later).
4. Do **not** change the Studio Bundle **Price** to $449 unless you want that permanent — keep catalog at **$499** and discount via coupon.

Checkout in this app does **not** invent a $449 charge. It uses your Stripe **price_…** ids from env.

## Sarah must click — Stripe Live keys (env only)

When ready for real charges (still soft launch):

1. Stripe Dashboard → **Developers → API keys** → reveal **Live** keys.
2. Netlify → Site settings → **Environment variables**:
   - Functions: `STRIPE_SECRET_KEY` = `sk_live_…` (never `VITE_*`)
   - `STRIPE_PRICE_FULL_EDIT` / `COVER_DESIGN` / `MARKETING` / `STUDIO_BUNDLE` = live `price_…` ids
   - Build: `VITE_BILLING_MODE=stripe`, `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_…`
3. Redeploy so Vite embeds client vars.
4. Keep `.env.example` placeholders empty — **no Live keys in the repo**.

See also `STRIPE.md` and `quillbench/.env.example`.

## Verify

```bash
cd quillbench
npx tsc --noEmit && ./node_modules/.bin/vite build
```
