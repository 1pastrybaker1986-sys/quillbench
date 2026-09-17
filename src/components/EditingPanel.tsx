import { useEffect, useRef, useState } from "react";
import {
  getBoard,
  listPasses,
  savePass,
  STATUS_LABELS,
  STATUS_OPTIONS,
  type BookPassMap,
  type PassId,
  type PassStatus,
} from "../lib/editingBoard";
import { ownsFullEdit, type PackageId } from "../lib/packages";
import { startCheckout } from "../lib/billing";
import {
  getPriorityReview,
  setPriorityReview,
  type PriorityReview,
} from "../lib/priorityReview";

type Props = {
  bookId: string;
  onSeePackages: () => void;
  onToast?: (msg: string) => void;
};

const DEBOUNCE_MS = 400;

const PASS_IDS: PassId[] = ["developmental", "line", "copy", "proof"];

function notesFromBoard(b: BookPassMap): Record<PassId, string> {
  return {
    developmental: b.developmental.note,
    line: b.line.note,
    copy: b.copy.note,
    proof: b.proof.note,
  };
}

export default function EditingPanel({ bookId, onSeePackages, onToast }: Props) {
  const [board, setBoard] = useState<BookPassMap>(() => getBoard(bookId));
  const [draftNotes, setDraftNotes] = useState<Record<PassId, string>>(() =>
    notesFromBoard(getBoard(bookId)),
  );
  const [hasFullEdit, setHasFullEdit] = useState(() => ownsFullEdit());
  const [savedFlash, setSavedFlash] = useState<PassId | null>(null);
  const [priorityNotes, setPriorityNotes] = useState<PriorityReview>(() =>
    getPriorityReview(bookId),
  );
  const [prioritySaved, setPrioritySaved] = useState(false);

  const draftNotesRef = useRef(draftNotes);
  const boardRef = useRef(board);
  const priorityNotesRef = useRef(priorityNotes);
  const noteTimers = useRef<Partial<Record<PassId, number>>>({});
  const priorityTimer = useRef<number | null>(null);
  const bookIdRef = useRef(bookId);

  draftNotesRef.current = draftNotes;
  boardRef.current = board;
  priorityNotesRef.current = priorityNotes;
  bookIdRef.current = bookId;

  function clearNoteTimer(passId: PassId) {
    const t = noteTimers.current[passId];
    if (t != null) {
      window.clearTimeout(t);
      delete noteTimers.current[passId];
    }
  }

  function clearPriorityTimer() {
    if (priorityTimer.current != null) {
      window.clearTimeout(priorityTimer.current);
      priorityTimer.current = null;
    }
  }

  function persistNote(id: string, passId: PassId, note: string, opts?: { quiet?: boolean }) {
    const next = savePass(id, passId, { note });
    setBoard(next);
    boardRef.current = next;
    setSavedFlash(passId);
    window.setTimeout(() => setSavedFlash((cur) => (cur === passId ? null : cur)), 1200);
    if (!opts?.quiet) onToast?.("Pass saved");
  }

  function persistPriority(id: string, notes: PriorityReview, opts?: { quiet?: boolean }) {
    setPriorityReview(id, notes);
    setPrioritySaved(true);
    window.setTimeout(() => setPrioritySaved(false), 1200);
    if (!opts?.quiet) onToast?.("Priority review notes saved");
  }

  function flushNote(passId: PassId, opts?: { quiet?: boolean }) {
    clearNoteTimer(passId);
    const id = bookIdRef.current;
    const draft = draftNotesRef.current[passId] ?? "";
    const current = boardRef.current[passId]?.note ?? "";
    if (draft === current) return;
    persistNote(id, passId, draft, opts ?? { quiet: true });
  }

  function flushPriority(opts?: { quiet?: boolean }) {
    clearPriorityTimer();
    const id = bookIdRef.current;
    const notes = priorityNotesRef.current;
    const stored = getPriorityReview(id);
    if (
      notes.focusFirst === stored.focusFirst &&
      notes.openQuestions === stored.openQuestions &&
      notes.nonNegotiables === stored.nonNegotiables
    ) {
      return;
    }
    persistPriority(id, notes, opts ?? { quiet: true });
  }

  function flushAllPending() {
    for (const passId of PASS_IDS) flushNote(passId, { quiet: true });
    flushPriority({ quiet: true });
  }

  useEffect(() => {
    const b = getBoard(bookId);
    setBoard(b);
    boardRef.current = b;
    const notes = notesFromBoard(b);
    setDraftNotes(notes);
    draftNotesRef.current = notes;
    setHasFullEdit(ownsFullEdit());
    const pr = getPriorityReview(bookId);
    setPriorityNotes(pr);
    priorityNotesRef.current = pr;
    setPrioritySaved(false);
    for (const passId of PASS_IDS) clearNoteTimer(passId);
    clearPriorityTimer();
  }, [bookId]);

  useEffect(() => {
    return () => {
      flushAllPending();
    };
    // Flush drafts on unmount / leave book / module switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  function onStatus(passId: PassId, status: PassStatus) {
    const next = savePass(bookId, passId, { status });
    setBoard(next);
    boardRef.current = next;
  }

  function onNoteChange(passId: PassId, note: string) {
    setDraftNotes((prev) => {
      const next = { ...prev, [passId]: note };
      draftNotesRef.current = next;
      return next;
    });
    clearNoteTimer(passId);
    noteTimers.current[passId] = window.setTimeout(() => {
      delete noteTimers.current[passId];
      persistNote(bookIdRef.current, passId, note, { quiet: true });
    }, DEBOUNCE_MS);
  }

  function onSave(passId: PassId, opts?: { quiet?: boolean }) {
    clearNoteTimer(passId);
    persistNote(bookId, passId, draftNotesRef.current[passId] ?? "", opts);
  }

  function onNoteBlur(passId: PassId) {
    flushNote(passId, { quiet: true });
  }

  function onPriorityChange(patch: Partial<PriorityReview>) {
    setPriorityNotes((prev) => {
      const next = { ...prev, ...patch };
      priorityNotesRef.current = next;
      clearPriorityTimer();
      priorityTimer.current = window.setTimeout(() => {
        priorityTimer.current = null;
        persistPriority(bookIdRef.current, next, { quiet: true });
      }, DEBOUNCE_MS);
      return next;
    });
  }

  function savePriority(opts?: { quiet?: boolean }) {
    clearPriorityTimer();
    persistPriority(bookId, priorityNotesRef.current, opts);
  }

  function onPriorityBlur() {
    flushPriority({ quiet: true });
  }

  async function unlock(id: PackageId) {
    const result = await startCheckout(id);
    if (!result.ok) {
      onToast?.(result.reason);
      return;
    }
    if (result.mode === "stripe") return; // redirected to Checkout
    setHasFullEdit(ownsFullEdit());
    onToast?.(
      id === "studio-bundle" ? "Studio Bundle unlocked on this device" : "Full Edit unlocked on this device",
    );
  }

  const passes = listPasses();

  return (
    <div className="editing">
      <header className="editing-head">
        <h2>Editing</h2>
        <p className="editing-lede">
          Four passes in sequence — developmental through proof — with a status and note at each
          gate.
        </p>
      </header>

      {!hasFullEdit ? (
        <div className="pkg-cta" role="region" aria-label="Unlock Full Edit">
          <div className="pkg-cta-copy">
            <h3>Unlock Full Edit package</h3>
            <p>
              Keep using the free board. Unlock Full Edit and you get three editor prompts
              (focus-first, open questions, non-negotiables) plus a note on each four-pass gate.
              Unlocks stay on this device for now; accounts for sync across phones and computers
              are coming soon.
            </p>
            <div className="pkg-cta-actions">
              <button className="btn-solid" type="button" onClick={() => unlock("full-edit")}>
                Unlock Full Edit · $249
              </button>
              <button className="btn-export" type="button" onClick={() => unlock("studio-bundle")}>
                Studio Bundle · $449 soft launch
              </button>
              <button className="linkish" type="button" onClick={onSeePackages}>
                See all packages
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="pkg-owned-banner">
            <span className="pkg-badge owned">Full Edit owned</span>
            <span className="pkg-chip priority">Priority review included</span>
            <button className="linkish" type="button" onClick={onSeePackages}>
              See all packages
            </button>
          </div>

          <section className="payoff-card" aria-label="Priority review">
            <div className="payoff-card-head">
              <h3>Priority review</h3>
              <span className="pkg-chip priority">Full Edit</span>
            </div>
            <p className="payoff-lede">
              Three prompts for your editor before the four-pass board locks — so the $249 is a
              brief, not a blank box.
            </p>
            <label className="editing-field">
              Focus first
              <textarea
                value={priorityNotes.focusFirst}
                onChange={(e) => onPriorityChange({ focusFirst: e.target.value })}
                onBlur={onPriorityBlur}
                placeholder="What the editor should attack first — plot, pacing, a character who doesn't earn it…"
                rows={3}
                spellCheck={false}
              />
            </label>
            <label className="editing-field">
              Open questions
              <textarea
                value={priorityNotes.openQuestions}
                onChange={(e) => onPriorityChange({ openQuestions: e.target.value })}
                onBlur={onPriorityBlur}
                placeholder="Decisions you still need — ending, POV, what can be cut…"
                rows={3}
                spellCheck={false}
              />
            </label>
            <label className="editing-field">
              Non-negotiables
              <textarea
                value={priorityNotes.nonNegotiables}
                onChange={(e) => onPriorityChange({ nonNegotiables: e.target.value })}
                onBlur={onPriorityBlur}
                placeholder="Voice, relationships, or scenes that must stay — protect these."
                rows={3}
                spellCheck={false}
              />
            </label>
            <div className="editing-card-actions">
              <button className="btn-solid" type="button" onClick={() => savePriority()}>
                {prioritySaved ? "Saved" : "Save notes"}
              </button>
              <span className="editing-autosave-hint">Auto-saves as you type</span>
            </div>
          </section>
        </>
      )}

      <ul className="editing-board">
        {passes.map((pass, index) => {
          const state = board[pass.id];
          const num = index + 1;
          return (
            <li key={pass.id} className={`editing-card status-${state.status}`}>
              <div className="editing-card-top">
                <div className="editing-card-title">
                  <span className="editing-pass-num" aria-hidden="true">
                    {num}
                  </span>
                  <h3>
                    <span className="sr-only">Pass {num}: </span>
                    {pass.label}
                  </h3>
                </div>
                <span className={`editing-status-pill ${state.status}`}>
                  {STATUS_LABELS[state.status]}
                </span>
              </div>
              <p className="editing-purpose">{pass.purpose}</p>
              <label className="editing-field">
                Status
                <select
                  value={state.status}
                  onChange={(e) => onStatus(pass.id, e.target.value as PassStatus)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="editing-field">
                Note
                <textarea
                  value={draftNotes[pass.id] ?? ""}
                  onChange={(e) => onNoteChange(pass.id, e.target.value)}
                  onBlur={() => onNoteBlur(pass.id)}
                  placeholder={pass.notePrompt}
                  rows={3}
                  spellCheck={false}
                />
              </label>
              <div className="editing-card-actions">
                <button className="btn-solid" type="button" onClick={() => onSave(pass.id)}>
                  {savedFlash === pass.id ? "Saved" : "Save"}
                </button>
                <span className="editing-autosave-hint">Auto-saves as you type</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
