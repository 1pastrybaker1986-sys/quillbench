import { useState } from "react";
import { startCheckout } from "../lib/billing";
import { SOFT_LAUNCH, formatCatalogBundlePrice, formatSoftBundlePrice } from "../lib/softLaunch";

type Props = {
  onSeePackages: () => void;
  onDismiss: () => void;
};

export default function ExportBuyNudge({ onSeePackages, onDismiss }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const soft = formatSoftBundlePrice();

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
      <h3 className="export-buy-nudge-title">Studio Bundle soft launch</h3>
      <p className="export-buy-nudge-lede">
        Full Edit + Cover + Marketing for <strong>{soft} USD</strong>{" "}
        <span className="export-buy-nudge-was">(was {formatCatalogBundlePrice()})</span>{" "}
        {SOFT_LAUNCH.softLaunchThrough}. Checkout applies <strong>{SOFT_LAUNCH.couponCode}</strong>{" "}
        automatically — price is {soft} USD, not $4.49.
      </p>
      <div className="export-buy-nudge-actions">
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy}
          onClick={() => void buyBundle()}
        >
          {busy ? "Opening checkout…" : `Get Studio Bundle ${soft}`}
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
