# Quillbench source rebuild (Oct 25, 2026)

This is editable React/Vite source rebuilt to match the **live production** deploy `6add746ebfc2e56bddd89112` (bundle `/assets/index-B9jwP51Z.js`, sha1 cc2b7ea5…, build stamp `9cc5424`).
The base was main@8a1d5b6, which was stale. Live changes were ported from the deployed bundle.

**Local only.** It hasn't been deployed or pushed, nothing on Netlify was changed, and production is still locked.
It still has to pass L&E pre-flight. Any deploy needs Sarah's separate yes.

## Build
    npm ci   # here node_modules is a symlink to /workspace/pr4-build/node_modules
    npm run build                       # tsc + vite
    QB_BUILD_SHA=9cc5424 npx vite build # stamps the same build id as live, for comparison

`.env.production` holds only the public live flags: VITE_BILLING_MODE=stripe, VITE_CLOUD_SAVE=on, and VITE_NETLIFY_IDENTITY_URL. It contains no secrets.

## How close it is (see compare/)
| Check | Result |
|---|---|
| CSS bundle | **byte-identical** (same hash `index-6YZ6Klew.css`) |
| gotrue chunk | byte-identical (`index-Bh8SLGPN.js`) |
| JS string literals (every string/template in the bundle, via an AST walk) | **0 differences** (only the build stamp differs if you don't set QB_BUILD_SHA) |
| JS bundle size | 894,626 bytes, the same as live; the hash differs because of minified identifier names and code order |
| Screenshots of / and /portfolio/ at 390 and 1280 (headless Chromium, full page) | **pixel-identical** (compare/shots) |
| Network on / and /portfolio/ | the same requests, apart from the main JS file name |
| Checkout click (local, functions stubbed) | `POST /.netlify/functions/hit` (checkout_click), then `POST /.netlify/functions/create-checkout-session` with `{packageId, successUrl:/thank-you/?pkg=…, cancelUrl:?checkout=cancel&pkg=…}`, matching live code |
| /portfolio/ | noindex, with the banner; "See sample covers" links to /portfolio/ |
| AI alt text, Cover Check $29, keepsake, $499 bundle | match live; no SOFTLAUNCH50 or $449 strings are left in the bundle |

## Remaining gaps
1. **Normalized code diff (compare/app.diff, 53 small hunks).** None of them change a string or behavior:
   - minifier identifier names;
   - routeAfterSignIn/shouldAdoptSession sit in a different place;
   - billing.ts: live keeps a dead `status===404||503` comma-expression;
   - Privacy/Terms: `{" "}` JSX whitespace is split differently but renders the same.
2. **Decompiled code still to clean up.** `src/screens/Landing.tsx` and `src/components/CameraScan.tsx` came from the decompiled bundle. They are marked `// @ts-nocheck` and still have minified local names. They need renaming and types before long-term editing.
3. **Netlify-side pieces can't be checked from the bundle:**
   - The live netlify.toml/_redirects is not public, and `netlify/functions/*` comes from main@8a1d5b6, so the live function code wasn't verified.
   - The waitlist `<form>` in index.html is the source form. Netlify rewrites it at deploy, so the live HTML differs as expected.
4. **Not covered by tests:** the camera scan was not tested in a real camera session, and Netlify Identity sign-in and cloud save weren't run end to end. Checkout was run only against a stubbed function.
5. The original repo README is kept as README.original.md.
