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
          <h2>What we don’t collect here</h2>
          <p>
            This soft-launch build has no Quillbench account backend and no manuscript upload
            pipeline. Demo and email sign-in are local placeholders so you can use the bench
            offline on one device. Waitlist emails stay in localStorage until a remote form is
            wired (see deploy notes).
          </p>
        </section>

        <section className="legal-section">
          <h2>Payments later</h2>
          <p>
            Studio package Unlock is a local stub today. When Stripe goes live, checkout will use
            Stripe’s flow for payment details. Quillbench will not store your full card number on
            this device. We’ll update this page when paid unlocks are real.
          </p>
        </section>

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            Questions about privacy:{" "}
            <a href="mailto:hello@quillbench.app">hello@quillbench.app</a>
          </p>
        </section>

        <p className="legal-updated">Last updated September 2026 · Soft launch</p>
      </main>

      <footer className="legal-foot">
        <nav className="legal-links" aria-label="Support">
          <a className="legal-link" href="mailto:hello@quillbench.app">
            hello@quillbench.app
          </a>
        </nav>
      </footer>
    </div>
  );
}
