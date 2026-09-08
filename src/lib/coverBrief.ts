/**
 * Cover Design payoff — brief + deliverable checklist per book (localStorage).
 */

export type CoverTrimPref = "" | "5.5x8.5" | "6x9" | "other";

export type CoverDeliverable = "front" | "back" | "ebook";

export type CoverBrief = {
  trimPref: CoverTrimPref;
  moodNotes: string;
  mustHave: string;
  deliverables: Record<CoverDeliverable, boolean>;
};

const STORAGE_KEY = "quillbench.coverBrief.v1";

type Store = Record<string, Partial<CoverBrief>>;

function emptyBrief(): CoverBrief {
  return {
    trimPref: "",
    moodNotes: "",
    mustHave: "",
    deliverables: { front: false, back: false, ebook: false },
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

export function getCoverBrief(bookId: string): CoverBrief {
  const base = emptyBrief();
  const raw = readStore()[bookId] ?? {};
  const d = raw.deliverables;
  return {
    trimPref: (raw.trimPref as CoverTrimPref) ?? base.trimPref,
    moodNotes: typeof raw.moodNotes === "string" ? raw.moodNotes : base.moodNotes,
    mustHave: typeof raw.mustHave === "string" ? raw.mustHave : base.mustHave,
    deliverables: {
      front: !!(d && d.front),
      back: !!(d && d.back),
      ebook: !!(d && d.ebook),
    },
  };
}

export function setCoverBrief(bookId: string, patch: Partial<CoverBrief>): CoverBrief {
  const cur = getCoverBrief(bookId);
  const next: CoverBrief = {
    ...cur,
    ...patch,
    deliverables: patch.deliverables
      ? { ...cur.deliverables, ...patch.deliverables }
      : cur.deliverables,
  };
  const store = readStore();
  store[bookId] = next;
  writeStore(store);
  return next;
}

export function setCoverDeliverable(
  bookId: string,
  id: CoverDeliverable,
  done: boolean,
): CoverBrief {
  const cur = getCoverBrief(bookId);
  return setCoverBrief(bookId, {
    deliverables: { ...cur.deliverables, [id]: done },
  });
}
