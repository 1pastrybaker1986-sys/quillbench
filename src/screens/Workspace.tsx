import { useEffect, useMemo, useRef, useState } from "react";
import { getBook, recordExport, updateBook } from "../lib/store";
import type { Book, BookExportKind, ModuleId, Session, TrimSize } from "../lib/types";
import { SAMPLE_CHAPTER } from "../lib/sampleManuscript";
import { downloadInteriorPdf } from "../lib/printPdf";
import { downloadEbookEpub } from "../lib/exportEpub";
import { isScanImage, joinManuscript, ocrImageFiles, SCAN_ACCEPT } from "../lib/ocrScan";
import {
  checkManuscript,
  dismissIssue,
  loadDismissedKeys,
  type GrammarIssue,
} from "../lib/grammarCheck";
import SpreadPreview from "../components/SpreadPreview";
import Toast from "../components/Toast";
import EditingPanel from "../components/EditingPanel";
import PublishingPanel from "../components/PublishingPanel";

type Props = {
  session: Session;
  bookId: string;
  onBack: () => void;
};

type MatterDraft = {
  authorName: string;
  subtitle: string;
  dedication: string;
  copyrightYear: string;
  publisherLine: string;
};

const MODULES: { id: ModuleId; label: string }[] = [
  { id: "grammar", label: "Grammar" },
  { id: "editing", label: "Editing" },
  { id: "formatting", label: "Formatting" },
  { id: "publishing", label: "Publishing" },
];

function matterFrom(book: Book | undefined): MatterDraft {
  return {
    authorName: book?.authorName ?? "",
    subtitle: book?.subtitle ?? "",
    dedication: book?.dedication ?? "",
    copyrightYear: book?.copyrightYear ?? "",
    publisherLine: book?.publisherLine ?? "",
  };
}


function GrammarPanel({
  bookId,
  text,
  onRescan,
}: {
  bookId: string;
  text: string;
  onRescan: () => void;
}) {
  const [dismissed, setDismissed] = useState(() => loadDismissedKeys(bookId));
  const [scanTick, setScanTick] = useState(0);

  useEffect(() => {
    setDismissed(loadDismissedKeys(bookId));
  }, [bookId]);

  const issues = useMemo(() => {
    void scanTick;
    return checkManuscript(text).filter((issue) => !dismissed.has(issue.key));
  }, [text, dismissed, scanTick]);

  const emptyManuscript = text.trim().length === 0;

  function onDismiss(key: string) {
    setDismissed(dismissIssue(bookId, key));
  }

  function rescan() {
    onRescan();
    setDismissed(loadDismissedKeys(bookId));
    setScanTick((n) => n + 1);
  }

  return (
    <div className="grammar">
      <header className="grammar-head">
        <h2>Grammar</h2>
        <p className="grammar-lede">
          Fiction-aware review of the current manuscript. Notes to glance at — not a rewrite.
        </p>
        <p className="grammar-voice">
          Dialect, fragments, and character speech are allowed. Scan pages text from Formatting
          feeds this view.
        </p>
        <div className="grammar-toolbar">
          <button
            className="btn-solid"
            type="button"
            onClick={rescan}
            disabled={emptyManuscript}
          >
            Re-scan manuscript
          </button>
          {!emptyManuscript && issues.length > 0 ? (
            <span className="grammar-count">
              {issues.length} note{issues.length === 1 ? "" : "s"} to review
            </span>
          ) : null}
        </div>
      </header>

      {emptyManuscript ? (
        <div className="grammar-empty">
          <p>No manuscript on this book yet.</p>
          <p>
            Paste, drop, or Scan pages in Formatting — that text feeds this view.
          </p>
        </div>
      ) : issues.length === 0 ? (
        <div className="grammar-empty">
          <p>Nothing stood out in this pass.</p>
          <p>Dialect, fragments, and voice are left alone. Re-scan after you change the manuscript.</p>
        </div>
      ) : (
        <ul className="grammar-list">
          {issues.map((issue) => (
            <GrammarIssueRow key={issue.key} issue={issue} onDismiss={onDismiss} />
          ))}
        </ul>
      )}
    </div>
  );
}

function GrammarIssueRow({
  issue,
  onDismiss,
}: {
  issue: GrammarIssue;
  onDismiss: (key: string) => void;
}) {
  return (
    <li className={`grammar-issue sev-${issue.severity}`}>
      <div className="grammar-issue-top">
        <span className={`grammar-sev ${issue.severity}`}>
          {issue.severity === "warn" ? "Warn" : "Info"}
        </span>
        <h3>{issue.title}</h3>
      </div>
      <p className="grammar-note">{issue.note}</p>
      {issue.snippet ? <blockquote className="grammar-snippet">{issue.snippet}</blockquote> : null}
      <div className="grammar-actions">
        <button className="btn-solid" type="button" onClick={() => onDismiss(issue.key)}>
          Accept
        </button>
        <button className="linkish" type="button" onClick={() => onDismiss(issue.key)}>
          Keep as-is
        </button>
      </div>
    </li>
  );
}

export default function Workspace({ bookId, onBack }: Props) {
  const initial = useMemo(() => getBook(bookId), [bookId]);
  const [book, setBook] = useState<Book | undefined>(initial);
  const [module, setModule] = useState<ModuleId>("formatting");
  const [toast, setToast] = useState<string | null>(null);
  const [exportTip, setExportTip] = useState(false);
  const [draftText, setDraftText] = useState(initial?.manuscriptText ?? "");
  const [draftMatter, setDraftMatter] = useState<MatterDraft>(() => matterFrom(initial));
  const [dragging, setDragging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [detectPage, setDetectPage] = useState(() => {
    try {
      return localStorage.getItem("quillbench.scanDetectPage.v1") === "1";
    } catch {
      return false;
    }
  });
  const msTimer = useRef<number | null>(null);
  const matterTimer = useRef<number | null>(null);
  const draftTextRef = useRef(draftText);
  const draftMatterRef = useRef(draftMatter);
  draftTextRef.current = draftText;
  draftMatterRef.current = draftMatter;

  function persistDrafts() {
    updateBook(bookId, {
      manuscriptText: draftTextRef.current,
      ...draftMatterRef.current,
    });
  }

  function flushPending() {
    if (msTimer.current) {
      window.clearTimeout(msTimer.current);
      msTimer.current = null;
    }
    if (matterTimer.current) {
      window.clearTimeout(matterTimer.current);
      matterTimer.current = null;
    }
    persistDrafts();
  }

  useEffect(() => {
    return () => {
      flushPending();
    };
    // Persist whatever is in the refs on unmount; bookId is stable for this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  useEffect(() => {
    try {
      localStorage.setItem("quillbench.scanDetectPage.v1", detectPage ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [detectPage]);

  function persistManuscript(text: string) {
    // Preview reads draftText; skip setBook while typing to avoid caret glitches.
    updateBook(bookId, { manuscriptText: text });
  }

  function applyManuscript(text: string) {
    if (msTimer.current) window.clearTimeout(msTimer.current);
    draftTextRef.current = text;
    setDraftText(text);
    persistManuscript(text);
  }

  function onTextChange(text: string) {
    draftTextRef.current = text;
    setDraftText(text);
    if (msTimer.current) window.clearTimeout(msTimer.current);
    msTimer.current = window.setTimeout(() => persistManuscript(text), 400);
  }

  function onMatterChange(key: keyof MatterDraft, value: string) {
    const next = { ...draftMatter, [key]: value };
    draftMatterRef.current = next;
    setDraftMatter(next);
    if (matterTimer.current) window.clearTimeout(matterTimer.current);
    matterTimer.current = window.setTimeout(() => {
      updateBook(bookId, next);
    }, 400);
  }


  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const scanModeRef = useRef<"append" | "replace">("append");

  function isCoverImage(file: File): boolean {
    if (["image/png", "image/jpeg", "image/webp"].includes(file.type)) return true;
    return /\.(png|jpe?g|webp)$/i.test(file.name);
  }

  function onCoverFile(file: File) {
    if (!isCoverImage(file)) {
      setToast("Use a PNG, JPEG, or WebP cover");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setToast("Cover must be under 8 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      if (!dataUrl.startsWith("data:")) {
        setToast("Could not read cover");
        return;
      }
      try {
        const next = updateBook(bookId, {
          coverSrc: dataUrl,
          coverPackNote: "Attached cover — your file.",
        });
        if (next) setBook(next);
        setToast("Cover attached");
      } catch {
        setToast("Could not save cover — file may be too large");
      }
    };
    reader.readAsDataURL(file);
  }

  function removeCover() {
    const next = updateBook(bookId, {
      coverSrc: "",
      coverPackNote: "",
    });
    if (next) setBook(next);
    setToast("Cover removed");
  }

  function formatExportWhen(iso: string): string {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "";
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 48) return `${hrs}h ago`;
    return new Date(t).toLocaleDateString();
  }


  function useSampleChapter() {
    applyManuscript(SAMPLE_CHAPTER);
  }

  function onFile(file: File) {
    if (isScanImage(file)) {
      void scanPages([file], "append");
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".md")) {
      setToast("Drop a .txt, .md, or page photo");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      applyManuscript(String(reader.result ?? ""));
    };
    reader.readAsText(file);
  }

  function openScan(mode: "append" | "replace") {
    if (scanning) return;
    scanModeRef.current = mode;
    scanInputRef.current?.click();
  }

  async function scanPages(files: File[], mode: "append" | "replace") {
    if (files.length === 0 || scanning) return;
    const images = files.filter(isScanImage);
    if (images.length === 0) {
      setToast("Use PNG, JPEG, or WebP photos of pages");
      return;
    }
    scanModeRef.current = mode;
    setScanning(true);
    setScanStatus("Preparing reader…");
    try {
      const result = await ocrImageFiles(images, (p) => setScanStatus(p.status), {
        detectPage,
      });
      if (!result.text) {
        setToast("No text found — try a clearer photo");
        return;
      }
      const next =
        mode === "replace"
          ? result.text
          : joinManuscript(draftTextRef.current, result.text);
      applyManuscript(next);
      const n = result.pagesWithText;
      const verb = mode === "replace" ? "Replaced with" : "Added";
      setToast(`${verb} ${n} page${n === 1 ? "" : "s"}`);
    } catch {
      setToast("Could not read those pages — try again");
    } finally {
      setScanning(false);
      setScanStatus(null);
      if (scanInputRef.current) scanInputRef.current.value = "";
    }
  }

  function onScanFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    void scanPages(Array.from(list), scanModeRef.current);
  }

  if (!book) {
    return (
      <div className="coming">
        <p>That book isn’t on this bench.</p>
        <button className="linkish" type="button" onClick={onBack}>
          Back to library
        </button>
      </div>
    );
  }

  function pickTrim(trim: TrimSize) {
    flushPending();
    const next = updateBook(bookId, {
      trim,
      manuscriptText: draftTextRef.current,
      ...draftMatterRef.current,
    });
    if (next) setBook(next);
  }

  async function exportPrintPdf() {
    if (exporting || !book) return;
    setExporting(true);
    try {
      flushPending();
      const snapshot: Book = {
        ...book,
        manuscriptText: draftTextRef.current,
        ...draftMatterRef.current,
      };
      const { filename, sizeBytes } = await downloadInteriorPdf(snapshot);
      const logged = recordExport(bookId, { kind: "pdf", filename, sizeBytes });
      if (logged) setBook(logged);
      setToast(`Downloaded ${filename}`);
      setExportTip(true);
    } catch {
      setToast("Print PDF failed — try again");
    } finally {
      setExporting(false);
    }
  }

  async function exportEpub() {
    if (exporting || !book) return;
    setExporting(true);
    try {
      flushPending();
      const snapshot: Book = {
        ...book,
        manuscriptText: draftTextRef.current,
        ...draftMatterRef.current,
      };
      const { filename, sizeBytes } = await downloadEbookEpub(snapshot);
      const logged = recordExport(bookId, { kind: "epub", filename, sizeBytes });
      if (logged) setBook(logged);
      setToast(`Downloaded ${filename}`);
      setExportTip(true);
    } catch {
      setToast("EPUB failed — try again");
    } finally {
      setExporting(false);
    }
  }

  async function exportAgain(kind: BookExportKind) {
    if (kind === "pdf") await exportPrintPdf();
    else await exportEpub();
  }

  return (
    <div className="workspace">
      <header className="work-head">
        <button className="back" type="button" onClick={onBack}>
          ← Library
        </button>
        <div className="work-title-row">
          <h1>{book.title}</h1>
          <span className={`pill ${book.status}`}>
            {book.status === "draft"
              ? "Draft"
              : book.status === "formatting"
                ? "Formatting"
                : "Proof"}
          </span>
        </div>
        <nav className="modules" aria-label="Modules">
          {MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mod${module === m.id ? " active" : ""}`}
              onClick={() => {
                flushPending();
                setModule(m.id);
              }}
            >
              <span className={`mod-icon mod-icon-${m.id}`} aria-hidden="true" />
              {m.label}
            </button>
          ))}
        </nav>
        <nav className="journey" aria-label="Book journey">
          {MODULES.map((m, i) => (
            <span key={m.id} className="journey-step-wrap">
              {i > 0 ? <span className="journey-arrow" aria-hidden="true">›</span> : null}
              <button
                type="button"
                className={`journey-step${module === m.id ? " current" : ""}`}
                onClick={() => {
                  flushPending();
                  setModule(m.id);
                }}
              >
                <span className="journey-num" aria-hidden="true">{i + 1}</span>
                {m.label}
              </button>
            </span>
          ))}
        </nav>
        <img
          className="work-flourish"
          src="/art/quill-flourish.svg"
          alt=""
          width={640}
          height={48}
          aria-hidden="true"
        />
      </header>

      {module === "grammar" ? (
        <GrammarPanel bookId={book.id} text={draftText} onRescan={flushPending} />
      ) : module === "editing" ? (
        <EditingPanel
          bookId={book.id}
          onSeePackages={() => setModule("publishing")}
          onToast={setToast}
        />
      ) : module === "publishing" ? (
        <PublishingPanel
          bookId={book.id}
          bookSignals={{
            manuscriptText: draftText,
            authorName: draftMatter.authorName,
            copyrightYear: draftMatter.copyrightYear,
            coverSrc: book.coverSrc,
            exportsCount: (book.exports ?? []).length,
          }}
          onToast={setToast}
        />
      ) : (
        <div className="bench">
          <aside className="rail">
            <div className="rail-block">
              <h3>Manuscript</h3>
              <div
                className={`drop-slot${dragging ? " over" : ""}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => {
                  if (e.currentTarget === e.target) setDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const files = Array.from(e.dataTransfer.files ?? []);
                  if (!files.length) return;
                  const images = files.filter(isScanImage);
                  if (images.length) {
                    void scanPages(images, "append");
                    return;
                  }
                  onFile(files[0]);
                }}
              >
                <textarea
                  className="ms-input"
                  value={draftText}
                  onChange={(e) => onTextChange(e.target.value)}
                  onBlur={() => {
                    if (msTimer.current) window.clearTimeout(msTimer.current);
                    persistManuscript(draftText);
                  }}
                  placeholder="Paste a chapter, drop a .txt / .md, or scan pages below."
                  spellCheck={false}
                  disabled={scanning}
                />
                <div className="ms-actions">
                  <button className="linkish" type="button" onClick={useSampleChapter}>
                    Use sample chapter
                  </button>
                  <span className="ms-hint">.txt or .md</span>
                </div>
              </div>
              <div className="scan-block">
                <input
                  ref={scanInputRef}
                  type="file"
                  accept={SCAN_ACCEPT}
                  multiple
                  aria-label="Scan pages"
                  hidden
                  onChange={(e) => {
                    void onScanFiles(e.target.files);
                  }}
                />
                <p className="scan-help">
                  Best for typewritten or printed pages. Photos in good light work. Handwriting is
                  hit-or-miss.
                </p>
                <p className="scan-formats">
                  PNG, JPEG, or WebP — as many pages as you want. PDF isn’t in this version;
                  photograph or export pages as images.
                </p>
                <label className="scan-option">
                  <input
                    type="checkbox"
                    checked={detectPage}
                    disabled={scanning}
                    onChange={(e) => setDetectPage(e.target.checked)}
                  />
                  <span>Detect page edges (crop hands &amp; background)</span>
                </label>
                <div className="scan-actions">
                  <button
                    className="btn-export primary"
                    type="button"
                    disabled={scanning}
                    onClick={() => openScan("append")}
                  >
                    {scanning ? scanStatus || "Reading…" : "Scan pages"}
                  </button>
                  <button
                    className="linkish scan-replace"
                    type="button"
                    disabled={scanning}
                    onClick={() => openScan("replace")}
                  >
                    Replace manuscript with scan
                  </button>
                </div>
                {scanStatus ? (
                  <p className="scan-status" role="status" aria-live="polite">
                    {scanStatus}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rail-block">
              <h3>Matter</h3>
              <div className="matter-fields">
                <label className="matter-label">
                  Author
                  <input
                    className="rail-input"
                    type="text"
                    value={draftMatter.authorName}
                    onChange={(e) => onMatterChange("authorName", e.target.value)}
                    onBlur={flushPending}
                    placeholder="Author name"
                    autoComplete="name"
                  />
                </label>
                <label className="matter-label">
                  Subtitle
                  <input
                    className="rail-input"
                    type="text"
                    value={draftMatter.subtitle}
                    onChange={(e) => onMatterChange("subtitle", e.target.value)}
                    onBlur={flushPending}
                    placeholder="Optional"
                  />
                </label>
                <label className="matter-label">
                  Dedication
                  <textarea
                    className="rail-area"
                    value={draftMatter.dedication}
                    onChange={(e) => onMatterChange("dedication", e.target.value)}
                    onBlur={flushPending}
                    placeholder="Optional"
                    spellCheck={false}
                  />
                </label>
                <label className="matter-label">
                  Copyright year
                  <input
                    className="rail-input"
                    type="text"
                    inputMode="numeric"
                    value={draftMatter.copyrightYear}
                    onChange={(e) => onMatterChange("copyrightYear", e.target.value)}
                    onBlur={flushPending}
                    placeholder="2026"
                  />
                </label>
                <label className="matter-label">
                  Publisher line
                  <input
                    className="rail-input"
                    type="text"
                    value={draftMatter.publisherLine}
                    onChange={(e) => onMatterChange("publisherLine", e.target.value)}
                    onBlur={flushPending}
                    placeholder="Optional"
                  />
                </label>
              </div>
            </div>

            <div className="rail-block">
              <h3>Trim size</h3>
              <div className="trim-options">
                <button
                  type="button"
                  className={`trim${book.trim === "5.5x8.5" ? " selected" : ""}`}
                  onClick={() => pickTrim("5.5x8.5")}
                >
                  <span className="trim-shape t55" />
                  <span>
                    <b>5.5 × 8.5</b>
                    <span>KDP trade</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`trim${book.trim === "6x9" ? " selected" : ""}`}
                  onClick={() => pickTrim("6x9")}
                >
                  <span className="trim-shape t69" />
                  <span>
                    <b>6 × 9</b>
                    <span>KDP trade</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="rail-block">
              <h3>Theme</h3>
              <div className="theme-card theme-static" aria-current="true">
                <strong>Selected · Trade paperback</strong>
                <span>Default interior · more themes later</span>
              </div>
            </div>

            <div className="rail-block">
              <h3>Cover</h3>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Attach cover"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onCoverFile(file);
                  e.target.value = "";
                }}
              />
              {book.coverSrc ? (
                <div className="cover-slot has-cover">
                  <img src={book.coverSrc} alt="" />
                  <div>
                    <p>{book.coverPackNote || "Attached cover — your file."}</p>
                    <div className="cover-actions">
                      <button
                        className="linkish"
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                      >
                        Replace
                      </button>
                      <button className="linkish" type="button" onClick={removeCover}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cover-slot">
                  <p className="empty">Attach your own cover image (PNG, JPEG, or WebP).</p>
                  <button
                    className="btn-export"
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    Attach cover
                  </button>
                </div>
              )}
            </div>

            <div className="rail-block">
              <h3>Export</h3>
              <div className="exports">
                <button
                  className="btn-export primary"
                  type="button"
                  disabled={exporting}
                  onClick={() => void exportPrintPdf()}
                >
                  {exporting ? "Building PDF…" : "Print PDF"}
                </button>
                <button
                  className="btn-export primary"
                  type="button"
                  disabled={exporting}
                  onClick={() => void exportEpub()}
                >
                  {exporting ? "Building…" : "EPUB"}
                </button>
              </div>
              {exportTip ? (
                <button
                  className="linkish export-gate-tip"
                  type="button"
                  onClick={() => setModule("publishing")}
                >
                  Publishing checklist →
                </button>
              ) : null}
              <div className="export-locker">
                <h4>Export locker</h4>
                {(book.exports ?? []).length === 0 ? (
                  <p className="locker-empty">No exports yet — download a PDF or EPUB to log it here.</p>
                ) : (
                  <ul className="locker-list">
                    {(book.exports ?? []).map((ex) => (
                      <li key={ex.id}>
                        <div className="locker-meta">
                          <span className="locker-kind">{ex.kind.toUpperCase()}</span>
                          <span className="locker-name">{ex.filename}</span>
                          <span className="locker-when">{formatExportWhen(ex.createdAt)}</span>
                        </div>
                        <button
                          className="linkish"
                          type="button"
                          disabled={exporting}
                          onClick={() => void exportAgain(ex.kind)}
                        >
                          Export again
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>

          <section className="preview-wrap">
            <div className="preview-caption">Print spread preview · placeholder</div>
            <SpreadPreview book={{ ...book, manuscriptText: draftText }} />
          </section>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
