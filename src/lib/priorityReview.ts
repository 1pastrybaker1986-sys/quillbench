/**
 * Full Edit payoff — priority review notes per book (localStorage).
 * v2 splits the old single blob into three editor prompts.
 * Also mirrors onto the Book record in store (localStorage stays canonical).
 */

import { getBook, updateBook } from "./store";

export type PriorityReview = {
  focusFirst: string;
  openQuestions: string;
  nonNegotiables: string;
};

const STORAGE_KEY = "quillbench.priorityReview.v2";
const LEGACY_KEY = "quillbench.priorityReview.v1";

type Store = Record<string, PriorityReview>;
type LegacyStore = Record<string, string>;

function empty(): PriorityReview {
  return { focusFirst: "", openQuestions: "", nonNegotiables: "" };
}

function readLegacy(): LegacyStore {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as LegacyStore;
  } catch {
    return {};
  }
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

function normalize(raw: unknown, legacyBlob?: string): PriorityReview {
  if (raw && typeof raw === "object") {
    const o = raw as Partial<PriorityReview>;
    return {
      focusFirst: typeof o.focusFirst === "string" ? o.focusFirst : "",
      openQuestions: typeof o.openQuestions === "string" ? o.openQuestions : "",
      nonNegotiables: typeof o.nonNegotiables === "string" ? o.nonNegotiables : "",
    };
  }
  if (typeof legacyBlob === "string" && legacyBlob.trim()) {
    return { ...empty(), focusFirst: legacyBlob };
  }
  return empty();
}

function hasContent(pr: PriorityReview): boolean {
  return !!(pr.focusFirst.trim() || pr.openQuestions.trim() || pr.nonNegotiables.trim());
}

function mirrorToBook(bookId: string, next: PriorityReview): void {
  try {
    updateBook(bookId, { priorityReview: next });
  } catch {
    /* ignore */
  }
}

export function getPriorityReview(bookId: string): PriorityReview {
  const store = readStore();
  const v2 = store[bookId];
  if (v2) return normalize(v2);

  const legacy = readLegacy()[bookId];
  if (typeof legacy === "string" && legacy.trim()) {
    return normalize(undefined, legacy);
  }

  // Hydrate from Book record if neither v2 nor legacy has an entry.
  const book = getBook(bookId);
  if (book?.priorityReview) {
    const fromBook = normalize(book.priorityReview);
    if (hasContent(fromBook)) {
      store[bookId] = fromBook;
      writeStore(store);
      return fromBook;
    }
  }

  return empty();
}

export function setPriorityReview(
  bookId: string,
  patch: Partial<PriorityReview>,
): PriorityReview {
  const cur = getPriorityReview(bookId);
  const next: PriorityReview = {
    focusFirst: patch.focusFirst !== undefined ? patch.focusFirst : cur.focusFirst,
    openQuestions: patch.openQuestions !== undefined ? patch.openQuestions : cur.openQuestions,
    nonNegotiables: patch.nonNegotiables !== undefined ? patch.nonNegotiables : cur.nonNegotiables,
  };
  const store = readStore();
  store[bookId] = next;
  writeStore(store);
  mirrorToBook(bookId, next);
  return next;
}

export function freshPriorityReview(): PriorityReview {
  return empty();
}
