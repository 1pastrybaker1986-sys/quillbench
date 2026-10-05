import { FormEvent, useEffect, useState } from "react";
import { startLocalSession, signInWithEmail } from "../lib/store";
import { isCloudSaveEnabled } from "../lib/cloudSaveFlag";
import { identityMagicLink } from "../lib/netlifyCloudSave";
import { startCheckout } from "../lib/billing";
import type { PackageId } from "../lib/packages";
import {
  formatCatalogBundlePrice,
  formatSoftBundlePrice,
  SOFT_LAUNCH,
} from "../lib/softLaunch";
import type { Session } from "../lib/types";
import Nib from "../components/Nib";
import "./Landing.css";

type Props = {
  onSignedIn: (session: Session) => void;
  onScanStart: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
};

/**
 * Cover samples shown on the home page. Real work only: never stock art, AI mock-ups, or
 * invented "client" covers. Add or remove an entry here to change the section; with an
 * empty array the hero falls back to the desk illustration and the samples section shows a
 * single "Samples on request" line. Eden's Fall approved by Sarah (via Rook, 12:59 AM Oct 5). S1 Soft-PASS 1:37 AM Oct 5: web front is the published sunset print front (Edens-Fall-FRONT-cover-print-300dpi), matching the print back detail.
 * The back cover is a cropped detail: the author name and barcode are left off on purpose.
 */
type CoverSample = {
  id: string;
  label: string;
  alt: string;
  /** 800px-wide JPEG fallback */
  jpg: string;
  /** WebP sources with their pixel widths */
  webp: { src: string; w: number }[];
  width: number;
  height: number;
};

const SAMPLES: CoverSample[] = [
  {
    id: "edens-fall-front",
    label: "Front cover",
    alt: "Eden's Fall front cover, designed by Sarah",
    jpg: "/samples/edens-fall-front-800.jpg",
    webp: [
      { src: "/samples/edens-fall-front-800.webp", w: 800 },
      { src: "/samples/edens-fall-front-1280.webp", w: 1280 },
    ],
    width: 800,
    height: 533,
  },
  {
    id: "edens-fall-back",
    label: "Back cover (detail)",
    alt: "Eden's Fall back cover, a cropped detail showing the blurb, designed by Sarah",
    jpg: "/samples/edens-fall-back-detail-800.jpg",
    webp: [
      { src: "/samples/edens-fall-back-detail-800.webp", w: 800 },
      { src: "/samples/edens-fall-back-detail-1280.webp", w: 1280 },
    ],
    width: 800,
    height: 417,
  },
];

const COVER_INCLUDES = [
  "Ebook front cover",
  "2400x2400 audiobook cover",
  "3D book mockup",
  "2 rounds of changes included",
] as const;

const BUNDLE_INCLUDES = [
  "Cover: ebook front cover, 2400x2400 audiobook cover, and a 3D book mockup",
  "Print wrap (spine and back)",
  "Proofread up to 40,000 words",
  "Blurb polish",
  "6 promo graphics sized from your approved cover",
  "2 rounds of changes on cover and proofread; graphics get typo or crop fixes",
] as const;

function SamplePicture({
  sample,
  sizes,
  eager = false,
}: {
  sample: CoverSample;
  sizes: string;
  eager?: boolean;
}) {
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={sample.webp.map((s) => `${s.src} ${s.w}w`).join(", ")}
        sizes={sizes}
      />
      <img
        src={sample.jpg}
        alt={sample.alt}
        width={sample.width}
        height={sample.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        {...(eager ? { fetchPriority: "high" as const } : {})}
      />
    </picture>
  );
}

export default function Landing({ onSignedIn, onScanStart, onOpenPrivacy, onOpenTerms }: Props) {
  const [email, setEmail] = useState("");
  const [busyPkg, setBusyPkg] = useState<PackageId | null>(null);
  const [checkoutNote, setCheckoutNote] = useState<{ pkg: PackageId; text: string } | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const cloudOn = isCloudSaveEnabled();
  const heroSample = SAMPLES[0];

  // Deep links: ?buy=studio-bundle starts Bundle checkout; /pricing* scrolls to the offers.
  // (/pricing, /pricing/bundle, /pricing/cover and /waitlist are static pages on Netlify.)
  useEffect(() => {
    try {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      const params = new URLSearchParams(window.location.search);
      if (path.startsWith("/pricing")) {
        const target = path.startsWith("/pricing/bundle") ? "landing-price" : "landing-cover";
        window.setTimeout(() => {
          document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
      if (params.get("buy") === "studio-bundle") {
        window.setTimeout(() => {
          document.getElementById("landing-price")?.scrollIntoView({ behavior: "smooth", block: "start" });
          void buy("studio-bundle");
        }, 120);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot deep-link once
  }, []);

  async function continueWithEmail(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || authBusy) return;
    setAuthNote(null);
    if (!cloudOn) {
      onSignedIn(signInWithEmail(email));
      return;
    }
    // Flag ON: real GoTrue magic link (no local session until email click)
    setAuthBusy(true);
    const result = await identityMagicLink(email);
    setAuthBusy(false);
    setAuthNote(result.message);
  }

  /**
   * Starts the existing Stripe Checkout flow. startCheckout() itself records the click with the
   * visit counter (checkout_click on /app/cover-design or /app/studio-bundle), so no second
   * beacon is sent here: that would count every home click twice.
   */
  async function buy(pkg: PackageId) {
    if (busyPkg) return;
    setCheckoutNote(null);
    setBusyPkg(pkg);
    const result = await startCheckout(pkg);
    setBusyPkg(null);
    if (!result.ok) setCheckoutNote({ pkg, text: result.reason });
  }

  function scrollToId(id: string, focusId?: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focusId) window.setTimeout(() => document.getElementById(focusId)?.focus(), 450);
  }

  const coverLabel = busyPkg === "cover-design" ? "Opening checkout…" : "Get your cover, $99";
  const bundleLabel =
    busyPkg === "studio-bundle" ? "Opening checkout…" : `Get Studio Bundle ${formatSoftBundlePrice()}`;
  const note = (pkg: PackageId) =>
    checkoutNote?.pkg === pkg ? (
      <p className="hs-checkout-note" role="alert">
        {checkoutNote.text}
      </p>
    ) : null;

  return (
    <div className="landing hs">
      <header className="hs-top">
        <a className="hs-mark wordmark" href="/" aria-label="Quillbench home">
          <Nib className="nib" />
          Quillbench
        </a>
        <button className="hs-top-link" type="button" onClick={() => scrollToId("landing-app", "email")}>
          Free app · Sign in
        </button>
      </header>

      <main>
        <section className="hs-hero" aria-labelledby="landing-headline">
          <div className="hs-hero-copy">
            <p className="hs-eyebrow">Book covers and launch kits for indie authors</p>
            <h1 id="landing-headline">Your book cover, designed for&nbsp;you.</h1>
            <p className="hs-lede">
              Send a short brief and Sarah designs your cover. You get an ebook front cover, a
              2400x2400 audiobook cover, and a 3D book mockup, with 2 rounds of changes included.
            </p>
            <div className="hs-cta-row">
              <button
                className="hs-btn hs-btn-primary"
                type="button"
                disabled={busyPkg !== null}
                onClick={() => void buy("cover-design")}
              >
                {coverLabel}
              </button>
              <a className="hs-btn hs-btn-quiet" href="/tools/cover-brief/">
                Start with a free Cover Brief
              </a>
            </div>
            {note("cover-design")}
            <p className="hs-fine">
              One-time $99 USD · delivered within 5 business days of your clock-start date ·
              full refund any time before work starts
            </p>
          </div>

          <figure className="hs-hero-art">
            {heroSample ? (
              <>
                <div className="hs-frame hs-frame-tilt">
                  <SamplePicture
                    sample={heroSample}
                    sizes="(max-width: 900px) calc(100vw - 3rem), 46vw"
                    eager
                  />
                </div>
                <figcaption>Eden&rsquo;s Fall, {heroSample.label.toLowerCase()} · designed by Sarah</figcaption>
              </>
            ) : (
              <img className="hs-hero-still" src="/art/calm-desk.svg" alt="" width={520} height={390} />
            )}
          </figure>
        </section>

        <section className="hs-section hs-cover" id="landing-cover" aria-labelledby="cover-heading">
          <div className="hs-card hs-cover-card">
            <div className="hs-cover-what">
              <p className="hs-eyebrow">Cover Design</p>
              <h2 id="cover-heading">What you get for $99</h2>
              <ul className="hs-checks">
                {COVER_INCLUDES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="hs-muted">
                Print wrap (spine and back) isn&rsquo;t included. It comes with the Studio Bundle
                below.
              </p>
            </div>
            <div className="hs-cover-how">
              <h3>How it works</h3>
              <ol className="hs-steps">
                <li>
                  <strong>Check out.</strong> One-time payment of $99 USD.
                </li>
                <li>
                  <strong>Send your brief.</strong> A short form right after checkout asks for your
                  title, genre, the feel you want, books you like the look of, and a link to your
                  files.
                </li>
                <li>
                  <strong>Get your cover.</strong> Sarah emails within 1 business day to confirm
                  your brief is complete. That&rsquo;s your clock-start date, and your cover is
                  delivered within 5 business days of it.
                </li>
              </ol>
              <p className="hs-muted">
                Full refund any time before work starts; no refund after.{" "}
                <a href="/refund/">Refund policy</a>
              </p>
            </div>
            <div className="hs-card-actions">
              <button
                className="hs-btn hs-btn-primary"
                type="button"
                disabled={busyPkg !== null}
                onClick={() => void buy("cover-design")}
              >
                {coverLabel}
              </button>
              <a className="hs-text-link" href="/pricing/cover/">
                Full Cover Design details
              </a>
              {note("cover-design")}
            </div>
          </div>
        </section>

        <section className="hs-section hs-samples" id="landing-samples" aria-labelledby="samples-heading">
          {SAMPLES.length > 0 ? (
            <>
              <div className="hs-section-head">
                <p className="hs-eyebrow">Recent work</p>
                <h2 id="samples-heading">Eden&rsquo;s Fall, front and back</h2>
                <p className="hs-muted">A front and back cover set designed by Sarah.</p>
              </div>
              <div className="hs-sample-grid">
                {SAMPLES.map((s) => (
                  <figure key={s.id} className="hs-sample">
                    <div className="hs-frame">
                      <SamplePicture sample={s} sizes="(max-width: 900px) calc(100vw - 3rem), 44vw" />
                    </div>
                    <figcaption>{s.label}</figcaption>
                  </figure>
                ))}
              </div>
            </>
          ) : (
            <p className="hs-muted hs-samples-empty" id="samples-heading">
              Samples on request: email{" "}
              <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>
            </p>
          )}
        </section>

        <section className="hs-section hs-about" aria-labelledby="about-heading">
          <div className="hs-about-inner">
            <span className="hs-monogram" aria-hidden="true">
              S
            </span>
            <div>
              <p className="hs-eyebrow" id="about-heading">
                Who I am
              </p>
              <p className="hs-about-text">
                Hi, I&rsquo;m Sarah. I design every cover myself. I take pride in the work and make sure each design tells the story as much as the words themselves.
              </p>
            </div>
          </div>
        </section>

        <section className="hs-section hs-bundle" id="landing-price" aria-labelledby="price-card-heading">
          <div className="hs-card hs-bundle-card">
            <div className="hs-bundle-head">
              <p className="hs-eyebrow">Want the whole launch done?</p>
              <h2 id="price-card-heading">Studio Bundle</h2>
              <p className="hs-bundle-lede">
                Your cover plus the print wrap, a proofread, blurb polish, and launch graphics, in
                one order.
              </p>
              <p className="hs-bundle-price">
                <span className="hs-bundle-amount">{formatSoftBundlePrice()}</span>
                <span className="hs-bundle-then">
                  {SOFT_LAUNCH.softLaunchThrough}, then {formatCatalogBundlePrice()}
                </span>
              </p>
              <p className="hs-muted hs-small">
                {SOFT_LAUNCH.couponCode} is applied automatically at Checkout. Price is{" "}
                {formatSoftBundlePrice()} USD, not $4.49.
              </p>
            </div>
            <div className="hs-bundle-body">
              <ul className="hs-checks">
                {BUNDLE_INCLUDES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="hs-muted">
                Delivered within 14 business days of your clock-start date. If you owe a
                word-count invoice, your clock starts when it&rsquo;s paid.
              </p>
              <div className="hs-card-actions">
                <button
                  className="hs-btn hs-btn-outline"
                  type="button"
                  disabled={busyPkg !== null}
                  onClick={() => void buy("studio-bundle")}
                >
                  {bundleLabel}
                </button>
                <a className="hs-text-link" href="/pricing/bundle/">
                  Full Studio Bundle details
                </a>
                {note("studio-bundle")}
              </div>
            </div>
          </div>
        </section>

        <section className="hs-section hs-free" id="landing-app" aria-labelledby="free-heading">
          <div className="hs-free-copy">
            <p className="hs-eyebrow">Also free</p>
            <h2 id="free-heading">The Quillbench writing app</h2>
            <p>
              Write, scan typed pages into clean text, and export a print PDF and EPUB. It&rsquo;s
              free and runs on this device.
            </p>
            <div className="hs-free-actions">
              <button
                className="hs-btn hs-btn-outline"
                type="button"
                onClick={() => onSignedIn(startLocalSession())}
              >
                Start writing free
              </button>
              <button className="hs-text-link" type="button" onClick={onScanStart}>
                Scan a page
              </button>
            </div>
            <p className="hs-muted hs-small">
              Planning a cover? The free <a href="/tools/cover-brief/">Cover Brief tool</a> turns
              your ideas into a brief and works out your spine width and cover sizes.
            </p>
          </div>

          <div className="hs-signin" id="landing-signin">
            <form className="signin-card hs-signin-card" onSubmit={continueWithEmail}>
              <h2>Sign in</h2>
              <p className="lede">
                {cloudOn
                  ? "Cloud Save: email a magic link and the Works in Progress on this device are copied to your Quillbench account. Start on this device to stay local-only."
                  : "Email sign-in stays on this device. Or start free with an empty Works in Progress — same Write, Scan, and tools."}
              </p>
              <label className="field" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn-primary" type="submit" disabled={authBusy}>
                {cloudOn ? (authBusy ? "Sending link…" : "Email magic link") : "Continue"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => onSignedIn(startLocalSession())}>
                Start on this device
              </button>
              {authNote ? (
                <p className="landing-auth-note" role="status">
                  {authNote}
                </p>
              ) : null}
            </form>
          </div>
        </section>
      </main>

      <footer className="hs-foot">
        <img src="/art/quill-flourish.svg" alt="" width={280} height={20} aria-hidden="true" loading="lazy" />
        <p>Quillbench · book covers and launch kits for indie authors</p>
        <p>
          Questions? <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>
        </p>
        <nav className="legal-links" aria-label="Legal and support">
          <button className="legal-link" type="button" onClick={onOpenPrivacy}>
            Privacy
          </button>
          <span aria-hidden="true">·</span>
          <button className="legal-link" type="button" onClick={onOpenTerms}>
            Terms
          </button>
          <span aria-hidden="true">·</span>
          <a className="legal-link" href="/refund/">Refunds</a>
          <span aria-hidden="true">·</span>
          <a className="legal-link" href="/support/">Support</a>
          <span aria-hidden="true">·</span>
          <a className="legal-link" href="/waitlist">Waitlist</a>
        </nav>
      </footer>
    </div>
  );
}
