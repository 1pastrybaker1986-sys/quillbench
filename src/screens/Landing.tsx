// @ts-nocheck -- rebuilt from the live production bundle (deploy 6add746e) on Oct 25, 2026.
// The JSX and copy match live exactly; local state names are still the minifier's short names.
// TODO: rename locals and drop @ts-nocheck once the rebuild is accepted.
import React from "react";
import { startLocalSession, signInWithEmail } from "../lib/store";
import { isCloudSaveEnabled } from "../lib/cloudSaveFlag";
import { identityMagicLink } from "../lib/netlifyCloudSave";
import { startCheckout } from "../lib/billing";
import { formatCatalogBundlePrice } from "../lib/softLaunch";
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
 * Cover samples. Alt text must disclose AI tools (KDP rule); never "designed by Sarah".
 */
type CoverSample = {
  id: string;
  label: string;
  alt: string;
  jpg: string;
  webp: { src: string; w: number }[];
  width: number;
  height: number;
};

const SAMPLES: CoverSample[] = [
    {
      id: "edens-fall-front",
      label: "Front cover",
      alt: "Eden's Fall front cover, made with AI tools, edited and signed off by Quillbench",
      jpg: "/samples/edens-fall-front-800.jpg",
      webp: [
        {
          src: "/samples/edens-fall-front-800.webp",
          w: 800,
        },
        {
          src: "/samples/edens-fall-front-1280.webp",
          w: 1280,
        },
      ],
      width: 800,
      height: 450,
    },
    {
      id: "edens-fall-back",
      label: "Back cover (detail)",
      alt: "Eden's Fall back cover, a cropped detail showing the blurb, made with AI tools, edited and signed off by Quillbench",
      jpg: "/samples/edens-fall-back-detail-800.jpg",
      webp: [
        {
          src: "/samples/edens-fall-back-detail-800.webp",
          w: 800,
        },
        {
          src: "/samples/edens-fall-back-detail-1280.webp",
          w: 1280,
        },
      ],
      width: 800,
      height: 417,
    },
  ],
  COVER_INCLUDES = [
    "Ebook front cover",
    "2400x2400 audiobook cover",
    "3D book mockup",
    "2 rounds of changes included",
  ],
  BUNDLE_INCLUDES = [
    "Cover: ebook front cover, 2400x2400 audiobook cover, and a 3D book mockup",
    "Print wrap (spine and back)",
    "Proofread up to 40,000 words (a novella or short book). Writing a full-length novel? Most run 70,000 to 110,000 words. Email Quillbench for a quote before you buy.",
    "Blurb polish",
    "6 promo graphics sized from your approved cover",
    "5 rounds of changes on cover and proofread; graphics get typo or crop fixes. Misses from the brief are fixed free and don't count as a round.",
  ];
function SamplePicture({ sample, sizes, eager = false }) {
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={sample.webp.map((a) => `${a.src} ${a.w}w`).join(", ")}
        sizes={sizes}
      />
      <img
        src={sample.jpg}
        alt={sample.alt}
        width={sample.width}
        height={sample.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        {...(eager
          ? {
              fetchPriority: "high",
            }
          : {})}
      />
    </picture>
  );
}
export default function Landing({ onSignedIn, onScanStart, onOpenPrivacy, onOpenTerms }: Props) {
  const [o, s] = React.useState(""),
    [u, f] = React.useState(null),
    [d, h] = React.useState(null),
    [p, g] = React.useState(null),
    [x, b] = React.useState(false),
    [w, S] = React.useState(() => {
      try {
        return new URLSearchParams(window.location.search).has("signin");
      } catch {
        return false;
      }
    }),
    T = isCloudSaveEnabled();
  React.useEffect(() => {
    try {
      const B = window.location.pathname.replace(/\/+$/, "") || "/",
        W = new URLSearchParams(window.location.search);
      if (B.startsWith("/pricing")) {
        const I = B.startsWith("/pricing/bundle") ? "landing-price" : "landing-cover";
        window.setTimeout(() => {
          document.getElementById(I)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 80);
      }
      W.get("buy") === "studio-bundle" &&
        window.setTimeout(() => {
          (document.getElementById("landing-price")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
            O("studio-bundle"));
        }, 120);
    } catch {}
  }, []);
  async function C(B) {
    if ((B.preventDefault(), !o.trim() || x)) return;
    if ((g(null), !T)) {
      onSignedIn(signInWithEmail(o));
      return;
    }
    b(true);
    const W = await identityMagicLink(o);
    (b(false), g(W.message));
  }
  async function O(B) {
    if (u) return;
    (h(null), f(B));
    const W = await startCheckout(B);
    (f(null),
      W.ok ||
        h({
          pkg: B,
          text: W.reason,
        }));
  }
  function D(B, W) {
    (document.getElementById(B)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    }),
      window.setTimeout(() => document.getElementById(W)?.focus(), 450));
  }
  const M = u === "cover-design" ? "Opening checkout…" : "Get your cover, $99",
    z =
      u === "studio-bundle"
        ? "Opening checkout…"
        : `Get Studio Bundle ${formatCatalogBundlePrice()}`,
    q = (B) =>
      d?.pkg === B ? (
        <p className="hs-checkout-note" role="alert">
          {d.text}
        </p>
      ) : null;
  return (
    <div className="landing hs">
      <header className="hs-top">
        <a className="hs-mark wordmark" href="/" aria-label="Quillbench home">
          <Nib className="nib" />
          Quillbench
        </a>
        <button className="hs-top-link" type="button" onClick={() => D("landing-app", "email")}>
          Free app · Sign in
        </button>
      </header>
      <main>
        <section className="hs-hero" aria-labelledby="landing-headline">
          <div className="hs-hero-copy">
            <p className="hs-eyebrow">My novel went from manuscript to Amazon with Quillbench</p>
            <h1 id="landing-headline">Your book cover, designed for you.</h1>
            <p className="hs-subline">
              Free writing app and cover brief, $29 cover checks, $99 covers, for anyone writing a
              book.
            </p>
            <p className="hs-lede">
              Send a short brief and Quillbench designs your cover. You get an ebook front cover, a
              2400x2400 audiobook cover, and a 3D book mockup, with 2 rounds of changes included.
            </p>
            <div className="hs-cta-row">
              <button
                className="hs-btn hs-btn-primary"
                type="button"
                disabled={u !== null}
                onClick={() => {
                  O("cover-design");
                }}
              >
                {M}
              </button>
              <a className="hs-btn hs-btn-quiet" href="/tools/cover-brief/">
                Start with a free Cover Brief
              </a>
            </div>
            {q("cover-design")}
            <p className="hs-fine">
              One-time $99 USD · delivered within 5 business days of your clock-start date · Full
              refund before work starts. After that, refunds are case by case.
            </p>
            <p className="hs-fine">
              Some covers are made with AI tools and some by hand. Either way, Quillbench reviews
              and edits every cover before it's delivered.
            </p>
            <p className="hs-fine">
              Talk to a real person: email Quillbench at{" "}
              <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>. Every
              message gets a personal reply.
            </p>
          </div>
          <figure className="hs-hero-art">
            <div className="hs-frame hs-frame-tilt hs-frame-portrait">
              <img
                src="/case-study/down-is-where-you-land/img/final-cover.jpg"
                alt="Final cover of Down Is Where You Land: an astronaut riding a hoverboard across a dusty Mars plain"
                width={640}
                height={1024}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>
            <figcaption>
              {
                "Down Is Where You Land, final cover · made with AI image tools from an original concept by the author, reviewed and edited by Quillbench · "
              }
              <a href="/case-study/down-is-where-you-land/">See the case study</a>
            </figcaption>
          </figure>
        </section>
        <section className="hs-section hs-cover" id="landing-cover" aria-labelledby="cover-heading">
          <div className="hs-cover-pair">
            <div className="hs-card hs-cover-card">
              <div className="hs-cover-what">
                <p className="hs-eyebrow">Cover Design</p>
                <h2 id="cover-heading">What you get for $99</h2>
                <ul className="hs-checks">
                  {COVER_INCLUDES.map((B) => (
                    <li key={B}>{B}</li>
                  ))}
                </ul>
                <p className="hs-muted">
                  Print wrap (spine and back) isn’t included. Add it for $59 (
                  <a href="/pricing/cover/#print-wrap">Print Wrap add-on</a>, $158 with the cover),
                  or get it with the Studio Bundle below.
                </p>
              </div>
              <div className="hs-cover-how">
                <h3>How it works</h3>
                <ol className="hs-steps">
                  <li>
                    <strong>Check out.</strong>
                    {" One-time payment of $99 USD."}
                  </li>
                  <li>
                    <strong>Send your brief.</strong>
                    {
                      " A short form right after checkout asks for your title, genre, the feel you want, books you like the look of, and a link to your files."
                    }
                  </li>
                  <li>
                    <strong>Get your cover.</strong>
                    {
                      " Quillbench emails within 1 business day to confirm your brief is complete. That’s your clock-start date, and your cover is delivered within 5 business days of it."
                    }
                  </li>
                </ol>
                <p className="hs-muted">
                  Full refund before work starts. After that, refunds are case by case.{" "}
                  <a href="/refund/">Refund policy</a>
                </p>
              </div>
              <div className="hs-card-actions">
                <button
                  className="hs-btn hs-btn-primary"
                  type="button"
                  disabled={u !== null}
                  onClick={() => {
                    O("cover-design");
                  }}
                >
                  {M}
                </button>
                <a className="hs-text-link" href="/pricing/cover/">
                  Full Cover Design details
                </a>
                <a className="hs-text-link" href="/portfolio/">
                  See sample covers
                </a>
                {q("cover-design")}
              </div>
            </div>
            <div
              className="hs-card hs-check-card"
              id="landing-cover-check"
              role="region"
              aria-labelledby="cover-check-heading"
            >
              <p className="hs-eyebrow">Cover Check</p>
              <h2 id="cover-check-heading">Already have a cover?</h2>
              <p className="hs-check-price">$29</p>
              <p>
                A written critique of the cover you already have, so you know what’s working, what’s
                holding it back, and what to fix first.
              </p>
              <p className="hs-muted">
                Drafted with AI tools, then read, edited and signed off by Quillbench.
              </p>
              <p className="hs-muted">Open to the first 10 Cover Checks.</p>
              <p className="hs-fine">
                Written critique, not a redesign · delivered within 5 business days of your
                clock-start date
              </p>
              <div className="hs-card-actions">
                <a className="hs-btn hs-btn-outline" href="/pricing/cover-check/">
                  Get Cover Check, $29
                </a>
              </div>
            </div>
          </div>
        </section>
        <section
          className="hs-section hs-case-study"
          id="landing-case-study"
          aria-labelledby="case-study-heading"
        >
          <div className="hs-section-head">
            <p className="hs-eyebrow">Case study</p>
            <h2 id="case-study-heading">One book, every step: Down Is Where You Land</h2>
            <p>
              My near-future Mars survival novel, published under my pen name Arteleus Solarian.
              Quillbench did the cover brief, three concepts and four versions, the blurb and the
              KDP setup. Paperback and Kindle, live October 20.
            </p>
            <p>
              <a
                className="hs-text-link"
                id="landing-case-study-link"
                href="/case-study/down-is-where-you-land/"
              >
                See every step and the real drafts →
              </a>
            </p>
            <p className="hs-muted">
              This cover was created with AI image tools from an original concept by the author,
              then reviewed and edited by Quillbench.
            </p>
          </div>
        </section>
        <section
          className="hs-section hs-samples"
          id="landing-samples"
          aria-labelledby="samples-heading"
        >
          {SAMPLES.length > 0 ? (
            <>
              <div className="hs-section-head">
                <p className="hs-eyebrow">Recent work</p>
                <h2 id="samples-heading">Eden’s Fall</h2>
                <p className="hs-muted">
                  Cover art and a back-cover detail from Eden’s Fall. Made with AI tools, edited and
                  signed off by Quillbench.
                </p>
              </div>
              <div className="hs-sample-grid">
                {SAMPLES.map((B) => (
                  <figure className="hs-sample" key={B.id}>
                    <div className="hs-frame">
                      <SamplePicture
                        sample={B}
                        sizes="(max-width: 900px) calc(100vw - 3rem), 44vw"
                      />
                    </div>
                    <figcaption>{B.label}</figcaption>
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
        <section className="hs-section hs-kinds" id="landing-kinds" aria-labelledby="kinds-heading">
          <div className="hs-section-head">
            <p className="hs-eyebrow">Every kind of book</p>
            <h2 id="kinds-heading">Example covers by kind of book</h2>
            <p className="hs-muted">
              Real work only. Where there’s no finished cover to show yet, the slot says so.
            </p>
          </div>
          <ul className="hs-checks" id="landing-kinds-list">
            <li>
              <strong>Novel:</strong>
              {" Down Is Where You Land (case study above) and Eden’s Fall"}
            </li>
          </ul>
          <p className="hs-muted">
            Memoir, poetry, business or school book? I design for all of them.
          </p>
        </section>
        <section
          className="hs-section hs-keepsake"
          id="landing-keepsake"
          aria-labelledby="keepsake-heading"
        >
          <div className="hs-card">
            <p className="hs-eyebrow">Family and memoir books</p>
            <h2 id="keepsake-heading">A one-of-a-kind keepsake cover for your family book</h2>
            <p>
              {
                "Writing a family history, a memoir or a book of a parent’s stories? Instead of a stock template, Quillbench designs a custom cover around your title, names and photos. It’s the same "
              }
              <a href="/pricing/cover/">Cover Design</a>, at the same price.
            </p>
            <ul className="hs-checks">
              <li>
                <strong>Storyworth or Remento:</strong>
                {
                  " these books use the service’s own cover layout with a cover photo and title, so Quillbench designs the cover image you upload into it."
                }
              </li>
              <li>
                <strong>Blurb or Lulu:</strong>
                {
                  " the front cover is sized to the trim size you pick there. A printed book also needs a spine and back cover: add the"
                }{" "}
                <a href="/pricing/cover/#print-wrap">Print Wrap</a>
                {" (1 revision and a free spine redo), or get it with the Studio Bundle below."}
              </li>
            </ul>
            <p className="hs-muted">
              Some covers are made with AI tools and some by hand. Either way, Quillbench reviews
              and edits every cover before it's delivered. Not sure which fits your book? Email{" "}
              <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>.
            </p>
          </div>
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
                Hi, I’m the designer behind Quillbench. I review and edit every cover myself.
                Depending on what each author needs, some covers are made entirely by hand and
                others with AI tools or other design software. I take pride in the work and make
                sure each design tells the story as much as the words themselves.
              </p>
            </div>
          </div>
        </section>
        <section
          className="hs-section hs-bundle"
          id="landing-price"
          aria-labelledby="price-card-heading"
        >
          <div className="hs-card hs-bundle-card">
            <div className="hs-bundle-head">
              <p className="hs-eyebrow">Want the whole launch done?</p>
              <h2 id="price-card-heading">Studio Bundle</h2>
              <p className="hs-bundle-lede">
                Your cover (ebook front cover, 2400x2400 audiobook cover and 3D book mockup) plus
                the print wrap, a proofread, blurb polish, and launch graphics, in one order.
              </p>
              <p className="hs-bundle-price">
                <span className="hs-bundle-amount">{formatCatalogBundlePrice()}</span>
              </p>
            </div>
            <div className="hs-bundle-body">
              <ul className="hs-checks">
                {BUNDLE_INCLUDES.map((B) => (
                  <li key={B}>{B}</li>
                ))}
              </ul>
              <p className="hs-muted">
                Delivered within 14 business days of your clock-start date.
              </p>
              <p className="hs-muted">
                Some covers are made with AI tools and some by hand. Either way, Quillbench reviews
                and edits every cover before it's delivered.
              </p>
              <div className="hs-card-actions">
                <button
                  className="hs-btn hs-btn-outline"
                  type="button"
                  disabled={u !== null}
                  onClick={() => {
                    O("studio-bundle");
                  }}
                >
                  {z}
                </button>
                <a className="hs-text-link" href="/pricing/bundle/">
                  Full Studio Bundle details
                </a>
                {q("studio-bundle")}
              </div>
            </div>
          </div>
        </section>
        <section className="hs-section hs-free" id="landing-app" aria-labelledby="free-heading">
          <div className="hs-free-copy">
            <p className="hs-eyebrow">Also free</p>
            <h2 id="free-heading">The Quillbench writing app</h2>
            <p>
              Write, scan typed pages into clean text, and export a print PDF and EPUB. It’s free
              and runs on this device.
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
              {"Planning a cover? The free "}
              <a href="/tools/cover-brief/">Cover Brief tool</a>
              {" turns your ideas into a brief and works out your spine width and cover sizes."}
            </p>
          </div>
          {w ? (
            <div className="hs-signin" id="landing-signin">
              <form className="signin-card hs-signin-card" onSubmit={C}>
                <h2>Sign in</h2>
                <p className="lede">
                  {T
                    ? "Optional: enter your email to get a sign-in link. Once you're signed in, the Works in Progress on this device are copied to your Quillbench account. Choose Start on this device to keep everything in this browser only."
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
                  value={o}
                  onChange={(B) => s(B.target.value)}
                />
                <button className="btn btn-primary" type="submit" disabled={x}>
                  {T ? (x ? "Sending link…" : "Email me a sign-in link") : "Continue"}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => onSignedIn(startLocalSession())}
                >
                  Start on this device
                </button>
                {p ? (
                  <p className="landing-auth-note" role="status">
                    {p}
                  </p>
                ) : null}
              </form>
            </div>
          ) : (
            <p className="hs-muted hs-small" id="landing-signin-link">
              Already use Cloud Save?{" "}
              <button className="hs-text-link" type="button" onClick={() => S(true)}>
                Sign in
              </button>
            </p>
          )}
        </section>
      </main>
      <footer className="hs-foot">
        <img
          src="/art/quill-flourish.svg"
          alt=""
          width={280}
          height={20}
          aria-hidden="true"
          loading="lazy"
        />
        <p>Quillbench · book covers and launch kits for every writer</p>
        <p>
          {"Questions? "}
          <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>
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
          <a className="legal-link" href="/refund/">
            Refunds
          </a>
          <span aria-hidden="true">·</span>
          <a className="legal-link" href="/support/">
            Support
          </a>
          <span aria-hidden="true">·</span>
          <a className="legal-link" href="/faq/">
            FAQ
          </a>
          <span aria-hidden="true">·</span>
          <a className="legal-link" href="/waitlist">
            Waitlist
          </a>
        </nav>
        <p className="qb-addr">Brundige Business, 1401 Lavaca St PMB 41086, Austin, TX 78701</p>
      </footer>
    </div>
  );
}
