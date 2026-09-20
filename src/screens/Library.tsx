import { FormEvent, useState } from "react";
import { createBook, listBooks } from "../lib/store";
import type { Book, Session } from "../lib/types";
import BenchShell from "../components/BenchShell";

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
    <BenchShell
      session={session}
      onSignOut={onSignOut}
      onOpenBook={onOpenBook}
      onLibraryChanged={() => setBooks(listBooks(session.userId))}
      defaultSection="saved"
      onNewBook={() => setCreating(true)}
    >
      <div>
        <main className="library library-spacious">
          <div className="library-head library-head-quiet">
            {books.length > 0 ? (
              <>
                <p className="library-shelf-line">Books on this bench.</p>
                <button className="btn-new" type="button" onClick={() => setCreating(true)}>
                  New book
                </button>
              </>
            ) : (
              <p className="library-shelf-line sr-only">Works in Progress</p>
            )}
          </div>

          {books.length === 0 ? (
            <div className="library-empty library-empty-nested">
              <p>No books yet.</p>
              <button className="btn-solid" type="button" onClick={() => setCreating(true)}>
                Start a draft
              </button>
            </div>
          ) : (
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
          )}
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
    </BenchShell>
  );
}
