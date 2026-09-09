import { FormEvent, useState } from "react";
import { signInDemo, signInWithEmail } from "../lib/store";
import { addWaitlistEmail } from "../lib/waitlist";
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
  { name: "Bundle", price: "$499" },
] as const;

export default function Landing({ onSignedIn, onOpenPrivacy, onOpenTerms }: Props) {
  const [email, setEmail] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);

  function continueWithEmail(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onSignedIn(signInWithEmail(email));
  }

  function joinWaitlist(e: FormEvent) {
    e.preventDefault();
    if (!addWaitlistEmail(waitlistEmail)) return;
    setWaitlistDone(true);
    setWaitlistEmail("");
  }

  function scrollToSignIn() {
    document.getElementById("landing-signin")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => document.getElementById("email")?.focus(), 350);
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
          <h1 id="landing-headline">From typed pages to publish-ready files</h1>
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
          Studio packages <span>· Checkout wired — payments soon</span>
        </p>
        <ul>
          {PACKAGES.map((p) => (
            <li key={p.name}>
              <span>{p.name}</span>
              <strong>{p.price}</strong>
            </li>
          ))}
        </ul>
      </section>

      {/*
        Waitlist: primary UX = localStorage quillbench.waitlist.v1.
        Optional later: mailto:hello@quillbench.app?subject=Waitlist
        or Formspree POST https://formspree.io/f/YOUR_FORM_ID — see ../DEPLOY.md
      */}
      <section className="landing-waitlist" aria-labelledby="waitlist-heading">
        <div className="landing-waitlist-card">
          <p className="landing-waitlist-eyebrow">Payments coming soon</p>
          <h2 id="waitlist-heading">Get notified when live payments turn on</h2>
          <p className="landing-waitlist-lede">
            Checkout path is ready. Leave your email on this device — we’ll ping you when Stripe keys go live. No account required yet.
          </p>
          {waitlistDone ? (
            <p className="landing-waitlist-thanks" role="status">
              You’re on the list. Thanks — we’ll be in touch when payments go live.
            </p>
          ) : (
            <form className="landing-waitlist-form" onSubmit={joinWaitlist}>
              <label className="sr-only" htmlFor="waitlist-email">
                Email for payment notifications
              </label>
              <input
                id="waitlist-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                required
              />
              <button className="btn btn-primary" type="submit">
                Notify me when payments turn on
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
        <p>Quillbench · draft to publish-ready · local preview until public host</p>
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
