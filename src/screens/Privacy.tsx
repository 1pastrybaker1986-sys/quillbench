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
          Plain talk for writers. If you use Quillbench without signing in, your manuscripts stay in
          this browser on this device. If you sign in with your email, your Works in Progress are
          also copied to your Quillbench account. This page lists everything Quillbench collects
          when you sign in, sign up, buy, send an order brief or visit, and where it goes.
        </p>
        <section className="legal-section">
          <h2>What lives on this device</h2>
          <p>{`Session, library, manuscripts, matter, covers, export locker notes, grammar dismissals, editing board state and package unlocks are stored in your browser's localStorage. Clearing site data for this origin removes them from this device. If you don't sign in, Quillbench doesn't receive any of it. If you do sign in, see "Your Quillbench account (optional)" below. To keep your own copy, use Account → Download Works in Progress backup.`}</p>
        </section>
        <section className="legal-section">
          <h2>{"Scan & OCR"}</h2>
          <p>
            Scan can use your camera or page photos you choose. Your browser asks for camera
            permission before the camera turns on (unless you've already allowed it), and the camera
            turns off when you finish, close the scanner, or leave the tab. Camera frames and page
            photos are read in your browser and are not uploaded or stored by Quillbench. OCR runs
            in your browser with Tesseract. To run it, your browser downloads the OCR engine and
            English language data from jsDelivr (cdn.jsdelivr.net), a public file host that sees
            your IP address like any site you load, and keeps the language data in browser storage
            for next time. The text Scan reads is added to your manuscript, which is copied to your
            account only if you're signed in.
          </p>
        </section>
        <section className="legal-section">
          <p>
            <strong>Your Quillbench account (optional).</strong> Signing in is optional. When you
            enter your email to sign in, Netlify Identity (our web host's sign-in service) creates
            an account with your email address and emails you a sign-in link. It also stores a
            random password we generate, which you never see or use. Signing in sets a sign-in
            cookie and keeps you signed in in this browser.
          </p>
          <p>
            Each time you open Quillbench while signed in, the Works in Progress on this device that
            belong to your account are copied to your account, replacing the previous copy. The copy
            includes each book's title, subtitle, author name, dedication, copyright year, publisher
            line, manuscript text, any cover image you attached, cover notes, and editing and review
            notes, plus your email and display name. It's stored with Netlify under your account,
            and Quillbench only lets your own signed-in session reach it. Quillbench doesn't load
            this copy into other browsers or devices, so to move work between devices, use the
            backup file.
          </p>
          <p>
            Signing out doesn't delete your account or the copy, and there's no delete button in the
            app. To get a copy of your account data, or to delete your account and everything stored
            with it, email sarah@brundigebusiness.com from the address you signed in with, and
            Quillbench will delete your sign-in account and the stored copy with Netlify. We keep
            accounts and copies until you ask us to delete them.
          </p>
        </section>
        <section className="legal-section">
          <p>
            <strong>Emails you give us.</strong> If you join the waitlist, or sign up for cover and
            launch tips on the free Cover Brief page, we keep your email address and where you
            signed up from, including any campaign tags in the link you followed. Netlify, our web
            host, stores these sign-ups for us and keeps its own standard server logs. We use your
            email only to send Quillbench updates and tips. We don't delete sign-ups automatically
            yet. To unsubscribe or have your email deleted, email sarah@brundigebusiness.com.
          </p>
        </section>
        <section className="legal-section">
          <p>
            <strong>Your order brief.</strong> After you buy Cover Design or the Studio Bundle, the
            thank-you page asks for your email, package, book title, brief, a link to your files and
            any notes, along with your checkout reference. Netlify stores these for us so Quillbench
            can do your order. Your files link should only share what you want Quillbench to see.
            For Cover Design and the Studio Bundle, the AI tools we use to make your order process
            your brief, notes and the files you share. We use them only for your order. Email
            sarah@brundigebusiness.com to have your order details deleted after your order is
            finished.
          </p>
        </section>
        <section className="legal-section">
          <p>
            <strong>Your Cover Check.</strong> For a Cover Check, you email Quillbench your cover
            image, genre and blurb. They're kept in Quillbench's email inbox and working files, and
            the AI tools we use to draft your Check process them. We use them only for your
            critique, including answering your follow-up questions. We delete them, and our emails
            about your Check, 90 days after delivery. To have them deleted sooner, email{" "}
            <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>
            {" or use our "}
            <a href="/support/">Support</a>
            {" page."}
          </p>
        </section>
        <section className="legal-section">
          <p>
            <strong>AI tools.</strong> For Cover Design, the Studio Bundle and Cover Check, the AI
            tools we use don't use what you send us to train their models.
          </p>
        </section>
        <section className="legal-section">
          <p>
            <strong>Visit counts.</strong> Our visit counter doesn't use cookies. For each visit we
            record the page, the site that sent you, any campaign tags in the link, and a one-day
            code made from your IP address and browser that we can't turn back into either. We don't
            store your IP address. Visit records aren't deleted automatically yet.
          </p>
        </section>
        <section className="legal-section">
          <p>
            <strong>Your Cover Brief.</strong>{" "}
            {`The answers you type into the free Cover Brief tool stay in your browser. We don't receive them unless you choose "Send me my results."`}
          </p>
          <p>
            {`If you do, we receive the email address you enter, the brief shown on your screen, the page you sent it from with any tags in the link you followed (such as campaign tags), and whether you ticked the tips box. Netlify Forms (our web host's form storage) stores this along with your IP address and browser details, and checks it for spam using Akismet. Netlify also emails a copy to Quillbench, which sends your brief from sarah@brundigebusiness.com. We use your email only to send you your brief. We delete the entry, and our emails about it, 90 days after you send it. If you also tick "Also send me cover and launch tips," your email is added to our tips list as described under Emails you give us. To have it deleted sooner, email`}{" "}
            <a href="mailto:sarah@brundigebusiness.com">sarah@brundigebusiness.com</a>
            {" or use our "}
            <a href="/support/">Support</a>
            {" page."}
          </p>
        </section>
        <section className="legal-section">
          <p>
            <strong>Children.</strong> Quillbench is for adults 18 and over. If you're under 18,
            please don't send us your email, a brief or files. If you think a minor has sent us
            something, email sarah@brundigebusiness.com and we'll delete it.
          </p>
        </section>
        <section className="legal-section">
          <p>
            <strong>What we don't collect here.</strong> If you choose Start on this device and
            don't sign in, your manuscripts never leave this browser. Page photos for Scan are never
            uploaded, signed in or not. We don't sell your data or your writing.
          </p>
        </section>
        <section className="legal-section">
          <h2>Payments</h2>
          <p>
            Studio packages use Stripe Checkout. Stripe handles your card details; Quillbench never
            sees or stores your full card number. Stripe keeps the payment record and shows us your
            order details, such as your email, what you bought and the amount, so we can deliver
            your order and handle refunds. After a successful Cover Design or Studio Bundle
            checkout, your unlock is saved on this device.
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
