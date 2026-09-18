import { useEffect, useMemo, useState, type ReactNode } from "react";
import Nib from "./Nib";
import { signOut, listBooks } from "../lib/store";
import { cloudSaveStatusLine, isCloudSaveEnabled } from "../lib/cloudSaveFlag";
import { identitySignOut } from "../lib/identityGoTrue";
import { downloadWipBackup, pickAndRestoreWipBackup } from "../lib/wipBackup";
import { chapterNavTitle, parseManuscript } from "../lib/sampleManuscript";
import type { Book, Session } from "../lib/types";

export type BenchSection = "account" | "files" | "saved" | "settings";

type Props = {
  session: Session;
  children: ReactNode;
  onSignOut: () => void;
  onOpenBook: (bookId: string) => void;
  /** Return to Works in Progress shelf (Library). */
  onLibraryHome?: () => void;
  /** Open book id when in Workspace — drives Files truth. */
  activeBookId?: string | null;
  activeBookTitle?: string | null;
  /** Live manuscript text for chapter list (Workspace draft). */
  manuscriptText?: string;
  /** Refresh parent Library shelf after backup restore. */
  onLibraryChanged?: () => void;
  /** Preferred sidebar section when context changes. */
  defaultSection?: BenchSection;
};

const SECTIONS: { id: BenchSection; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "files", label: "Files" },
  { id: "saved", label: "Saved works" },
  { id: "settings", label: "Settings" },
];

function statusLabel(status: Book["status"]): string {
  if (status === "formatting") return "Formatting";
  if (status === "proof") return "Proof";
  return "Draft";
}

export default function BenchShell({
  session,
  children,
  onSignOut,
  onOpenBook,
  onLibraryHome,
  activeBookId = null,
  activeBookTitle = null,
  manuscriptText = "",
  onLibraryChanged,
  defaultSection,
}: Props) {
  const inferredDefault: BenchSection = defaultSection ?? (activeBookId ? "files" : "saved");
  const [section, setSection] = useState<BenchSection>(inferredDefault);
  const [note, setNote] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>(() => listBooks(session.userId));

  useEffect(() => {
    setSection(inferredDefault);
  }, [inferredDefault, activeBookId]);

  useEffect(() => {
    setBooks(listBooks(session.userId));
  }, [session.userId, activeBookId]);

  const chapters = useMemo(() => {
    const parsed = parseManuscript(manuscriptText ?? "");
    return parsed.chapters.filter(
      (ch) => ch.label || ch.title || ch.paragraphs.length > 0,
    );
  }, [manuscriptText]);

  const activeBook = useMemo(
    () => (activeBookId ? books.find((b) => b.id === activeBookId) : undefined),
    [books, activeBookId],
  );

  function refreshBooks() {
    setBooks(listBooks(session.userId));
    onLibraryChanged?.();
  }

  function handleSignOut() {
    if (isCloudSaveEnabled()) {
      void identitySignOut().finally(() => onSignOut());
    } else {
      signOut();
      onSignOut();
    }
  }

  function handleDownloadBackup() {
    try {
      const { bookCount } = downloadWipBackup(session);
      setNote(`Downloaded backup (${bookCount} book${bookCount === 1 ? "" : "s"}).`);
    } catch (e) {
      const why = e instanceof Error && e.message.trim() ? e.message : "storage or download blocked";
      setNote(`Could not download backup — ${why}.`);
    }
  }

  async function handleRestoreBackup() {
    const result = await pickAndRestoreWipBackup(session);
    setNote(result.message);
    if (result.ok) refreshBooks();
  }

  return (
    <div className="bench-shell">
      <aside className="bench-sidebar" aria-label="Bench">
        <div className="bench-sidebar-brand">
          <Nib className="nib" />
          <span className="wordmark">Quillbench</span>
        </div>

        <nav className="bench-sidebar-nav" aria-label="Bench sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={"bench-nav-item" + (section === s.id ? " active" : "")}
              aria-current={section === s.id ? "page" : undefined}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="bench-sidebar-panel" role="region" aria-label={SECTIONS.find((s) => s.id === section)?.label}>
          {section === "account" ? (
            <div className="bench-panel-account">
              <div className="bench-identity">
                <div className="bench-identity-name">{session.displayName}</div>
                {session.email ? (
                  <div className="bench-identity-email">{session.email}</div>
                ) : null}
                <div className="bench-save-hint">{cloudSaveStatusLine()}</div>
              </div>
              <button type="button" className="bench-panel-action" onClick={handleDownloadBackup}>
                Download Works in Progress backup
              </button>
              <button
                type="button"
                className="bench-panel-action"
                onClick={() => void handleRestoreBackup()}
              >
                Restore backup
              </button>
              {note ? (
                <div className="bench-panel-note" role="status">
                  {note}
                </div>
              ) : null}
              <button type="button" className="bench-panel-action bench-sign-out" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : null}

          {section === "files" ? (
            <div className="bench-panel-files">
              {activeBookId ? (
                <>
                  <p className="bench-panel-kicker">Open book</p>
                  <h2 className="bench-panel-title">{activeBookTitle || activeBook?.title || "Untitled"}</h2>
                  <p className="bench-panel-lede">Chapters in this manuscript — one book at a time.</p>
                  {chapters.length === 0 ? (
                    <p className="bench-panel-empty">
                      No chapters yet. Type, paste, or Scan pages in Write — the list updates here.
                    </p>
                  ) : (
                    <ol className="bench-file-list">
                      {chapters.map((ch, i) => (
                        <li key={`${i}-${chapterNavTitle(ch, `Chapter ${i + 1}`)}`}>
                          <span className="bench-file-index">{i + 1}</span>
                          <span className="bench-file-name">{chapterNavTitle(ch, `Chapter ${i + 1}`)}</span>
                          {ch.label && ch.title ? (
                            <span className="bench-file-meta">{ch.label}</span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              ) : (
                <>
                  <h2 className="bench-panel-title">Files</h2>
                  <p className="bench-panel-empty">
                    Open a book to see its chapter list. Quillbench works one book at a time.
                  </p>
                  {onLibraryHome ? (
                    <button type="button" className="bench-panel-action" onClick={onLibraryHome}>
                      Works in Progress
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {section === "saved" ? (
            <div className="bench-panel-saved">
              <h2 className="bench-panel-title">Works in Progress</h2>
              <p className="bench-panel-lede">Books on this bench — not a shared shelf.</p>
              {books.length === 0 ? (
                <p className="bench-panel-empty">No books in Works in Progress yet.</p>
              ) : (
                <ul className="bench-saved-list">
                  {books.map((book) => (
                    <li key={book.id}>
                      <button
                        type="button"
                        className={
                          "bench-saved-item" + (book.id === activeBookId ? " current" : "")
                        }
                        onClick={() => onOpenBook(book.id)}
                      >
                        <span className="bench-saved-title">{book.title}</span>
                        <span className={`pill ${book.status}`}>{statusLabel(book.status)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {onLibraryHome && activeBookId ? (
                <button type="button" className="bench-panel-action" onClick={onLibraryHome}>
                  ← Works in Progress
                </button>
              ) : null}
            </div>
          ) : null}

          {section === "settings" ? (
            <div className="bench-panel-settings">
              <h2 className="bench-panel-title">Settings</h2>
              <p className="bench-panel-lede">
                {isCloudSaveEnabled()
                  ? "Cloud Save flag on (local dig). Identity is not Live — drafts stay on this device until Soft-PASS."
                  : "Local on this device — cloud stays off for now."}
              </p>
              <dl className="bench-settings-list">
                <div>
                  <dt>Theme</dt>
                  <dd>Light paper on this device. Accent metal stays in the shell chrome.</dd>
                </div>
                <div>
                  <dt>Device save</dt>
                  <dd>Drafts and Works in Progress save in this browser. Use Account → backup to carry a file.</dd>
                </div>
                <div>
                  <dt>Cloud Save</dt>
                  <dd>
                    {isCloudSaveEnabled()
                      ? "Flag on (dev) · Email magic link is wired. Identity is not enabled Live — nothing syncs across devices yet."
                      : "Coming. Identity is not enabled — nothing syncs across devices yet."}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="bench-main">{children}</div>
    </div>
  );
}
