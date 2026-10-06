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
          Plain talk for writers. Your manuscripts stay in this browser on this device. This page lists everything Quillbench does collect when you sign up, buy, send an order brief or visit, and where it goes.
        </p>

        <section className="legal-section">
          <h2>What lives on this device</h2>
          <p>
            Session, library, manuscripts, matter, covers, export locker notes, grammar dismissals, editing board state and package unlocks are stored in your browser's localStorage. Clearing site data for this origin removes them. Quillbench doesn't receive any of it. To move your work to another device, use Account → Download Works in Progress backup.
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
            <strong>Emails you give us.</strong>{" "}
            If you join the waitlist, or sign up for cover and launch tips on the free Cover Brief page, we keep your email address and where you signed up from, including any campaign tags in the link you followed. Netlify, our web host, stores these sign-ups for us and keeps its own standard server logs. We use your email only to send Quillbench updates and tips. We don't delete sign-ups automatically yet. To unsubscribe or have your email deleted, email sarah@brundigebusiness.com.
          </p>
        </section>

        <section className="legal-section">
          <p>
            <strong>Your order brief.</strong>{" "}
            After you buy, the thank-you page asks for your email, package, book title, brief, a link to your files and any notes, along with your checkout reference. Netlify stores these for us so Sarah can do your order. Your files link should only share what you want Sarah to see. Email sarah@brundigebusiness.com to have your order details deleted after your order is finished.
          </p>
        </section>

        <section className="legal-section">
          <p>
            <strong>Visit counts.</strong>{" "}
            Our pages count visits without cookies. For each visit we record the page, the site that sent you, any campaign tags in the link, and a one-day code made from your IP address and browser that we can't turn back into either. We don't store your IP address. Visit records aren't deleted automatically yet.
          </p>
        </section>

        <section className="legal-section">
          <p>
            <strong>Your Cover Brief.</strong>{" "}
            The answers you type into the free Cover Brief tool stay in your browser. We don't receive them.
          </p>
        </section>

        <section className="legal-section">
          <p>
            <strong>What we don't collect here.</strong>{" "}
            Quillbench accounts aren't switched on in this build, and manuscripts are never uploaded. Email sign-in in the app stays on this device so you can use the bench offline.
          </p>
        </section>

        <section className="legal-section">
          <h2>Payments</h2>
          <p>
            Studio packages use Stripe Checkout. Stripe handles your card details; Quillbench never sees or stores your full card number. Stripe keeps the payment record and shows us your order details, such as your email, what you bought and the amount, so we can deliver your order and handle refunds. After a successful checkout, your unlock is saved on this device.
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
