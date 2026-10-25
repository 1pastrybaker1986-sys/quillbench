/**
 * Four-pass editing board — per-book status + notes in localStorage.
 * Also mirrors onto the Book record in store (localStorage stays canonical).
 */

import { getBook, updateBook } from "./store";

export type PassId = "developmental" | "line" | "copy" | "proof";

export type PassStatus = "not-started" | "in-pass" | "review" | "locked";

export type PassDef = {
  id: PassId;
  label: string;
  purpose: string;
  /** One-line prompt shown on the gate note. */
  notePrompt: string;
};

export type PassState = {
  status: PassStatus;
  note: string;
};

export type BookPassMap = Record<PassId, PassState>;

const STORAGE_KEY = "quillbench.editingBoard.v1";

export const PASSES: PassDef[] = [
  {
    id: "developmental",
    label: "Developmental",
    purpose: "Plot, pacing, character, structure — story problems named and resolved or parked.",
    notePrompt: "Name the story problem first — saggy middle, unearned ending, missing want…",
  },
  {
    id: "line",
    label: "Line",
    purpose: "Sentence-level clarity, rhythm, imagery — prose reads as intended.",
    notePrompt: "Voice to protect, sentences that drag, images that don't earn their keep…",
  },
  {
    id: "copy",
    label: "Copy",
    purpose: "Continuity, names, timeline, facts, house style — internal consistency holds.",
    notePrompt: "Names, timeline, house-style calls — what must stay consistent…",
  },
  {
    id: "proof",
    label: "Proof",
    purpose: "Last-pass typos after layout — print/ebook proof is clean.",
    notePrompt: "Typos after layout — print vs ebook, running heads, last-page orphans…",
  },
];

export const STATUS_LABELS: Record<PassStatus, string> = {
  "not-started": "Not started",
  "in-pass": "In pass",
  review: "Review",
  locked: "Locked",
};

export const STATUS_OPTIONS: PassStatus[] = ["not-started", "in-pass", "review", "locked"];

function emptyPass(): PassState {
  return { status: "not-started", note: "" };
}

function emptyBoard(): BookPassMap {
  return {
    developmental: emptyPass(),
    line: emptyPass(),
    copy: emptyPass(),
    proof: emptyPass(),
  };
}

type BoardStore = Record<string, Partial<Record<PassId, Partial<PassState>>>>;

function readStore(): BoardStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as BoardStore;
  } catch {
    return {};
  }
}

function writeStore(store: BoardStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function normalizePass(raw: Partial<PassState> | undefined): PassState {
  const status = raw?.status;
  const ok =
    status === "not-started" ||
    status === "in-pass" ||
    status === "review" ||
    status === "locked";
  return {
    status: ok ? status : "not-started",
    note: typeof raw?.note === "string" ? raw.note : "",
  };
}

function normalizeBoard(raw: Partial<Record<PassId, Partial<PassState>>> | undefined): BookPassMap {
  return {
    developmental: normalizePass(raw?.developmental),
    line: normalizePass(raw?.line),
    copy: normalizePass(raw?.copy),
    proof: normalizePass(raw?.proof),
  };
}

function boardHasContent(board: BookPassMap): boolean {
  return (Object.keys(board) as PassId[]).some(
    (id) => board[id].status !== "not-started" || board[id].note.trim().length > 0,
  );
}

function mirrorToBook(bookId: string, board: BookPassMap): void {
  try {
    updateBook(bookId, { editingBoard: board });
  } catch {
    /* ignore — book may not exist yet */
  }
}

export function getBoard(bookId: string): BookPassMap {
  const store = readStore();
  if (store[bookId] != null) {
    return normalizeBoard(store[bookId]);
  }
  // Hydrate from Book record if localStorage has no entry yet (migration).
  const book = getBook(bookId);
  const fromBook = book?.editingBoard;
  if (fromBook) {
    const board = normalizeBoard(fromBook as Partial<Record<PassId, Partial<PassState>>>);
    if (boardHasContent(board)) {
      store[bookId] = board;
      writeStore(store);
      return board;
    }
  }
  return emptyBoard();
}

function writeBoard(bookId: string, board: BookPassMap): BookPassMap {
  const store = readStore();
  store[bookId] = board;
  writeStore(store);
  mirrorToBook(bookId, board);
  return board;
}

export function setPassStatus(bookId: string, passId: PassId, status: PassStatus): BookPassMap {
  const board = getBoard(bookId);
  board[passId] = { ...board[passId], status };
  return writeBoard(bookId, board);
}

export function setPassNote(bookId: string, passId: PassId, note: string): BookPassMap {
  const board = getBoard(bookId);
  board[passId] = { ...board[passId], note };
  return writeBoard(bookId, board);
}

export function savePass(
  bookId: string,
  passId: PassId,
  patch: { status?: PassStatus; note?: string },
): BookPassMap {
  const board = getBoard(bookId);
  board[passId] = {
    status: patch.status ?? board[passId].status,
    note: patch.note !== undefined ? patch.note : board[passId].note,
  };
  return writeBoard(bookId, board);
}

export function listPasses(): PassDef[] {
  return PASSES.slice();
}

/** Unused but keeps tree-shake happy for emptyBoard callers. */
export function freshBoard(): BookPassMap {
  return emptyBoard();
}
