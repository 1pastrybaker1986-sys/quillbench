/**
 * Four-pass editing board — per-book status + notes in localStorage.
 */

export type PassId = "developmental" | "line" | "copy" | "proof";

export type PassStatus = "not-started" | "in-pass" | "review" | "locked";

export type PassDef = {
  id: PassId;
  label: string;
  purpose: string;
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
  },
  {
    id: "line",
    label: "Line",
    purpose: "Sentence-level clarity, rhythm, imagery — prose reads as intended.",
  },
  {
    id: "copy",
    label: "Copy",
    purpose: "Continuity, names, timeline, facts, house style — internal consistency holds.",
  },
  {
    id: "proof",
    label: "Proof",
    purpose: "Last-pass typos after layout — print/ebook proof is clean.",
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

export function getBoard(bookId: string): BookPassMap {
  const store = readStore();
  const book = store[bookId] ?? {};
  return {
    developmental: normalizePass(book.developmental),
    line: normalizePass(book.line),
    copy: normalizePass(book.copy),
    proof: normalizePass(book.proof),
  };
}

export function setPassStatus(bookId: string, passId: PassId, status: PassStatus): BookPassMap {
  const store = readStore();
  const board = getBoard(bookId);
  board[passId] = { ...board[passId], status };
  store[bookId] = board;
  writeStore(store);
  return board;
}

export function setPassNote(bookId: string, passId: PassId, note: string): BookPassMap {
  const store = readStore();
  const board = getBoard(bookId);
  board[passId] = { ...board[passId], note };
  store[bookId] = board;
  writeStore(store);
  return board;
}

export function savePass(
  bookId: string,
  passId: PassId,
  patch: { status?: PassStatus; note?: string },
): BookPassMap {
  const store = readStore();
  const board = getBoard(bookId);
  board[passId] = {
    status: patch.status ?? board[passId].status,
    note: patch.note !== undefined ? patch.note : board[passId].note,
  };
  store[bookId] = board;
  writeStore(store);
  return board;
}

export function listPasses(): PassDef[] {
  return PASSES.slice();
}

/** Unused but keeps tree-shake happy for emptyBoard callers. */
export function freshBoard(): BookPassMap {
  return emptyBoard();
}
