import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Nib from "./Nib";
import { signOut, listBooks } from "../lib/store";
import { cloudSaveStatusLine, isCloudSaveEnabled } from "../lib/cloudSaveFlag";
import { identitySignOut } from "../lib/identityGoTrue";
import { downloadWipBackup, pickAndRestoreWipBackup } from "../lib/wipBackup";
import { chapterNavTitle, parseManuscript } from "../lib/sampleManuscript";
import type { Book, ModuleId, Session } from "../lib/types";

export type BenchSection = "account" | "files" | "saved" | "settings";

const MODULE_STEPS: { id: ModuleId; label: string }[] = [
  { id: "write", label: "Write" },
  { id: "grammar", label: "Grammar" },
  { id: "editing", label: "Editing" },
  { id: "formatting", label: "Formatting" },
  { id: "publishing", label: "Publishing" },
];

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
  /** Active workspace module — journey lives in Files, not the main strip. */
  activeModule?: ModuleId | null;
  onModuleChange?: (id: ModuleId) => void;
  /** Settings help only: practice text (kept off Files primary + Write/Scan). */
  onUseSample?: () => void;
  /** Secondary: start a new book from Saved pane. */
  onNewBook?: () => void;
  /** Secondary: Scan a page from empty Works in Progress. */
  onScanStart?: () => void;
  /** Cover / export summary for Files (Formatting owns the tools). */
  hasCover?: boolean;
  exportCount?: number;
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
  activeModule = null,
  onModuleChange,
  onUseSample,
  onNewBook,
  onScanStart,
  hasCover = false,
  exportCount = 0,
}: Props) {
  const inferredDefault: BenchSection = defaultSection ?? (activeBookId ? "files" : "saved");
  const [section, setSection] = useState<BenchSection>(inferredDefault);
  /** Drawer starts closed so Write / Scan / editor keep the full writing area. */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>(() => listBooks(session.userId));
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sidebarId = useId();

  useEffect(() => {
    setSection(inferredDefault);
  }, [inferredDefault, activeBookId]);

  useEffect(() => {
    setBooks(listBooks(session.userId));
  }, [session.userId, activeBookId]);

  /** Close when book context changes (entering Write / Scan / editor). */
  useEffect(() => {
    setDrawerOpen(false);
  }, [activeBookId]);

  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }

    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (sidebarRef.current?.contains(t)) return;
      if (toggleRef.current?.contains(t)) return;
      setDrawerOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [drawerOpen]);

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

  function openBookAndClose(bookId: string) {
    setDrawerOpen(false);
    onOpenBook(bookId);
  }

  function libraryHomeAndClose() {
    setDrawerOpen(false);
    onLibraryHome?.();
  }

  return (
    <div className={"bench-shell" + (drawerOpen ? " drawer-open" : "")}>
      <button
        ref={toggleRef}
        type="button"
        className="bench-drawer-toggle"
        aria-expanded={drawerOpen}
        aria-controls={sidebarId}
        aria-label={drawerOpen ? "Close menu" : "Open menu"}
        title={drawerOpen ? "Close menu" : "Open menu"}
        onClick={() => setDrawerOpen((v) => !v)}
      >
        <span className="bench-drawer-hamburger" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="bench-drawer-label">Menu</span>
      </button>

      {drawerOpen ? (
        <div
          className="bench-drawer-backdrop"
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside
        ref={sidebarRef}
        id={sidebarId}
        className={"bench-sidebar" + (drawerOpen ? " open" : "")}
        aria-label="Bench"
        aria-hidden={!drawerOpen}
        inert={!drawerOpen ? true : undefined}
      >
        <div className="bench-sidebar-brand">
          <Nib className="nib" />
          <span className="wordmark">Quillbench</span>
          <button
            type="button"
            className="bench-drawer-close"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="bench-sidebar-nav" aria-label="Bench sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={"bench-nav-item" + (section === s.id ? " active" : "")}
              aria-current={section === s.id ? "page" : undefined}
              tabIndex={drawerOpen ? undefined : -1}
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

                  {onModuleChange ? (
                    <div className="bench-journey" aria-label="Book journey">
                      <p className="bench-panel-kicker">Journey</p>
                      <ol className="bench-journey-list">
                        {MODULE_STEPS.map((step, i) => (
                          <li key={step.id}>
                            <button
                              type="button"
                              className={
                                "bench-journey-step" +
                                (activeModule === step.id ? " current" : "")
                              }
                              tabIndex={drawerOpen ? undefined : -1}
                              onClick={() => {
                                onModuleChange(step.id);
                                setDrawerOpen(false);
                              }}
                            >
                              <span className="bench-journey-num" aria-hidden="true">
                                {i + 1}
                              </span>
                              <span>{step.label}</span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  <div className="bench-files-meta">
                    <p className="bench-panel-kicker">Cover &amp; exports</p>
                    <p className="bench-panel-empty">
                      Cover: {hasCover ? "attached" : "none yet"}. Exports: {exportCount}.
                      Open Formatting for cover and file downloads.
                    </p>
                    {onModuleChange ? (
                      <button
                        type="button"
                        className="bench-panel-action"
                        tabIndex={drawerOpen ? undefined : -1}
                        onClick={() => {
                          onModuleChange("formatting");
                          setDrawerOpen(false);
                        }}
                      >
                        Open Formatting
                      </button>
                    ) : null}
                  </div>

                </>
              ) : (
                <>
                  <h2 className="bench-panel-title">Files</h2>
                  <p className="bench-panel-empty">
                    Open a book to see its chapter list. Quillbench works one book at a time.
                  </p>
                  {onLibraryHome ? (
                    <button type="button" className="bench-panel-action" onClick={libraryHomeAndClose}>
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
                <div className="bench-saved-empty">
                  <p className="bench-panel-empty">No books yet.</p>
                  <div className="bench-saved-empty-actions">
                    {onNewBook ? (
                      <button
                        type="button"
                        className="bench-panel-primary"
                        tabIndex={drawerOpen ? undefined : -1}
                        onClick={() => {
                          onNewBook();
                          setDrawerOpen(false);
                        }}
                      >
                        Start a draft
                      </button>
                    ) : null}
                    {onScanStart ? (
                      <button
                        type="button"
                        className="bench-panel-action"
                        tabIndex={drawerOpen ? undefined : -1}
                        onClick={() => {
                          onScanStart();
                          setDrawerOpen(false);
                        }}
                      >
                        Scan a page
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <ul className="bench-saved-list">
                  {books.map((book) => (
                    <li key={book.id}>
                      <button
                        type="button"
                        className={
                          "bench-saved-item" + (book.id === activeBookId ? " current" : "")
                        }
                        onClick={() => openBookAndClose(book.id)}
                      >
                        <span className="bench-saved-title">{book.title}</span>
                        <span className={`pill ${book.status}`}>{statusLabel(book.status)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {onNewBook && books.length > 0 ? (
                <button
                  type="button"
                  className="bench-panel-action"
                  tabIndex={drawerOpen ? undefined : -1}
                  onClick={() => {
                    onNewBook();
                    setDrawerOpen(false);
                  }}
                >
                  New book
                </button>
              ) : null}
              {onLibraryHome && activeBookId ? (
                <button type="button" className="bench-panel-action" onClick={libraryHomeAndClose}>
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
                  ? "Cloud Save is on for this build. Signed-in works sync across devices."
                  : "Local on this device — cloud stays off for now."}
              </p>
              <dl className="bench-settings-list">
                <div>
                  <dt>Theme</dt>
                  <dd>Light paper on this device. Accent metal stays in the shell chrome.</dd>
                </div>
                <div>
                  <dt>Device save</dt>
                  <dd>
                    {isCloudSaveEnabled()
                      ? "Local cache on this browser. Signed-in library also syncs to your Quillbench account."
                      : "Drafts and Works in Progress save in this browser. Use Account → backup to carry a file."}
                  </dd>
                </div>
                <div>
                  <dt>Cloud Save</dt>
                  <dd>
                    {isCloudSaveEnabled()
                      ? "On · Email magic link. Works in Progress sync via your account (Identity + Blobs)."
                      : "Coming. Nothing syncs across devices yet."}
                  </dd>
                </div>
              </dl>
              {onUseSample && activeBookId ? (
                <div className="bench-settings-help">
                  <p className="bench-panel-kicker">Help</p>
                  <p className="bench-panel-empty">
                    Need a short chapter to try Formatting? Load practice text into the open book.
                  </p>
                  <button
                    type="button"
                    className="bench-panel-action"
                    tabIndex={drawerOpen ? undefined : -1}
                    onClick={() => {
                      onUseSample();
                      setNote("Practice text loaded into the manuscript.");
                      setDrawerOpen(false);
                    }}
                  >
                    Load practice text
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>

      <div className="bench-main">{children}</div>
    </div>
  );
}
