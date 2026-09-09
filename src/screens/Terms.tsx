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
          Short terms for writers using Quillbench in this soft launch. Not a wall of legalese —
          the spirit is: use the tools, keep your voice, and know what’s still cooking.
        </p>

        <section className="legal-section">
          <h2>What you get</h2>
          <p>
            Free tools on this device (scan, grammar notes, editing board, formatting, export)
            plus optional <strong>studio packages</strong> (Full Edit, Cover, Marketing, Bundle).
            Package prices on the landing and Publishing shelf are available via Stripe
            Checkout.
          </p>
        </section>

        <section className="legal-section">
          <h2>Paid unlocks</h2>
          <p>
            Paid unlocks use Stripe Checkout. After a successful payment, ownership is recorded on
            this device. Unlocks may not sync to other phones or computers until accounts launch.
          </p>
        </section>

        <section className="legal-section">
          <h2>Your writing stays yours</h2>
          <p>
            Quillbench does <strong>not</strong> auto-rewrite your novel. Grammar and editing
            surfaces offer notes and a status board — you decide what to keep. You own your
            manuscript and exports.
          </p>
        </section>

        <section className="legal-section">
          <h2>Eden’s Fall covers</h2>
          <p>
            Seeded Eden’s Fall cover art in the demo library belongs to you (the writer). The app
            references the existing print pack as-is and does not rebuild or claim those covers.
          </p>
        </section>

        <section className="legal-section">
          <h2>Soft launch · as is</h2>
          <p>
            This is an early public-facing build. Features may change, break, or reset. The
            service is provided <strong>as is</strong> without warranties for this soft launch.
            Don’t rely on local unlocks or locker metadata as the only copy of paid work or files.
          </p>
        </section>

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            Terms or product questions:{" "}
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
