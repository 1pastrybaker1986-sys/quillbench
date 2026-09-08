/**
 * Full Edit payoff — priority review notes per book (localStorage).
 */

const STORAGE_KEY = "quillbench.priorityReview.v1";

type Store = Record<string, string>;

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

export function getPriorityReview(bookId: string): string {
  return readStore()[bookId] ?? "";
}

export function setPriorityReview(bookId: string, notes: string): string {
  const store = readStore();
  store[bookId] = notes;
  writeStore(store);
  return notes;
}
