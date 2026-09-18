# Privacy · Cloud Save draft (NOT LIVE)

> **Draft only** — Soft-FAIL · No Publish.  
> Live `Privacy.tsx` stays **device-only** until CoS → Sarah Soft-PASS for Netlify Identity + Blobs.  
> Do not wire this copy into the SPA until Soft-PASS.

Last drafted September 2026 · Cloud Save DIG

---

## Your work, your account

When Cloud Save is Soft-PASSed and enabled, Quillbench can keep Works in Progress connected to your account so the same library follows you across phones and computers.

Until then, the live Privacy page is correct: manuscripts stay in this browser’s localStorage on this device.

## What an account would store (proposed)

After you sign in with **Netlify Identity** (magic link / passwordless):

- **Account basics** — email and Identity user id (managed by Netlify GoTrue).
- **Works in Progress (v0)** — book records including title, status, trim, matter fields, optional cover data URL, **manuscript text**, and mirrors of the **editing board** and **priority review** notes.
- Stored as JSON in **Netlify Blobs** under your Identity subject (for example `owners/{sub}/library.v0.json`), reached only with your signed-in session.

Demo mode for the public bench stays **local-only** and does not upload manuscripts.

## What still stays on the device (v0)

- Grammar dismissals, package unlocks, cover/marketing kits, publish checklist, scan UI prefs, and waitlist backup may remain local until a later Soft-PASS.
- Export locker remains metadata on the book record (no re-downloadable file blobs in v0).
- Scan photos and OCR still run in the browser; page images are not part of the v0 Blobs payload.

## Migration from this device

On first real (non-demo) sign-in, Quillbench may offer **migrate-this-device**: upload the Works in Progress currently on this browser into your account cloud library. You stay in control of when that first upload happens.

## What we don’t do with manuscript data

- We do not sell manuscripts.
- We do not use your draft text to train public models in this Soft-PASS framing.
- Stripe Checkout (when you buy a studio package) handles card details; billing is separate from manuscript Cloud Save. Cloud Save does not require a purchase.

## Clearing data

- **This device:** clear site data for this origin to remove localStorage.
- **Account cloud (when Live):** contact hello@quillbench.app to request deletion of your Blobs library after Identity is enabled.

## Contact

Questions: [hello@quillbench.app](mailto:hello@quillbench.app)

---

*Sibling to live `Privacy.tsx`. Promote only after Soft-PASS; keep Live HTML device-only until then.*
