/**
 * Per-book KDP / Ingram distribution checklist — localStorage stub.
 */

export type ChecklistId = "kdp-paperback" | "kdp-ebook" | "ingram";

export type ChecklistItem = {
  id: ChecklistId;
  label: string;
  hint: string;
  optional?: boolean;
};

export type ChecklistState = Record<ChecklistId, boolean>;

const STORAGE_KEY = "quillbench.publishChecklist.v1";

export const CHECKLIST: ChecklistItem[] = [
  {
    id: "kdp-paperback",
    label: "KDP paperback",
    hint: "Trim, interior PDF, cover, price, and territories ready for CreateSpace/KDP print.",
  },
  {
    id: "kdp-ebook",
    label: "KDP ebook",
    hint: "EPUB or KPF, cover image, blurb, keywords, and categories set.",
  },
  {
    id: "ingram",
    label: "Ingram",
    hint: "Wide print distribution — ISBN, wholesale discount, and returnability as needed.",
    optional: true,
  },
];

type Store = Record<string, Partial<ChecklistState>>;

function empty(): ChecklistState {
  return {
    "kdp-paperback": false,
    "kdp-ebook": false,
    ingram: false,
  };
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
    /* ignore */
  }
}

export function getChecklist(bookId: string): ChecklistState {
  const store = readStore();
  const raw = store[bookId] ?? {};
  return {
    "kdp-paperback": !!raw["kdp-paperback"],
    "kdp-ebook": !!raw["kdp-ebook"],
    ingram: !!raw.ingram,
  };
}

export function setChecklistItem(
  bookId: string,
  id: ChecklistId,
  done: boolean,
): ChecklistState {
  const store = readStore();
  const next = { ...getChecklist(bookId), [id]: done };
  store[bookId] = next;
  writeStore(store);
  return next;
}

export function listChecklist(): ChecklistItem[] {
  return CHECKLIST.slice();
}

export function freshChecklist(): ChecklistState {
  return empty();
}
