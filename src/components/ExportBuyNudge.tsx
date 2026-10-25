import { useState } from "react";
import { startCheckout } from "../lib/billing";
import { formatCatalogBundlePrice } from "../lib/softLaunch";

type Props = {
  onSeePackages: () => void;
  onDismiss: () => void;
};

export default function ExportBuyNudge({ onSeePackages, onDismiss }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function buyBundle() {
    if (busy) return;
    setNote(null);
    setBusy(true);
    const result = await startCheckout("studio-bundle");
    setBusy(false);
    if (!result.ok) setNote(result.reason);
  }

  return (
    <aside className="export-buy-nudge" role="region" aria-label="Studio Bundle after export">
      <button className="export-buy-nudge-dismiss" type="button" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
      <p className="export-buy-nudge-eyebrow">Your files are ready</p>
      <h3 className="export-buy-nudge-title">Studio Bundle</h3>
      <p className="export-buy-nudge-lede">
        Cover (ebook front cover, 2400x2400 audiobook cover and 3D book mockup), print wrap, proofread,
        blurb polish, and 6 promo graphics for <strong>{formatCatalogBundlePrice()} USD</strong>.
      </p>
      <p className="export-buy-nudge-note">
        Some covers are made with AI tools and some by hand. Either way, Quillbench reviews and edits
        every cover before it's delivered.
      </p>
      <p className="export-buy-nudge-note">
        Proofreading and blurb are done by hand. Promo graphics are made with AI help, and Quillbench
        edits every one.
      </p>
      <div className="export-buy-nudge-actions">
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy}
          onClick={() => void buyBundle()}
        >
          {busy ? "Opening checkout…" : `Get Studio Bundle ${formatCatalogBundlePrice()}`}
        </button>
        <button className="btn btn-ghost export-buy-nudge-alt" type="button" onClick={onSeePackages}>
          See packages
        </button>
        <button className="linkish export-buy-nudge-later" type="button" onClick={onDismiss}>
          Not now
        </button>
      </div>
      {note ? <p className="export-buy-nudge-note">{note}</p> : null}
    </aside>
  );
}
