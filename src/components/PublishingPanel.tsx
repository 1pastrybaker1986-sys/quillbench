import { useEffect, useMemo, useState } from "react";
import {
  formatPrice,
  getOwned,
  listPackages,
  owns,
  ownsCoverDesign,
  ownsMarketing,
  type PackageId,
} from "../lib/packages";
import { startCheckout } from "../lib/billing";
import {
  getChecklist,
  listChecklist,
  setChecklistItem,
  type ChecklistId,
  type ChecklistState,
} from "../lib/publishChecklist";
import {
  getCoverBrief,
  setCoverBrief,
  setCoverDeliverable,
  type CoverBrief,
  type CoverDeliverable,
  type CoverTrimPref,
} from "../lib/coverBrief";
import {
  getMarketingKit,
  LAUNCH_ITEMS,
  setLaunchItem,
  setMarketingKit,
  type LaunchItemId,
  type MarketingKit,
} from "../lib/marketingKit";
import { scorePublishReadiness } from "../lib/publishReadiness";

export type PublishingBookSignals = {
  manuscriptText?: string;
  authorName?: string;
  copyrightYear?: string;
  coverSrc?: string;
  exportsCount?: number;
};

type Props = {
  bookId: string;
  bookSignals: PublishingBookSignals;
  onToast?: (msg: string) => void;
};

const DELIVERABLES: { id: CoverDeliverable; label: string }[] = [
  { id: "front", label: "Front cover" },
  { id: "back", label: "Back cover" },
  { id: "ebook", label: "Ebook cover" },
];

export default function PublishingPanel({ bookId, bookSignals, onToast }: Props) {
  const [checks, setChecks] = useState<ChecklistState>(() => getChecklist(bookId));
  const [ownedTick, setOwnedTick] = useState(0);
  const [coverBrief, setCoverBriefState] = useState<CoverBrief>(() => getCoverBrief(bookId));
  const [marketing, setMarketing] = useState<MarketingKit>(() => getMarketingKit(bookId));
  const [coverSaved, setCoverSaved] = useState(false);
  const [mktSaved, setMktSaved] = useState(false);

  useEffect(() => {
    setChecks(getChecklist(bookId));
    setCoverBriefState(getCoverBrief(bookId));
    setMarketing(getMarketingKit(bookId));
    setCoverSaved(false);
    setMktSaved(false);
  }, [bookId]);

  const packages = listPackages();
  void ownedTick;
  const ownedIds = new Set(getOwned());
  const hasCover = ownsCoverDesign();
  const hasMarketing = ownsMarketing();

  const readiness = useMemo(
    () =>
      scorePublishReadiness({
        bookId,
        manuscriptText: bookSignals.manuscriptText,
        authorName: bookSignals.authorName,
        copyrightYear: bookSignals.copyrightYear,
        coverSrc: bookSignals.coverSrc,
        exportsCount: bookSignals.exportsCount,
      }),
    [
      bookId,
      bookSignals.manuscriptText,
      bookSignals.authorName,
      bookSignals.copyrightYear,
      bookSignals.coverSrc,
      bookSignals.exportsCount,
      checks,
    ],
  );

  function toggle(id: ChecklistId) {
    const next = setChecklistItem(bookId, id, !checks[id]);
    setChecks(next);
  }

  async function unlock(id: PackageId) {
    const result = await startCheckout(id);
    if (!result.ok) {
      onToast?.(result.reason);
      return;
    }
    if (result.mode === "stripe") return; // redirected to Checkout
    setOwnedTick((n) => n + 1);
    onToast?.(
      id === "studio-bundle"
        ? "Studio Bundle unlocked on this device"
        : `${listPackages().find((p) => p.id === id)?.title ?? "Package"} unlocked on this device`,
    );
  }

  function patchCover(patch: Partial<CoverBrief>) {
    const next = setCoverBrief(bookId, patch);
    setCoverBriefState(next);
  }

  function saveCover(opts?: { quiet?: boolean }) {
    setCoverBrief(bookId, coverBrief);
    setCoverSaved(true);
    window.setTimeout(() => setCoverSaved(false), 1200);
    if (!opts?.quiet) onToast?.("Cover brief saved");
  }

  function toggleDeliverable(id: CoverDeliverable) {
    const next = setCoverDeliverable(bookId, id, !coverBrief.deliverables[id]);
    setCoverBriefState(next);
  }

  function patchMarketing(patch: Partial<MarketingKit>) {
    const next = setMarketingKit(bookId, patch);
    setMarketing(next);
  }

  function saveMarketing(opts?: { quiet?: boolean }) {
    setMarketingKit(bookId, marketing);
    setMktSaved(true);
    window.setTimeout(() => setMktSaved(false), 1200);
    if (!opts?.quiet) onToast?.("Marketing kit saved");
  }

  function toggleLaunch(id: LaunchItemId) {
    const next = setLaunchItem(bookId, id, !marketing.launch[id]);
    setMarketing(next);
  }

  return (
    <div className="publishing">
      <header className="publishing-head">
        <h2>Publishing</h2>
        <p className="publishing-lede">
          Distribution checklist and studio packages. Cover attach and export locker live in
          Formatting.
        </p>
      </header>

      <section className="readiness" aria-label="Publish readiness">
        <div className="readiness-top">
          <h3>Publish readiness</h3>
          <span className="readiness-pct" aria-live="polite">
            {readiness.score}%
          </span>
        </div>
        <div
          className="readiness-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={readiness.score}
          aria-label="Publish readiness percent"
        >
          <div className="readiness-bar-fill" style={{ width: `${readiness.score}%` }} />
        </div>
        <p className="readiness-next">
          <strong>Next:</strong> {readiness.nextTip}
        </p>
      </section>

      <section className="pub-section">
        <h3>Distribution checklist</h3>
        <ul className="pub-checklist">
          {listChecklist().map((item) => (
            <li key={item.id} className={checks[item.id] ? "done" : ""}>
              <label className="pub-check-label">
                <input
                  type="checkbox"
                  checked={checks[item.id]}
                  onChange={() => toggle(item.id)}
                />
                <span className="pub-check-text">
                  <strong>
                    {item.label}
                    {item.optional ? <em className="pub-optional"> optional</em> : null}
                  </strong>
                  <span className="pub-check-hint">{item.hint}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="pub-section payoff-section">
        <h3>Cover Design</h3>
        {hasCover ? (
          <div className="payoff-card" aria-label="Cover design brief">
            <div className="payoff-card-head">
              <h4>Cover brief</h4>
              <span className="pkg-badge owned">Owned</span>
            </div>
            <p className="payoff-lede">
              Trim preference, mood, must-haves, and deliverables — you attach final print/ebook
              files in Formatting. We do not rebuild Eden&apos;s Fall covers.
            </p>
            <label className="editing-field">
              Trim preference
              <select
                value={coverBrief.trimPref}
                onChange={(e) =>
                  patchCover({ trimPref: e.target.value as CoverTrimPref })
                }
              >
                <option value="">Choose…</option>
                <option value="5.5x8.5">5.5 × 8.5</option>
                <option value="6x9">6 × 9</option>
                <option value="other">Other / custom</option>
              </select>
            </label>
            <label className="editing-field">
              Mood / genre notes
              <textarea
                value={coverBrief.moodNotes}
                onChange={(e) =>
                  setCoverBriefState((c) => ({ ...c, moodNotes: e.target.value }))
                }
                onBlur={() => patchCover({ moodNotes: coverBrief.moodNotes })}
                placeholder="Tone, palette, comps, what the shelf should feel like…"
                rows={3}
                spellCheck={false}
              />
            </label>
            <label className="editing-field">
              Must-have elements
              <textarea
                value={coverBrief.mustHave}
                onChange={(e) =>
                  setCoverBriefState((c) => ({ ...c, mustHave: e.target.value }))
                }
                onBlur={() => patchCover({ mustHave: coverBrief.mustHave })}
                placeholder="Title treatment, symbols, faces, text that must appear…"
                rows={3}
                spellCheck={false}
              />
            </label>
            <fieldset className="payoff-checks">
              <legend>Deliverables</legend>
              {DELIVERABLES.map((d) => (
                <label key={d.id} className="pub-check-label">
                  <input
                    type="checkbox"
                    checked={coverBrief.deliverables[d.id]}
                    onChange={() => toggleDeliverable(d.id)}
                  />
                  <span>{d.label}</span>
                </label>
              ))}
            </fieldset>
            <div className="editing-card-actions">
              <button className="btn-solid" type="button" onClick={() => saveCover()}>
                {coverSaved ? "Saved" : "Save brief"}
              </button>
              <span className="editing-autosave-hint">Fields save on blur; checkboxes save immediately</span>
            </div>
          </div>
        ) : (
          <div className="pkg-cta payoff-teaser" role="region" aria-label="Unlock Cover Design">
            <div className="pkg-cta-copy">
              <h4>Cover Design locked</h4>
              <p>
                Unlock to fill a cover brief — trim, mood, must-haves, and a front / back / ebook
                deliverable checklist. Attach finals in Formatting.
              </p>
              <div className="pkg-cta-actions">
                <button className="btn-solid" type="button" onClick={() => unlock("cover-design")}>
                  Unlock Cover Design · $179
                </button>
                <button className="btn-export" type="button" onClick={() => unlock("studio-bundle")}>
                  Studio Bundle · $499
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="pub-section payoff-section">
        <h3>Marketing</h3>
        {hasMarketing ? (
          <div className="payoff-card" aria-label="Marketing kit">
            <div className="payoff-card-head">
              <h4>Marketing kit</h4>
              <span className="pkg-badge owned">Owned</span>
            </div>
            <p className="payoff-lede">
              Blurb, keywords, and a launch checklist so the book can find its readers.
            </p>
            <label className="editing-field">
              Blurb
              <textarea
                value={marketing.blurb}
                onChange={(e) => setMarketing((m) => ({ ...m, blurb: e.target.value }))}
                onBlur={() => patchMarketing({ blurb: marketing.blurb })}
                placeholder="Back-cover / retail description…"
                rows={4}
                spellCheck={false}
              />
            </label>
            <label className="editing-field">
              Keywords
              <input
                className="payoff-input"
                type="text"
                value={marketing.keywords}
                onChange={(e) => setMarketing((m) => ({ ...m, keywords: e.target.value }))}
                onBlur={() => patchMarketing({ keywords: marketing.keywords })}
                placeholder="Comma-separated discovery keywords"
                spellCheck={false}
              />
            </label>
            <fieldset className="payoff-checks">
              <legend>Launch checklist</legend>
              {LAUNCH_ITEMS.map((item) => (
                <label key={item.id} className="pub-check-label">
                  <input
                    type="checkbox"
                    checked={marketing.launch[item.id]}
                    onChange={() => toggleLaunch(item.id)}
                  />
                  <span className="pub-check-text">
                    <strong>{item.label}</strong>
                    <span className="pub-check-hint">{item.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="editing-card-actions">
              <button className="btn-solid" type="button" onClick={() => saveMarketing()}>
                {mktSaved ? "Saved" : "Save kit"}
              </button>
              <span className="editing-autosave-hint">Fields save on blur; checklist saves immediately</span>
            </div>
          </div>
        ) : (
          <div className="pkg-cta payoff-teaser" role="region" aria-label="Unlock Marketing">
            <div className="pkg-cta-copy">
              <h4>Marketing locked</h4>
              <p>
                Unlock for blurb, keywords, and a launch checklist (preorder, newsletter, social,
                KDP categories).
              </p>
              <div className="pkg-cta-actions">
                <button className="btn-solid" type="button" onClick={() => unlock("marketing")}>
                  Unlock Marketing · $129
                </button>
                <button className="btn-export" type="button" onClick={() => unlock("studio-bundle")}>
                  Studio Bundle · $499
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="pub-section">
        <h3>Studio packages</h3>
        <p className="pub-stub-note">
          Secure checkout via Stripe. After payment, unlocks are saved on this device until you
          sign in with an account (coming soon for sync across phones and computers).
        </p>
        <ul className="pkg-grid">
          {packages.map((pkg) => {
            const isOwned =
              pkg.id === "studio-bundle"
                ? ownedIds.has("studio-bundle")
                : owns(pkg.id);
            return (
              <li
                key={pkg.id}
                className={`pkg-card${isOwned ? " owned" : ""}${pkg.featured ? " featured" : ""}`}
              >
                <div className="pkg-card-top">
                  <h4>{pkg.title}</h4>
                  <span className="pkg-price">{formatPrice(pkg.price)}</span>
                </div>
                {pkg.featured ? <span className="pkg-badge best">Best value</span> : null}
                <p className="pkg-blurb">{pkg.blurb}</p>
                {isOwned ? (
                  <span className="pkg-badge owned">Owned</span>
                ) : (
                  <button
                    className="btn-solid pkg-unlock"
                    type="button"
                    onClick={() => unlock(pkg.id)}
                  >
                    Unlock
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
