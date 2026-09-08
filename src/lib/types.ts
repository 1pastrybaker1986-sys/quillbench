/**
 * Record shapes for the web shell.
 * Seam: keep these when swapping localStorage for real accounts + a cloud manuscript store.
 */

export type Session = {
  userId: string;
  displayName: string;
  email: string;
  createdAt: string;
};

export type BookStatus = "draft" | "formatting" | "proof";

export type TrimSize = "5.5x8.5" | "6x9";

export type BookTheme = "trade-paperback";

export type BookExportKind = "pdf" | "epub";

export type BookExport = {
  id: string;
  kind: BookExportKind;
  filename: string;
  createdAt: string;
  sizeBytes?: number;
};

export type Book = {
  id: string;
  ownerId: string;
  title: string;
  status: BookStatus;
  trim: TrimSize;
  theme: BookTheme;
  coverSrc?: string;
  /** Present when a print pack already exists (Eden’s Fall). Do not rebuild. */
  coverPackNote?: string;
  /** Pasted, dropped, or scanned chapter text for the spread preview. */
  manuscriptText?: string;
  authorName?: string;
  subtitle?: string;
  dedication?: string;
  copyrightYear?: string;
  publisherLine?: string;
  /** Recent Print PDF / EPUB downloads (metadata locker; last 10). */
  exports?: BookExport[];
  createdAt: string;
  updatedAt: string;
};

export type ModuleId = "grammar" | "editing" | "formatting" | "publishing";
