import { useEffect, useState } from "react";
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
import { getPriorityReview, setPriorityReview } from "../lib/priorityReview";

type Props = {
  bookId: string;
  onSeePackages: () => void;
  onToast?: (msg: string) => void;
};

export default function EditingPanel({ bookId, onSeePackages, onToast }: Props) {
  const [board, setBoard] = useState<BookPassMap>(() => getBoard(bookId));
  const [draftNotes, setDraftNotes] = useState<Record<PassId, string>>(() => {
    const b = getBoard(bookId);
    return {
      developmental: b.developmental.note,
      line: b.line.note,
      copy: b.copy.note,
      proof: b.proof.note,
    };
  });
  const [hasFullEdit, setHasFullEdit] = useState(() => ownsFullEdit());
  const [savedFlash, setSavedFlash] = useState<PassId | null>(null);
  const [priorityNotes, setPriorityNotes] = useState(() => getPriorityReview(bookId));
  const [prioritySaved, setPrioritySaved] = useState(false);

  useEffect(() => {
    const b = getBoard(bookId);
    setBoard(b);
    setDraftNotes({
      developmental: b.developmental.note,
      line: b.line.note,
      copy: b.copy.note,
      proof: b.proof.note,
    });
    setHasFullEdit(ownsFullEdit());
    setPriorityNotes(getPriorityReview(bookId));
    setPrioritySaved(false);
  }, [bookId]);

  function onStatus(passId: PassId, status: PassStatus) {
    const next = savePass(bookId, passId, { status });
    setBoard(next);
  }

  function onNoteChange(passId: PassId, note: string) {
    setDraftNotes((prev) => ({ ...prev, [passId]: note }));
  }

  function onSave(passId: PassId, opts?: { quiet?: boolean }) {
    const next = savePass(bookId, passId, { note: draftNotes[passId] ?? "" });
    setBoard(next);
    setSavedFlash(passId);
    window.setTimeout(() => setSavedFlash((cur) => (cur === passId ? null : cur)), 1200);
    if (!opts?.quiet) onToast?.("Pass saved");
  }

  function onNoteBlur(passId: PassId) {
    const current = board[passId]?.note ?? "";
    const draft = draftNotes[passId] ?? "";
    if (draft === current) return;
    onSave(passId, { quiet: true });
  }

  function savePriority(opts?: { quiet?: boolean }) {
    setPriorityReview(bookId, priorityNotes);
    setPrioritySaved(true);
    window.setTimeout(() => setPrioritySaved(false), 1200);
    if (!opts?.quiet) onToast?.("Priority review notes saved");
  }

  function onPriorityBlur() {
    const stored = getPriorityReview(bookId);
    if (priorityNotes === stored) return;
    savePriority({ quiet: true });
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
              Keep using the free board. Unlock opens Stripe Checkout for Full Edit — priority
              review notes for your editor, a done-with-you pass. Unlocks stay on this device for
              now; accounts for sync across phones and computers are coming soon.
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
              Notes for your editor / priority pass — what to focus on first, open questions, and
              non-negotiables before the four-pass board locks.
            </p>
            <label className="editing-field">
              Priority notes
              <textarea
                value={priorityNotes}
                onChange={(e) => setPriorityNotes(e.target.value)}
                onBlur={onPriorityBlur}
                placeholder="Tone goals, plot risks, voice to protect, deadlines…"
                rows={4}
                spellCheck={false}
              />
            </label>
            <div className="editing-card-actions">
              <button className="btn-solid" type="button" onClick={() => savePriority()}>
                {prioritySaved ? "Saved" : "Save notes"}
              </button>
              <span className="editing-autosave-hint">Auto-saves when you leave the field</span>
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
                  placeholder="Decisions, open questions, parked items…"
                  rows={3}
                  spellCheck={false}
                />
              </label>
              <div className="editing-card-actions">
                <button className="btn-solid" type="button" onClick={() => onSave(pass.id)}>
                  {savedFlash === pass.id ? "Saved" : "Save"}
                </button>
                <span className="editing-autosave-hint">Auto-saves when you leave the note</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
