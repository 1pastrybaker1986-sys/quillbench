import { FormEvent, useState } from "react";
import { signInDemo, signInWithEmail } from "../lib/store";
import { submitWaitlist } from "../lib/waitlist";
import {
  formatCatalogBundlePrice,
  formatSoftBundlePrice,
  SOFT_LAUNCH,
} from "../lib/softLaunch";
import type { Session } from "../lib/types";
import Nib from "../components/Nib";
import ProductDemo from "../components/ProductDemo";

type Props = {
  onSignedIn: (session: Session) => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
};

const BULLETS = [
  {
    title: "Scan → Grammar → Format/Export",
    blurb: "OCR typed pages, catch fiction notes, then print PDF and EPUB.",
  },
  {
    title: "Editing board",
    blurb: "Four-pass status board from developmental through proof.",
  },
  {
    title: "Studio packages",
    blurb: "Full Edit, Cover, Marketing, or Bundle when you want a hand up.",
  },
] as const;

const PACKAGES = [
  { name: "Full Edit", price: "$249" },
  { name: "Cover", price: "$179" },
  { name: "Marketing", price: "$129" },
  {
    name: "Bundle",
    price: formatSoftBundlePrice(),
    was: formatCatalogBundlePrice(),
    soft: true,
  },
] as const;

export default function Landing({ onSignedIn, onOpenPrivacy, onOpenTerms }: Props) {
  const [email, setEmail] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);

  function continueWithEmail(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onSignedIn(signInWithEmail(email));
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

  function scrollToSignIn() {
    document.getElementById("landing-signin")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => document.getElementById("email")?.focus(), 350);
  }

  function scrollToWaitlist() {
    document.getElementById("landing-waitlist")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => document.getElementById("waitlist-email")?.focus(), 350);
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

      <section className="landing-bundle-hero" aria-labelledby="bundle-hero-heading">
        <div className="landing-bundle-card">
          <p className="landing-bundle-eyebrow">Soft launch · early access</p>
          <h1 id="bundle-hero-heading">Studio Bundle</h1>
          <p className="landing-bundle-tag">
            Full Edit + Cover Design + Marketing — one unlock for writers taking a book to market.
          </p>
          <div className="landing-bundle-price-row">
            <span className="landing-bundle-soft">{formatSoftBundlePrice()}</span>
            <span className="landing-bundle-was">{formatCatalogBundlePrice()}</span>
            <span className="landing-bundle-save">${SOFT_LAUNCH.discountDollars} off</span>
          </div>
          <p className="landing-bundle-window">
            Soft-launch offer for a {SOFT_LAUNCH.windowLabel} {SOFT_LAUNCH.softLaunchAround}. Save
            your spot for early access — then use code <strong>{SOFT_LAUNCH.couponCode}</strong> at
            checkout when prompted (or enjoy the soft-launch price messaging here). Checkout still
            uses Stripe catalog prices unless that coupon exists in your Stripe Dashboard.
          </p>
          <div className="landing-bundle-actions">
            <button className="btn btn-primary" type="button" onClick={scrollToWaitlist}>
              Save my spot
            </button>
            <button className="btn btn-ghost landing-cta-secondary" type="button" onClick={scrollToSignIn}>
              Try the bench free
            </button>
          </div>
        </div>
      </section>

      <section className="landing-hero" aria-labelledby="landing-headline">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Book production for writers</p>
          <h2 id="landing-headline">From typed pages to publish-ready files</h2>
          <p className="landing-lede">
            One rose-gold bench for Scan, Grammar, Editing, Formatting, and Publishing — start free on
            this device.
          </p>
          <ul className="landing-bullets">
            {BULLETS.map((b) => (
              <li key={b.title}>
                <span className="landing-bullet-mark" aria-hidden="true" />
                <div>
                  <strong>{b.title}</strong>
                  <span>{b.blurb}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="landing-cta-row">
            <button className="btn btn-primary landing-cta-primary" type="button" onClick={() => onSignedIn(signInDemo())}>
              Continue as demo
            </button>
            <button className="btn btn-ghost landing-cta-secondary" type="button" onClick={scrollToSignIn}>
              Get started
            </button>
          </div>
        </div>
        <div className="landing-hero-aside">
          <ProductDemo />
        </div>
      </section>

      <section className="landing-price-strip" aria-label="Studio package prices">
        <p className="landing-price-label">
          Studio packages <span>· Stripe Checkout</span>
        </p>
        <ul>
          {PACKAGES.map((p) => (
            <li key={p.name}>
              <span>{p.name}</span>
              {"soft" in p && p.soft ? (
                <strong className="landing-price-soft">
                  <span className="landing-price-was">{p.was}</span> {p.price}
                </strong>
              ) : (
                <strong>{p.price}</strong>
              )}
            </li>
          ))}
        </ul>
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
            Soft launch {SOFT_LAUNCH.softLaunchAround} — a {SOFT_LAUNCH.windowLabel}. Leave your
            email to save your spot. At checkout, use code <strong>{SOFT_LAUNCH.couponCode}</strong>{" "}
            when prompted for ${SOFT_LAUNCH.discountDollars} off ({formatCatalogBundlePrice()} →{" "}
            {formatSoftBundlePrice()}). Honest note: Stripe charges the catalog price unless that
            coupon is set up in the Dashboard.
          </p>
          {waitlistDone ? (
            <p className="landing-waitlist-thanks" role="status">
              You’re on the list. We’ll email early-access notes — and remind you about{" "}
              {SOFT_LAUNCH.couponCode} at checkout.
            </p>
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
            Email sign-in stays on this device. Prefer a quick look? Use demo — same library and tools.
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
          <button className="btn btn-primary" type="submit">
            Continue
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => onSignedIn(signInDemo())}>
            Continue as demo writer
          </button>
        </form>
      </section>

      <footer className="landing-foot">
        <img src="/art/quill-flourish.svg" alt="" width={280} height={20} aria-hidden="true" />
        <p>Quillbench · draft to publish-ready · soft launch {SOFT_LAUNCH.softLaunchAround}</p>
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
