import Nib from "../components/Nib";

type Props = {
  onBack: () => void;
};

export default function Terms({ onBack }: Props) {
  return (
    <div className="legal-page">
      <header className="legal-top">
        <button className="legal-back" type="button" onClick={onBack}>
          ← Back
        </button>
        <div className="legal-mark wordmark">
          <Nib className="nib" />
          Quillbench
        </div>
      </header>
      <main className="legal-body">
        <p className="legal-eyebrow">Terms of use</p>
        <h1>A fair bench for draft-to-publish</h1>
        <p className="legal-lede">
          Short terms for writers using Quillbench in this soft launch. Not a wall of legalese: the
          spirit is, use the tools, keep your voice, and know what’s still cooking.
        </p>
        <section className="legal-section">
          <h2>What you get</h2>
          <p>
            Free tools on this device (scan, grammar notes, editing board, formatting, export) plus
            optional studio packages (Cover Design, Studio Bundle and Cover Check). Package prices
            on the landing and Publishing shelf are available via Stripe Checkout.
          </p>
          <p>
            {
              "Add-on: Print Wrap, $59. Add the print wrap (spine and back cover) to your Cover Design. Print Wrap includes 1 revision and a free spine redo. See "
            }
            <a href="/pricing/cover/#print-wrap">Print Wrap</a>.
          </p>
        </section>
        <section className="legal-section">
          <h2>How studio packages are made</h2>
          <p>
            Some covers are made with AI tools and some by hand. Either way, Quillbench reviews and
            edits every cover before it's delivered.
          </p>
          <p>Cover Check is drafted with AI tools, then edited and signed off by Quillbench.</p>
        </section>
        <section className="legal-section">
          <h2>AI tools and your files</h2>
          <p>
            {
              "Quillbench itself keeps your files only for your order, and Cover Check files are deleted 90 days after delivery. See "
            }
            <a href="/privacy/">Privacy</a>.
          </p>
          <p>
            The Eden sample cover shown on this site was made with AI tools, and it is labelled that
            way.
          </p>
        </section>
        <section className="legal-section">
          <h2>Paid unlocks</h2>
          <p>
            Paid unlocks use Stripe Checkout. After a successful payment, the unlock is saved on
            this device only. It doesn't carry over to other phones or computers automatically, even
            if you're signed in.
          </p>
        </section>
        <section className="legal-section">
          <h2>Delivery</h2>
          <p>
            Cover Design is delivered within 5 business days of your clock-start date. The Studio
            Bundle is delivered within 14 business days of your clock-start date. Your clock starts
            the day Quillbench emails to confirm your brief is complete (all 5 fields filled in and
            your files link opens), within 1 business day. Work starts on your clock-start date.
          </p>
          <p>
            If your brief is missing or incomplete, Quillbench follows up by email on day 2 and day
            5. After that, the delivery clock is paused until your brief is complete.
          </p>
          <p>
            If Quillbench delivers your Cover Design, Print Wrap or Studio Bundle late, you get an
            apology and one extra round of changes, free.
          </p>
          <p>
            Print Wrap is delivered within 3 business days. Its clock starts once we have your final
            front cover and your final page count.
          </p>
          <p>
            Cover Design includes 2 rounds of changes. The Studio Bundle includes 5. Misses from the
            brief are fixed free and don't count as a round. Print Wrap includes 1 revision and a
            free spine redo.
          </p>
        </section>
        <section className="legal-section">
          <h2>Upgrading</h2>
          <p>
            You can upgrade from Cover Design ($99) to the Studio Bundle by paying the difference
            between what you paid and the current Studio Bundle price.
          </p>
        </section>
        <section className="legal-section">
          <h2>Refunds</h2>
          <p>
            {
              "Full refund before work starts. After that, refunds are case by case. This applies to Cover Design, Print Wrap, the Studio Bundle and Cover Check. See the "
            }
            <a href="/refund/">refund policy</a>
            {" for how to ask."}
          </p>
          <p>
            {`Cover Design first-look promise, a stated exception to "case by case": if you don't like the first version (ebook front cover, audiobook cover and 3D mockup) that Quillbench delivers, email Quillbench (address on our `}
            <a href="/refund/">Refunds page</a>) within 7 days of the day Quillbench emails you the
            first version, before you ask for any changes, and you get a full refund of your $99.
            Quillbench refunds the full $99 to your original payment method within 5 business days
            of your email; your bank may take a few more days to show it. You don't need to give a
            reason. Asking for a change ends the first-look promise. If you take the refund, you
            don't get the right to use that cover or its files. Quillbench will never show or sell
            that cover. We may use the same general style for other books, but never your title,
            your brief, or that cover's artwork. This applies to the $99 Cover Design only, not the
            Studio Bundle or Print Wrap.
          </p>
          <p>
            Cover Check has two promises that are stated exceptions to "case by case": you get a
            refund even after work starts if either applies. It is delivered within 5 business days
            of your clock-start date, which is the day Quillbench emails to confirm it has your
            cover, genre and blurb. If your Cover Check is late, your $29 is refunded and you still
            get your Check. Cover Check promise: at least 3 fixes you can use, or a full refund. A
            usable fix is a specific, actionable change to the title, type, image, layout or color.
            If you get fewer than 3, email sarah@brundigebusiness.com within 14 days of delivery for
            a full refund.
          </p>
        </section>
        <section className="legal-section">
          <h2>Your writing stays yours</h2>
          <p>
            Quillbench does not auto-rewrite your novel. Grammar and editing surfaces offer notes
            and a status board; you decide what to keep. You own your manuscript and exports.
          </p>
        </section>
        <section className="legal-section">
          <h2>Your covers</h2>
          <p>
            Cover art you attach to a book belongs to you (the writer). When a print pack is already
            attached to a manuscript, the app references it as-is and does not rebuild or claim
            those covers.
          </p>
          <p>
            For covers Quillbench makes for you (Cover Design, Print Wrap and the Studio Bundle),
            you get full rights to use the final cover for your book and its marketing. Quillbench
            keeps the right to show it in its portfolio, except a cover that was refunded.
          </p>
        </section>
        <section className="legal-section">
          <h2>Age</h2>
          <p>
            You must be at least 18 years old to order from Quillbench. By ordering, you confirm
            that you are.
          </p>
        </section>
        <section className="legal-section">
          <h2>Privacy</h2>
          <p>
            {"How we handle your manuscripts, briefs, files and email is on the "}
            <a href="/privacy/">privacy page</a>. We don't sell your data or your writing.
            Quillbench is for adults 18 and over. If you're under 18, please don't send us your
            email, a brief or files. If you think a minor has sent us something, email
            sarah@brundigebusiness.com and we'll delete it.
          </p>
        </section>
        <section className="legal-section">
          <h2>Soft launch · as is</h2>
          <p>
            This is an early public-facing build. Features may change, break, or reset. The free
            tools are provided as is without warranties for this soft launch. For paid packages,
            we'll do the work with reasonable care and skill and deliver what's described for your
            package. Don’t rely on local unlocks or locker metadata as the only copy of paid work or
            files.
          </p>
        </section>
        <section className="legal-section">
          <h2>Liability, law and changes</h2>
          <p>
            Quillbench's total liability for any order is capped at the amount you paid for it.
            These terms are governed by Texas law. Any change to these terms is posted on this page
            with a date.
          </p>
          <p>
            Nothing in these terms limits rights you have under consumer protection law, including
            the Texas Deceptive Trade Practices-Consumer Protection Act, that can't be limited by
            agreement.
          </p>
        </section>
        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            Terms or product questions:{" "}
            <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>
          </p>
        </section>
        <p>
          Quillbench is run by Sarah Brundige. Questions about these terms:{" "}
          <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>.
        </p>
        <p className="legal-updated">Last updated: October 17, 2026 · Soft launch</p>
      </main>
      <footer className="legal-foot">
        <nav className="legal-links" aria-label="Support">
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
        </nav>
        <p className="qb-addr">Brundige Business, 1401 Lavaca St PMB 41086, Austin, TX 78701</p>
      </footer>
    </div>
  );
}
