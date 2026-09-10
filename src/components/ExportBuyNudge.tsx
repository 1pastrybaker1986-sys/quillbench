import { SOFT_LAUNCH, formatCatalogBundlePrice, formatSoftBundlePrice } from "../lib/softLaunch";

type Props = {
  onSeePackages: () => void;
  onDismiss: () => void;
};

export default function ExportBuyNudge({ onSeePackages, onDismiss }: Props) {
  return (
    <aside className="export-buy-nudge" role="region" aria-label="Studio packages after export">
      <button className="export-buy-nudge-dismiss" type="button" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
      <p className="export-buy-nudge-eyebrow">Your files are ready</p>
      <h3 className="export-buy-nudge-title">Studio Bundle soft launch</h3>
      <p className="export-buy-nudge-lede">
        Full Edit + Cover + Marketing for {formatSoftBundlePrice()}{" "}
        <span className="export-buy-nudge-was">({formatCatalogBundlePrice()})</span> during the{" "}
        {SOFT_LAUNCH.windowLabel}. Use code <strong>{SOFT_LAUNCH.couponCode}</strong> at checkout when
        prompted.
      </p>
      <div className="export-buy-nudge-actions">
        <button className="btn btn-primary" type="button" onClick={onSeePackages}>
          See packages
        </button>
        <button className="btn btn-ghost export-buy-nudge-alt" type="button" onClick={onSeePackages}>
          Cover Design
        </button>
        <button className="btn btn-ghost export-buy-nudge-alt" type="button" onClick={onSeePackages}>
          Full Edit
        </button>
        <button className="linkish export-buy-nudge-later" type="button" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}
