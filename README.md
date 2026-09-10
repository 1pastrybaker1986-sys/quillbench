# Quillbench

A book-production bench for writers. Take a manuscript from draft to publish-ready files — grammar, editing, formatting, publishing ops — in one place.

This is **soft-launch Days 1–5** (Bundle hero, waitlist → Sarah email, post-export buy nudge) on **milestone 19** waitlist/support, m18 legal, m17 Stripe scaffold, m16 landing/deploy, and earlier work through **milestone 15**: richer rose-gold color punch + lightweight SVG/CSS graphics (sign-in hero, library ornament, workspace flourish) on top of m14 publish-ready hardening, m13 package payoffs + readiness meter, m12 visual/nav, m11 competitive polish, Editing board + Publishing packages, Scan page detect, Grammar v0, and Formatting PDF/EPUB/cover/locker.

Sarah is the first writer through it. The app is for many writers, not Sarah-only.

## Run locally

From this folder:

    npm install
    npm run dev

Open **http://127.0.0.1:5173/**

Walk the path:

1. Land on sign-in — email + continue, or **Continue as demo writer**
2. See this writer’s library (seeded with *Eden’s Fall* and *Night Orchard*)
3. Open a book into the workspace
4. Paste a chapter, drop a .txt/.md, or **Scan pages** (PNG/JPEG/WebP photos) in Formatting — the spread preview updates. Use sample chapter resets the seed text. Replace manuscript with scan overwrites the draft.
5. Open the **Grammar** tab for a fiction-aware review of that manuscript (including scanned text). Accept / Keep as-is dismiss a note; Accept sticks across refresh. Re-scan manuscript re-runs the checks.
6. Open **Editing** for the four-pass board (status + notes, passes 1–4). Unlock Full Edit for **Priority review** notes; payments coming soon — unlocks save on this device.
7. Open **Publishing** for the readiness meter, KDP/Ingram checklist, Cover/Marketing payoffs, and studio packages shelf.
8. Fill Matter (author, subtitle, dedication, copyright year, publisher line). Eden's Fall is seeded with author and year
9. Pick trim 5.5×8.5 or 6×9 (preview reflows)
10. Cover rail: attach a PNG/JPEG/WebP (data URL saved on the book). Library cards pick it up on return. Eden’s Fall keeps its seeded pack until you click Remove.
11. Print PDF downloads a real interior PDF. EPUB downloads a real ebook. Each success is logged in the Export locker (last 10). Export again re-runs that kind.

Refresh keeps the demo session, matter/manuscript, cover, and locker. Sign out from the library header.

## What this build is

- Web first (Vite + React)
- PWA-lite: public/manifest.webmanifest + icons + theme-color (no service worker)
- Auth **placeholder** — local session in `localStorage`, no identity provider
- Book records in `localStorage` (seeded per writer), including optional `manuscriptText`, matter, `coverSrc`, and `exports`. Shape is ready to swap for a cloud store
- Print interior PDF via `pdf-lib` (title, copyright, dedication if any, then body)
- EPUB 3 via `jszip` (same matter/body; cover embedded when available)
- Scan pages via `tesseract.js` (English OCR in the browser; images stay on this device)
- Grammar v0 via `src/lib/grammarCheck.ts` (repeated words, whitespace, pacing, quote mix — flag, don’t flatten voice)
- Editing board + Publishing packages/checklist (local unlocks; payments coming soon)
- Privacy + Terms pages (Landing / Library footers; `?page=privacy|terms`)
- Soft-launch Studio Bundle hero ($449 / SOFTLAUNCH50) + waitlist (`quillbench.waitlist.v1` + Netlify Forms `quillbench-waitlist`) + support `hello@quillbench.app`
- Post-export buy nudge → Publishing packages
- One visual system; not a CRUD admin

## What this build is not

- Not real auth, cloud database, or device sync
- Not a paid grammar API or auto-rewrite (Grammar v0 is client-side notes; Editing is a status board + local package unlock)
- Not PDF page scan yet — use PNG, JPEG, or WebP photos of pages
- Not native iOS / Android / desktop
- Does not rebuild Eden’s Fall covers — the existing print pack is referenced as-is
- Export locker is metadata only (no stored blobs / re-download of a past file)

## Key paths

| Path | Role |
| --- | --- |
| `src/lib/types.ts` | Session + book record seams (incl. matter, cover, exports) |
| `src/lib/store.ts` | localStorage session, library, manuscript, matter, cover, locker |
| `src/lib/printPdf.ts` | Print interior PDF (trim, 0.75 in margins) |
| `src/lib/exportEpub.ts` | EPUB 3 package |
| `src/lib/ocrScan.ts` | Client-side Tesseract OCR (scan pages) |
| `src/lib/pageDetect.ts` | Paper-region detect + crop before OCR |
| `src/lib/grammarCheck.ts` | Fiction-aware Grammar v0 + dismissed-note localStorage |
| `src/lib/packages.ts` | Studio package catalog + local unlock stub |
| `src/lib/editingBoard.ts` | Four-pass editing board per book |
| `src/lib/publishChecklist.ts` | KDP/Ingram checklist per book |
| `src/components/EditingPanel.tsx` | Editing board + Full Edit Priority review |
| `src/lib/priorityReview.ts` | Full Edit priority review notes |
| `src/lib/coverBrief.ts` | Cover Design brief |
| `src/lib/marketingKit.ts` | Marketing kit |
| `src/lib/publishReadiness.ts` | Publish readiness score |
| `src/components/PublishingPanel.tsx` | Readiness meter + Cover/Marketing payoffs + packages |
| `src/lib/sampleManuscript.ts` | Sample chapter + chapter-title parse |
| `src/lib/waitlist.ts` | Payments waitlist emails (`quillbench.waitlist.v1`) |
| `src/screens/Landing.tsx` | Marketing landing + waitlist + demo/sign-in CTAs |
| `src/screens/Privacy.tsx` | Privacy policy (localStorage, OCR, Stripe later) |
| `src/screens/Terms.tsx` | Terms of use (packages, unlock stub, as-is soft launch) |
| `src/screens/SignIn.tsx` | Demo sign-in |
| `src/screens/Library.tsx` | This writer’s book list (cover thumbs from `coverSrc`) |
| `src/screens/Workspace.tsx` | Module switcher + book journey strip + Grammar / Editing / Formatting / Publishing |
| `public/covers/edens-fall-front.png` | Eden’s Fall cover thumb (print pack already attached — do not rebuild) |
| `public/manifest.webmanifest` | PWA-lite manifest (theme rose-gold) |
| `../PUBLISH-READY.md` | Local run, agent preview, blockers, 9/15 checklist |
| `../milestone-14-publish-harden.md` | Publish-harden ship note |
| `../milestone-18-legal-pages.md` | Privacy + Terms pages |
| `../milestone-19-waitlist-support.md` | Waitlist + support contact |
| `SOFT-LAUNCH-D1-5.md` | Soft-launch D1–5: Bundle offer, Netlify Forms, Stripe coupon/Live keys |

## Later

Replace `src/lib/store.ts` with real accounts + a manuscript store. Keep the `Session` and `Book` shapes. Push this folder to any git remote when you want a cloud repo — nothing here depends on Origin or GitHub.

## Scan pages

From Formatting, **Scan pages** opens a multi-file picker (PNG, JPEG, or WebP). OCR runs in this browser (English) — pages are not uploaded. The first scan downloads the reader; later pages reuse it. Scan finds the typed page in the photo (crops hands/desk/edges when it can), then OCRs it. Progress shows *Finding page…* then *Reading page 2 of 5…*. **Replace manuscript with scan** overwrites the draft. There is no page cap. PDF page files are not in this version; photograph or export pages as images.

## Grammar

From the **Grammar** tab: a fiction-aware review of the current manuscript (paste, drop, or Scan pages in Formatting). Notes are suggestions — dialect and fragments are fine. **Accept** dismisses a note and remembers it for that book after refresh. **Keep as-is** does the same. **Re-scan manuscript** runs the checks again.

## Editing

From the **Editing** tab: four-pass board (developmental → line → copy → proof), numbered 1–4. Notes auto-save on blur; Save still confirms. Free writers can use the board; a rose-gold CTA offers Unlock Full Edit ($249) or Studio Bundle ($499), or **See all packages** jumps to Publishing. Full Edit owned unlocks a **Priority review** notes section (persisted per book in `quillbench.priorityReview.v1`).

## Publishing

From the **Publishing** tab: **publish readiness** meter (0–100 + Next tip), KDP paperback / KDP ebook / Ingram (optional) checklist, **Cover Design** brief and **Marketing** kit when unlocked, plus the studio packages shelf (Studio Bundle first, Best value). Payments coming soon — unlocks persist in `localStorage` on this device. See also `../PUBLISHING.md` and `../milestone-13-package-payoffs.md`.

## EPUB

From Formatting, **EPUB** downloads `{slug}-ebook.epub` (title, copyright, dedication, body; cover embedded when available).
