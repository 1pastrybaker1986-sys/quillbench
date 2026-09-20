import { FormEvent, useEffect, useState } from "react";
import { startLocalSession, signInWithEmail } from "../lib/store";
import { isCloudSaveEnabled } from "../lib/cloudSaveFlag";
import { identityMagicLink } from "../lib/netlifyCloudSave";
import { submitWaitlist } from "../lib/waitlist";
import { startCheckout } from "../lib/billing";
import {
  formatCatalogBundlePrice,
  formatSoftBundlePrice,
  SOFT_LAUNCH,
} from "../lib/softLaunch";
import type { Session } from "../lib/types";
import Nib from "../components/Nib";

type Props = {
  onSignedIn: (session: Session) => void;
  onScanStart: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
};

const TILES = [
  {
    id: "scan",
    title: "Scan",
    blurb: "OCR typed pages into clean manuscript text — ready for craft, not stuck as photos.",
  },
  {
    id: "edit",
    title: "Edit craft",
    blurb: "Fiction-aware notes and a four-pass board from developmental through proof.",
  },
  {
    id: "format",
    title: "Format→export",
    blurb: "Print PDF and EPUB with front matter, chapters, and publish-ready files.",
  },
] as const;

export default function Landing({ onSignedIn, onScanStart, onOpenPrivacy, onOpenTerms }: Props) {
  const [email, setEmail] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutNote, setCheckoutNote] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const cloudOn = isCloudSaveEnabled();

  // Deep links: /waitlist, /pricing, /pricing/bundle, ?buy=studio-bundle
  useEffect(() => {
    try {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      const params = new URLSearchParams(window.location.search);
      const wantBuy = params.get("buy") === "studio-bundle";
      if (path === "/waitlist" || path.endsWith("/waitlist")) {
        window.setTimeout(() => {
          document.getElementById("landing-waitlist")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      } else if (path.startsWith("/pricing")) {
        window.setTimeout(() => {
          document.getElementById("landing-price")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      }
      if (wantBuy) {
        window.setTimeout(() => {
          void buyStudioBundle();
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

  async function joinWaitlist(e: FormEvent) {
    e.preventDefault();
    if (waitlistBusy) return;
    setWaitlistBusy(true);
    const ok = await submitWaitlist(waitlistEmail);
    setWaitlistBusy(false);
    if (!ok) return;
    setWaitlistDone(true);
    setWaitlistEmail("");
  }

  async function buyStudioBundle() {
    if (checkoutBusy) return;
    setCheckoutNote(null);
    setCheckoutBusy(true);
    const result = await startCheckout("studio-bundle");
    setCheckoutBusy(false);
    if (!result.ok) {
      setCheckoutNote(result.reason);
      return;
    }
    // stripe redirects; stub unlocks locally — note stays quiet
  }

  function scrollToSignIn() {
    document.getElementById("landing-signin")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => document.getElementById("email")?.focus(), 350);
  }

  function scrollToWaitlist() {
    document.getElementById("landing-waitlist")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => document.getElementById("waitlist-email")?.focus(), 350);
  }

  function scrollToBundle() {
    document.getElementById("landing-price")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="landing">
      <header className="landing-top">
        <div className="landing-mark wordmark">
          <Nib className="nib" />
          Quillbench
        </div>
        <button className="btn btn-ghost landing-top-cta" type="button" onClick={scrollToSignIn}>
          Get started
        </button>
      </header>

      <section className="landing-hero" aria-labelledby="landing-headline">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Book production for writers</p>
          <h1 id="landing-headline">Write free. Ship pro.</h1>
          <p className="landing-lede">
            One bench for Write, Scan, Grammar, Editing, Formatting, and Publishing —
            start free on this device, unlock Studio when you are ready.
          </p>
          <div className="landing-cta-row">
            <button
              className="btn btn-primary landing-cta-primary"
              type="button"
              onClick={() => onSignedIn(startLocalSession())}
            >
              Start free
            </button>
            <button
              className="btn btn-ghost landing-cta-secondary landing-cta-bundle"
              type="button"
              onClick={scrollToBundle}
            >
              Bundle {formatSoftBundlePrice()} · {SOFT_LAUNCH.couponCode}
            </button>
            <button className="btn btn-ghost landing-cta-secondary" type="button" onClick={onScanStart}>
              Scan a page
            </button>
          </div>
        </div>
        <div className="landing-hero-aside landing-hero-still" aria-hidden="true">
          <img
            src="/art/calm-desk.svg"
            alt=""
            width={520}
            height={390}
          />
        </div>
      </section>

      <section
        className="landing-bundle-hero"
        aria-label="Studio Bundle soft launch"
      >
        <div className="landing-bundle-card landing-bundle-ribbon">
          <p className="landing-bundle-eyebrow">Soft launch · Studio Bundle</p>
          <span className="landing-bundle-ribbon-price">{formatSoftBundlePrice()}</span>
          <button
            className="btn btn-primary landing-bundle-ribbon-cta"
            type="button"
            disabled={checkoutBusy}
            onClick={() => void buyStudioBundle()}
          >
            {checkoutBusy ? "Opening checkout…" : `Get Studio Bundle ${formatSoftBundlePrice()}`}
          </button>
        </div>
      </section>

      <section className="landing-tiles" aria-labelledby="landing-tiles-heading">
        <div className="landing-tiles-head">
          <p className="landing-tiles-eyebrow">From draft to files</p>
          <h2 id="landing-tiles-heading">Built for writers who ship</h2>
        </div>
        <ul className="landing-tile-grid">
          {TILES.map((t) => (
            <li key={t.id} className={`landing-tile landing-tile-${t.id}`}>
              <span className="landing-tile-icon" aria-hidden="true" />
              <h3>{t.title}</h3>
              <p>{t.blurb}</p>
              {t.id === "scan" ? (
                <button className="landing-tile-link" type="button" onClick={onScanStart}>
                  Scan a page →
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-price-card-wrap" id="landing-price" aria-labelledby="price-card-heading">
        <div className="landing-price-card">
          <p className="landing-price-card-eyebrow">Soft launch · early access</p>
          <h2 id="price-card-heading">Studio Bundle</h2>
          <p className="landing-price-card-inclusions">
            Full Edit + Cover + Marketing
          </p>
          <div className="landing-bundle-price-row">
            <span className="landing-bundle-soft">{formatSoftBundlePrice()}</span>
            <span className="landing-bundle-was">was {formatCatalogBundlePrice()}</span>
            <span className="landing-bundle-save">{SOFT_LAUNCH.couponCode} auto</span>
          </div>
          <p className="landing-bundle-window">
            Soft-launch pricing {SOFT_LAUNCH.softLaunchThrough}. Studio Bundle Checkout applies{" "}
            <strong>{SOFT_LAUNCH.couponCode}</strong> automatically (
            {formatCatalogBundlePrice()} → {formatSoftBundlePrice()}).
          </p>
          <ul className="landing-price-inclusions" aria-label="Studio Bundle includes">
            <li>
              <strong>Full Edit</strong>
              <span>Four-pass craft board unlocked</span>
            </li>
            <li>
              <strong>Cover</strong>
              <span>Cover design package</span>
            </li>
            <li>
              <strong>Marketing</strong>
              <span>Launch checklist + assets</span>
            </li>
          </ul>
          <div className="landing-bundle-actions">
            <button
              className="btn btn-primary"
              type="button"
              disabled={checkoutBusy}
              onClick={() => void buyStudioBundle()}
            >
              {checkoutBusy ? "Opening checkout…" : `Get Studio Bundle ${formatSoftBundlePrice()}`}
            </button>
            <button className="btn btn-ghost" type="button" onClick={scrollToWaitlist}>
              Save my spot
            </button>
            {checkoutNote ? (
              <p className="landing-waitlist-checkout-note">{checkoutNote}</p>
            ) : null}
          </div>
        </div>
      </section>

      {/*
        Waitlist: localStorage quillbench.waitlist.v1 + Netlify Forms `quillbench-waitlist`.
        Sarah: Netlify → Forms → enable email notifications to her Gmail / hello@quillbench.app
      */}
      <section className="landing-waitlist" id="landing-waitlist" aria-labelledby="waitlist-heading">
        <div className="landing-waitlist-card">
          <p className="landing-waitlist-eyebrow">Early access</p>
          <h2 id="waitlist-heading">
            Early access + ${SOFT_LAUNCH.discountDollars} off the Studio Bundle
          </h2>
          <p className="landing-waitlist-lede">
            Soft launch {SOFT_LAUNCH.softLaunchThrough}. Leave your email to save your spot. Studio
            Bundle Checkout is already {formatSoftBundlePrice()} with{" "}
            <strong>{SOFT_LAUNCH.couponCode}</strong> applied (${SOFT_LAUNCH.discountDollars} off{" "}
            {formatCatalogBundlePrice()}).
          </p>
          {waitlistDone ? (
            <div className="landing-waitlist-next" role="status">
              <p className="landing-waitlist-thanks">
                You’re on the list. We’ll email early-access notes.
              </p>
              <p className="landing-waitlist-next-lede">
                Ready now? Studio Bundle Checkout is {formatSoftBundlePrice()} with{" "}
                <strong>{SOFT_LAUNCH.couponCode}</strong> applied automatically.
              </p>
              <button
                className="btn btn-primary landing-waitlist-buy"
                type="button"
                disabled={checkoutBusy}
                onClick={() => void buyStudioBundle()}
              >
                {checkoutBusy
                  ? "Opening checkout…"
                  : `Get Studio Bundle ${formatSoftBundlePrice()}`}
              </button>
              {checkoutNote ? (
                <p className="landing-waitlist-checkout-note">{checkoutNote}</p>
              ) : null}
            </div>
          ) : (
            <form
              className="landing-waitlist-form"
              name="quillbench-waitlist"
              method="POST"
              data-netlify="true"
              data-netlify-honeypot="bot-field"
              onSubmit={(e) => void joinWaitlist(e)}
            >
              <input type="hidden" name="form-name" value="quillbench-waitlist" />
              <p className="sr-only" aria-hidden="true">
                <label>
                  Don’t fill this out: <input name="bot-field" tabIndex={-1} autoComplete="off" />
                </label>
              </p>
              <label className="sr-only" htmlFor="waitlist-email">
                Email for early access
              </label>
              <input
                id="waitlist-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                required
              />
              <button className="btn btn-primary" type="submit" disabled={waitlistBusy}>
                {waitlistBusy ? "Saving…" : "Save my spot"}
              </button>
            </form>
          )}
          <p className="landing-waitlist-support">
            Questions?{" "}
            <a href="mailto:hello@quillbench.app">hello@quillbench.app</a>
          </p>
        </div>
      </section>

      <section className="landing-signin-wrap" id="landing-signin">
        <div className="landing-signin-orbs" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
        <form className="signin-card landing-signin-card" onSubmit={continueWithEmail}>
          <div className="landing-signin-motif" aria-hidden="true">
            <img src="/art/open-book-motif.svg" alt="" width={56} height={44} />
          </div>
          <h2>Get started</h2>
          <p className="lede">
            {cloudOn
              ? "Cloud Save preview — email a magic link to sync Works in Progress across devices. Local-only start stays on this browser."
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
      </section>

      <footer className="landing-foot">
        <img src="/art/quill-flourish.svg" alt="" width={280} height={20} aria-hidden="true" />
        <p>Quillbench · draft to publish-ready · soft launch {SOFT_LAUNCH.softLaunchThrough}</p>
        <nav className="legal-links" aria-label="Legal and support">
          <button className="legal-link" type="button" onClick={onOpenPrivacy}>
            Privacy
          </button>
          <span aria-hidden="true">·</span>
          <button className="legal-link" type="button" onClick={onOpenTerms}>
            Terms
          </button>
          <span aria-hidden="true">·</span>
          <a className="legal-link" href="mailto:hello@quillbench.app">
            hello@quillbench.app
          </a>
        </nav>
      </footer>
    </div>
  );
}
