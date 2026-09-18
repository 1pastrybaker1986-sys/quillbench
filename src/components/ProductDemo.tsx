import { useCallback, useEffect, useState } from "react";

type DemoStep = {
  id: string;
  label: string;
  caption: string;
  book: string;
};

const STEPS: DemoStep[] = [
  {
    id: "scan",
    label: "Scan",
    caption: "OCR typed pages into editable manuscript text — ready for craft.",
    book: "Untitled",
  },
  {
    id: "grammar",
    label: "Grammar",
    caption: "Fiction-aware notes flag dialogue tags and tense drift as you draft.",
    book: "Untitled",
  },
  {
    id: "editing",
    label: "Editing",
    caption: "Four-pass board: developmental → line → copy → proof, status at a glance.",
    book: "Untitled",
  },
  {
    id: "formatting",
    label: "Formatting",
    caption: "Print PDF + EPUB from one bench — front matter, chapters, export ready.",
    book: "Untitled",
  },
  {
    id: "publishing",
    label: "Publishing",
    caption: "Studio packages unlock cover, marketing, and launch checklists.",
    book: "Untitled",
  },
];

const STEP_MS = 5200; // ~26s for 5 steps

type Props = {
  /** Real Scan CTA — opens Workspace OCR, not just the decorative tour. */
  onScanStart?: () => void;
};

export default function ProductDemo({ onScanStart }: Props) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  const go = useCallback((index: number) => {
    setStep(((index % STEPS.length) + STEPS.length) % STEPS.length);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  const current = STEPS[step];

  function selectStep(i: number) {
    go(i);
    setPlaying(false);
    if (STEPS[i]?.id === "scan" && onScanStart) {
      onScanStart();
    }
  }

  return (
    <aside className="product-demo" aria-label="Product walkthrough">
      <div className="product-demo-chrome">
        <p className="product-demo-eyebrow">In the bench</p>
        <div className="product-demo-controls">
          <button
            type="button"
            className="product-demo-play"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <div className="product-demo-dots" role="tablist" aria-label="Bench steps">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === step}
                className={"product-demo-dot" + (i === step ? " active" : "")}
                onClick={() => selectStep(i)}
                aria-label={s.id === "scan" && onScanStart ? "Scan a page" : s.label}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="product-demo-stage" data-step={current.id}>
        <div className="product-demo-window">
          <div className="product-demo-titlebar">
            <span className="product-demo-dots-fake" aria-hidden="true">
              <i /><i /><i />
            </span>
            <span className="product-demo-window-label">Quillbench · {current.book}</span>
          </div>
          <nav className="product-demo-tabs" aria-label="Bench modules">
            {STEPS.map((s, i) =>
              s.id === "scan" && onScanStart ? (
                <button
                  key={s.id}
                  type="button"
                  className={"product-demo-tab" + (i === step ? " active" : "")}
                  onClick={() => selectStep(i)}
                >
                  {s.label}
                </button>
              ) : (
                <button
                  key={s.id}
                  type="button"
                  className={"product-demo-tab" + (i === step ? " active" : "")}
                  onClick={() => {
                    go(i);
                    setPlaying(false);
                  }}
                >
                  {s.label}
                </button>
              ),
            )}
          </nav>
          <div className="product-demo-panel" key={current.id}>
            {current.id === "scan" && (
              <div className="pd-scan">
                <div className="pd-scan-page">
                  <span className="pd-scan-beam" />
                  <p>Your page</p>
                  <p className="pd-scan-lines">Typed lines resolve into clean manuscript text…</p>
                </div>
                <ul className="pd-scan-meta">
                  <li>OCR ready</li>
                  <li>Stays on device</li>
                </ul>
                {onScanStart ? (
                  <button
                    type="button"
                    className="btn btn-primary product-demo-scan-cta"
                    onClick={() => onScanStart()}
                  >
                    Scan a page
                  </button>
                ) : null}
              </div>
            )}
            {current.id === "grammar" && (
              <div className="pd-grammar">
                <p className="pd-quote">“She said quietly,” he muttered.</p>
                <div className="pd-note">
                  <strong>Fiction note</strong>
                  <span>Stacked dialogue tags — consider trimming.</span>
                </div>
                <div className="pd-note muted">
                  <strong>Tense</strong>
                  <span>Past → present drift in ¶4.</span>
                </div>
              </div>
            )}
            {current.id === "editing" && (
              <div className="pd-editing">
                {["Developmental", "Line", "Copy", "Proof"].map((pass, i) => (
                  <div key={pass} className={"pd-pass" + (i <= 1 ? " done" : i === 2 ? " active" : "")}>
                    <span>{pass}</span>
                    <em>{i <= 1 ? "Done" : i === 2 ? "In progress" : "Queued"}</em>
                  </div>
                ))}
              </div>
            )}
            {current.id === "formatting" && (
              <div className="pd-format">
                <div className="pd-spread">
                  <div className="pd-page"><small>Half-title</small><strong>Untitled</strong></div>
                  <div className="pd-page"><small>Ch. 1</small><p>Your opening line…</p></div>
                </div>
                <div className="pd-exports">
                  <span>PDF</span>
                  <span>EPUB</span>
                </div>
              </div>
            )}
            {current.id === "publishing" && (
              <div className="pd-publish">
                <div className="pd-pkg featured">Studio Bundle · $449 soft launch</div>
                <div className="pd-pkg">Full Edit · $249</div>
                <div className="pd-pkg">Cover · $179</div>
                <div className="pd-pkg">Marketing · $129</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="product-demo-caption" role="status">
        <strong>{current.label}</strong>
        <span>{current.caption}</span>
      </p>
    </aside>
  );
}
