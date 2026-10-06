import Nib from "../components/Nib";

type Props = {
  onBack: () => void;
};

export default function Privacy({ onBack }: Props) {
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
        <p className="legal-eyebrow">Privacy</p>
        <h1>Your work stays on your bench</h1>
        <p className="legal-lede">
          Plain talk for writers. This build keeps your manuscript close — on this device — while
          Quillbench grows toward payments and a public host.
        </p>

        <section className="legal-section">
          <h2>What lives on this device</h2>
          <p>
            Session, library, manuscripts, matter, covers, export locker notes, grammar dismissals,
            editing board state, package unlocks, and the payments waitlist are stored in your
            browser’s <strong>localStorage</strong>. Clearing site data for this origin removes
            them. We do not sync that data to Quillbench servers in this build.
          </p>
        </section>

        <section className="legal-section">
          <h2>Scan &amp; OCR</h2>
          <p>
            Page photos you choose for Scan stay in the browser. OCR runs locally (Tesseract in
            this tab). Images are not uploaded to Quillbench servers in this build.
          </p>
        </section>

        <section className="legal-section">
          <p>
            <strong>Emails you give us.</strong> If you join the waitlist, or sign up for cover and
            launch tips on the free Cover Brief page, we keep your email address and the link you
            arrived from (including any campaign tags in it). Our host, Netlify, stores these
            sign-ups for us and keeps its own standard server logs. We use your email only to send
            Quillbench updates and tips. To unsubscribe or have your email deleted, email{" "}
            <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>.
          </p>
        </section>

        <section className="legal-section">
          <p>
            <strong>Visit counts.</strong> Our pages count visits without cookies. For each visit we
            record the page, the site that sent you, any campaign tags in the link, and a one-day
            code made from your IP address and browser that we can't turn back into either. We
            don't store your IP address.
          </p>
        </section>

        <section className="legal-section">
          <p>
            <strong>Your Cover Brief.</strong> The answers you type into the Cover Brief tool stay
            in your browser. We don't receive them.
          </p>
        </section>

        <section className="legal-section">
          <p>
            <strong>What we don't collect here.</strong> This soft-launch build has no Quillbench
            account backend and no manuscript upload pipeline. Local and email sign-in stay on this
            device so you can use the bench offline.
          </p>
        </section>

        <section className="legal-section">
          <h2>Payments</h2>
          <p>
            Studio packages use Stripe Checkout for secure payment. Card details are handled by
            Stripe — Quillbench does not store your full card number on this device. After a
            successful checkout, unlocks are saved on this device.
          </p>
        </section>

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            Questions about privacy:{" "}
            <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>
          </p>
        </section>

        <p className="legal-updated">Last updated October 2026 · Soft launch</p>
      </main>

      <footer className="legal-foot">
        <nav className="legal-links" aria-label="Support">
          <a className="legal-link" href="/refund/">Refunds</a>
          <span aria-hidden="true">·</span>
          <a className="legal-link" href="/support/">Support</a>
        </nav>
      </footer>
    </div>
  );
}
