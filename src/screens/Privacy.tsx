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
        <h1>Your work, your choice</h1>
        <p className="legal-lede">
          Plain talk for writers. If you use Quillbench without signing in, your manuscripts stay in this browser on this device. If you sign in with your email, your Works in Progress are also copied to your Quillbench account. This page lists everything Quillbench collects when you sign in, sign up, buy, send an order brief or visit, and where it goes.
        </p>

        <section className="legal-section">
          <h2>What lives on this device</h2>
          <p>
            Session, library, manuscripts, matter, covers, export locker notes, grammar dismissals, editing board state and package unlocks are stored in your browser's localStorage. Clearing site data for this origin removes them from this device. If you don't sign in, Quillbench doesn't receive any of it. If you do sign in, see "Your Quillbench account (optional)" below. To keep your own copy, use Account → Download Works in Progress backup.
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
            <strong>Your Quillbench account (optional).</strong>{" "}
            Signing in is optional. When you enter your email to sign in, Netlify Identity (our web host's sign-in service) creates an account with your email address and emails you a sign-in link. It also stores a random password we generate, which you never see or use. Signing in sets a sign-in cookie and keeps you signed in in this browser.
          </p>
          <p>
            Each time you open Quillbench while signed in, the Works in Progress on this device that belong to your account are copied to your account, replacing the previous copy. The copy includes each book's title, subtitle, author name, dedication, copyright year, publisher line, manuscript text, any cover image you attached, cover notes, and editing and review notes, plus your email and display name. It's stored with Netlify under your account, and Quillbench only lets your own signed-in session reach it. Quillbench doesn't load this copy into other browsers or devices, so to move work between devices, use the backup file.
          </p>
          <p>
            Signing out doesn't delete your account or the copy, and there's no delete button in the app. To get a copy of your account data, or to delete your account and everything stored with it, email sarah@brundigebusiness.com from the address you signed in with, and Sarah will delete your sign-in account and the stored copy with Netlify. We keep accounts and copies until you ask us to delete them.
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
            Our visit counter doesn't use cookies. For each visit we record the page, the site that sent you, any campaign tags in the link, and a one-day code made from your IP address and browser that we can't turn back into either. We don't store your IP address. Visit records aren't deleted automatically yet.
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
            If you choose Start on this device and don't sign in, your manuscripts never leave this browser. Page photos for Scan are never uploaded, signed in or not. We don't sell your data or your writing.
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
