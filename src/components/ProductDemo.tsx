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
    caption: "OCR typed pages into editable manuscript text — Glass Harbor, page 12.",
    book: "Glass Harbor",
  },
  {
    id: "grammar",
    label: "Grammar",
    caption: "Fiction-aware notes flag dialogue tags and tense drift on Copper Thread.",
    book: "Copper Thread",
  },
  {
    id: "editing",
    label: "Editing",
    caption: "Four-pass board: developmental → line → copy → proof, status at a glance.",
    book: "Glass Harbor",
  },
  {
    id: "formatting",
    label: "Formatting",
    caption: "Print PDF + EPUB from one bench — front matter, chapters, export ready.",
    book: "Copper Thread",
  },
  {
    id: "publishing",
    label: "Publishing",
    caption: "Studio packages unlock cover, marketing, and launch checklists.",
    book: "Glass Harbor",
  },
];

const STEP_MS = 5200; // ~26s for 5 steps

export default function ProductDemo() {
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

  return (
    <aside className="product-demo" aria-label="Product walkthrough">
      <div className="product-demo-chrome">
        <p className="product-demo-eyebrow">Product tour</p>
        <div className="product-demo-controls">
          <button
            type="button"
            className="product-demo-play"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause tour" : "Play tour"}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <div className="product-demo-dots" role="tablist" aria-label="Tour steps">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === step}
                className={"product-demo-dot" + (i === step ? " active" : "")}
                onClick={() => {
                  go(i);
                  setPlaying(false);
                }}
                aria-label={s.label}
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
          <nav className="product-demo-tabs" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.id} className={"product-demo-tab" + (i === step ? " active" : "")}>
                {s.label}
              </span>
            ))}
          </nav>
          <div className="product-demo-panel" key={current.id}>
            {current.id === "scan" && (
              <div className="pd-scan">
                <div className="pd-scan-page">
                  <span className="pd-scan-beam" />
                  <p>Chapter 3 — The Pier</p>
                  <p className="pd-scan-lines">Typed lines resolve into clean manuscript text…</p>
                </div>
                <ul className="pd-scan-meta">
                  <li>12 pages</li>
                  <li>OCR ready</li>
                </ul>
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
                  <div className="pd-page"><small>Half-title</small><strong>Glass Harbor</strong></div>
                  <div className="pd-page"><small>Ch. 1</small><p>Fog clung to the rails…</p></div>
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
