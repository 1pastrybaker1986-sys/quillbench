/**
 * ManuscriptStore seam — swap localStorage for Netlify Identity + Blobs without rewriting Book/Session shapes.
 * Default adapter = existing localStorage (`store.ts`). Cloud adapter only when VITE_CLOUD_SAVE=on.
 */

import type { Book, Session, TrimSize } from "./types";
import type { BookPatch } from "./store";
import { isCloudSaveEnabled } from "./cloudSaveFlag";
import { localManuscriptStore } from "./localManuscriptStore";
import { netlifyCloudManuscriptStore } from "./netlifyCloudSave";

export type { BookPatch };

export interface ManuscriptStore {
  readonly id: "localStorage" | "netlify-identity-blobs";

  getSession(): Session | null;
  signInWithEmail(email: string): Session | Promise<Session>;
  signInDemo(): Session;
  signOut(): void | Promise<void>;

  listBooks(ownerId: string): Book[] | Promise<Book[]>;
  getBook(id: string): Book | undefined | Promise<Book | undefined>;
  createBook(ownerId: string, title: string): Book | Promise<Book>;
  updateBook(id: string, patch: BookPatch): Book | undefined | Promise<Book | undefined>;
  setTrim(id: string, trim: TrimSize): Book | undefined | Promise<Book | undefined>;
}

let cached: ManuscriptStore | null = null;

/**
 * Resolve the active store. Flag off → localStorage only (never Identity/Blobs).
 * Flag on (dev) → Netlify Identity + Blobs adapter (stub until Soft-PASS wiring).
 */
export function getManuscriptStore(): ManuscriptStore {
  if (cached) return cached;
  cached = isCloudSaveEnabled() ? netlifyCloudManuscriptStore : localManuscriptStore;
  return cached;
}

/** Test / HMR helper — clears the factory cache after env changes. */
export function resetManuscriptStoreCache(): void {
  cached = null;
}
