/**
 * Default ManuscriptStore adapter — existing localStorage session + books (`store.ts`).
 * Scan / Write / Editing persist paths continue to call store.ts directly; this seam wraps the same APIs.
 */

import type { ManuscriptStore } from "./manuscriptStore";
import {
  createBook,
  getBook,
  getSession,
  listBooks,
  setTrim,
  startLocalSession,
  signInDemo,
  signInWithEmail,
  signOut,
  updateBook,
} from "./store";

export const localManuscriptStore: ManuscriptStore = {
  id: "localStorage",
  getSession,
  signInWithEmail,
  startLocalSession,
  signInDemo,
  signOut,
  listBooks,
  getBook,
  createBook,
  updateBook,
  setTrim,
};
