/**
 * Publish readiness meter — 0–100 from book signals + KDP checklist.
 */

import { getChecklist } from "./publishChecklist";

export type ReadinessInput = {
  bookId: string;
  manuscriptText?: string;
  authorName?: string;
  copyrightYear?: string;
  coverSrc?: string;
  exportsCount?: number;
};

export type ReadinessResult = {
  score: number;
  nextTip: string;
  signals: {
    manuscript: boolean;
    matter: boolean;
    cover: boolean;
    export: boolean;
    kdpPaperback: boolean;
    kdpEbook: boolean;
  };
};

export function scorePublishReadiness(input: ReadinessInput): ReadinessResult {
  const manuscript = !!(input.manuscriptText && input.manuscriptText.trim().length > 0);
  const matter = !!(
    input.authorName &&
    input.authorName.trim() &&
    input.copyrightYear &&
    String(input.copyrightYear).trim()
  );
  const cover = !!(input.coverSrc && input.coverSrc.trim());
  const exportOk = (input.exportsCount ?? 0) > 0;
  const checks = getChecklist(input.bookId);
  const kdpPaperback = !!checks["kdp-paperback"];
  const kdpEbook = !!checks["kdp-ebook"];

  // 20 + 20 + 20 + 20 + 10 + 10 = 100
  let score = 0;
  if (manuscript) score += 20;
  if (matter) score += 20;
  if (cover) score += 20;
  if (exportOk) score += 20;
  if (kdpPaperback) score += 10;
  if (kdpEbook) score += 10;

  let nextTip = "Ready to publish — walk the checklist one more time.";
  if (!manuscript) nextTip = "Add manuscript text in Formatting.";
  else if (!matter) nextTip = "Fill author name and copyright year in Matter.";
  else if (!cover) nextTip = "Attach a cover image in Formatting.";
  else if (!exportOk) nextTip = "Export a Print PDF or EPUB to log it in the locker.";
  else if (!kdpPaperback) nextTip = "Check off KDP paperback when print files are ready.";
  else if (!kdpEbook) nextTip = "Check off KDP ebook when the digital pack is ready.";

  return {
    score,
    nextTip,
    signals: { manuscript, matter, cover, export: exportOk, kdpPaperback, kdpEbook },
  };
}
