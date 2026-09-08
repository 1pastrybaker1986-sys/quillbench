import { FormEvent, useState } from "react";
import { createBook, listBooks, signOut } from "../lib/store";
import type { Book, Session } from "../lib/types";
import Nib from "../components/Nib";

type Props = {
  session: Session;
  onOpenBook: (bookId: string) => void;
  onSignOut: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
};

const statusLabel: Record<Book["status"], string> = {
  draft: "Draft",
  formatting: "Formatting",
  proof: "Proof",
};

function possessive(name: string) {
  return name.endsWith("s") ? `${name}’` : `${name}’s`;
}

export default function Library({ session, onOpenBook, onSignOut, onOpenPrivacy, onOpenTerms }: Props) {
  const [books, setBooks] = useState<Book[]>(() => listBooks(session.userId));
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    const book = createBook(session.userId, title);
    setBooks(listBooks(session.userId));
    setCreating(false);
    setTitle("");
    onOpenBook(book.id);
  }

  return (
    <div>
      <header className="topbar">
        <div className="topbar-left">
          <Nib className="nib" />
          <span className="wordmark">Quillbench</span>
        </div>
        <div className="topbar-right">
          <span>{session.displayName}</span>
          <button
            className="linkish"
            type="button"
            onClick={() => {
              signOut();
              onSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="library">
        <div className="library-orbs" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
        </div>
        <div className="library-head">
          <div>
            <h1>{possessive(session.displayName)} library</h1>
            <p>Books on this bench — not a shared shelf.</p>
            <div className="library-tip">
              <span className="library-tip-motif" aria-hidden="true">
                <img src="/art/open-book-motif.svg" alt="" width={80} height={64} />
              </span>
              <p className="library-tip-text">
                Tip: open a book → Scan pages in Formatting, then Grammar → Editing → Publishing
                packages.
              </p>
            </div>
          </div>
          <button className="btn-new" type="button" onClick={() => setCreating(true)}>
            New book
          </button>
        </div>

        <div className="library-ornament" aria-hidden="true">
          <img src="/art/quill-flourish.svg" alt="" width={640} height={48} />
        </div>

        <div className="book-grid">
          {books.map((book) => (
            <button
              key={book.id}
              className="book-card"
              type="button"
              onClick={() => onOpenBook(book.id)}
            >
              <div className="cover">
                {book.coverSrc ? (
                  <img src={book.coverSrc} alt="" />
                ) : (
                  <span className="cover-title">{book.title}</span>
                )}
              </div>
              <div className="book-meta">
                <h2>{book.title}</h2>
                <span className={`pill ${book.status}`}>{statusLabel[book.status]}</span>
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="library-foot">
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

      {creating && (
        <div className="dialog-backdrop" onClick={() => setCreating(false)}>
          <form
            className="dialog"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
          >
            <h2>New book</h2>
            <label className="field" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              type="text"
              autoFocus
              placeholder="Untitled manuscript"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="dialog-actions">
              <button className="btn-quiet" type="button" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button className="btn-solid" type="submit">
                Create draft
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
