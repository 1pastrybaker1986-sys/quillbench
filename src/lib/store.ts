import type { Book, BookExport, Session, TrimSize } from "./types";
import { SAMPLE_CHAPTER } from "./sampleManuscript";

const SESSION_KEY = "quillbench.session.v1";
const BOOKS_KEY = "quillbench.books.v1";

/** Local-only bench identity (not labeled Demo). Legacy `user_demo` still recognized. */
export const LOCAL_USER_ID = "user_local";
const LEGACY_DEMO_USER_ID = "user_demo";

const TOUR_SEED_SUFFIXES = [
  "_glass-harbor",
  "_copper-thread",
  "_edens-fall",
  "_night-orchard",
];

const TOUR_SEED_TITLES = new Set([
  "The Glass Harbor",
  "Copper Thread",
  "Eden’s Fall",
  "Eden's Fall",
  "Night Orchard",
]);

export type BookPatch = Partial<
  Pick<
    Book,
    | "trim"
    | "title"
    | "status"
    | "manuscriptText"
    | "authorName"
    | "subtitle"
    | "dedication"
    | "copyrightYear"
    | "publisherLine"
    | "coverSrc"
    | "coverPackNote"
    | "exports"
    | "editingBoard"
    | "priorityReview"
  >
>;

function now() {
  return new Date().toISOString();
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** True for device-only guest sessions (never Cloud Save migrate). */
export function isLocalOnlyUserId(userId: string): boolean {
  return userId === LOCAL_USER_ID || userId === LEGACY_DEMO_USER_ID;
}

export function getSession(): Session | null {
  const session = readJson<Session | null>(SESSION_KEY, null);
  if (!session) return null;
  return normalizeSessionIdentity(session);
}

/**
 * Rewrite legacy "Demo Writer" / user_demo chrome into a quiet local Writer session.
 * Purges tour seed books so first-run / returning demo users see an honest empty bench.
 */
function normalizeSessionIdentity(session: Session): Session {
  const isLegacyDemo =
    session.userId === LEGACY_DEMO_USER_ID ||
    session.displayName === "Demo Writer" ||
    (session.email || "").endsWith(".demo") ||
    session.email === "writer@quillbench.demo";

  if (!isLegacyDemo) {
    return session;
  }

  const fromId = session.userId;
  const next: Session = {
    ...session,
    userId: LOCAL_USER_ID,
    displayName:
      session.displayName === "Demo Writer" || !session.displayName.trim()
        ? "Writer"
        : session.displayName,
    email:
      !session.email ||
      session.email.endsWith(".demo") ||
      session.email === "writer@quillbench.demo"
        ? ""
        : session.email,
  };

  if (fromId !== LOCAL_USER_ID) {
    reassignLocalWipOwner(fromId, LOCAL_USER_ID);
  }
  purgeTourSeedBooks(LOCAL_USER_ID);
  writeJson(SESSION_KEY, next);
  return next;
}

/** Persist a Session verbatim (Identity sub as userId, etc.). No library seed. */
export function writeSession(session: Session): Session {
  writeJson(SESSION_KEY, session);
  return session;
}

export function signInWithEmail(email: string): Session {
  const trimmed = email.trim().toLowerCase();
  const local = trimmed.split("@")[0] || "writer";
  const displayName = local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const session: Session = {
    userId: `user_${trimmed}`,
    displayName,
    email: trimmed,
    createdAt: now(),
  };
  writeJson(SESSION_KEY, session);
  return session;
}

/**
 * Start (or resume) a quiet local bench session — empty Works in Progress until the writer creates.
 * Replaces the old "Demo Writer" / Continue-as-demo path.
 */
export function startLocalSession(): Session {
  const existing = getSession();
  if (existing && isLocalOnlyUserId(existing.userId)) {
    return existing;
  }
  const session: Session = {
    userId: LOCAL_USER_ID,
    displayName: "Writer",
    email: "",
    createdAt: now(),
  };
  writeJson(SESSION_KEY, session);
  return session;
}

/** @deprecated Use startLocalSession — kept so ManuscriptStore / older imports resolve. */
export function signInDemo(): Session {
  return startLocalSession();
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Remap this-device WIP from legacy local owner `user_${email}` onto Identity sub
 * so migrate-this-device uploads real manuscript rows after magic-link login.
 * No-op if destination already has books or source is empty.
 */
export function reassignLocalWipOwner(fromOwnerId: string, toOwnerId: string): number {
  if (!fromOwnerId || !toOwnerId || fromOwnerId === toOwnerId) return 0;
  const books = allBooks();
  let n = 0;
  const next = books.map((b) => {
    if (b.ownerId !== fromOwnerId) return b;
    n += 1;
    return { ...b, ownerId: toOwnerId, updatedAt: now() };
  });
  if (n > 0) saveBooks(next);
  return n;
}

function allBooks(): Book[] {
  return readJson<Book[]>(BOOKS_KEY, []);
}

function saveBooks(books: Book[]) {
  writeJson(BOOKS_KEY, books);
}

function isTourSeedBook(book: Book): boolean {
  if (TOUR_SEED_SUFFIXES.some((s) => book.id.endsWith(s))) return true;
  if (TOUR_SEED_TITLES.has(book.title)) return true;
  if (
    book.coverSrc === "/covers/demo-placeholder.svg" ||
    book.coverSrc === "/covers/demo-placeholder-alt.svg" ||
    book.coverSrc === "/covers/rose-metal-still.svg" ||
    book.coverSrc === "/covers/rose-metal-still-alt.svg" ||
    book.coverSrc === "/covers/edens-fall-front.png"
  ) {
    return true;
  }
  if (book.authorName === "Demo Writer") return true;
  if (book.coverPackNote?.toLowerCase().includes("demo shelf")) return true;
  return false;
}

/** Drop tour / sandbox seed manuscripts so WIP is empty until the writer creates. */
function purgeTourSeedBooks(ownerId: string) {
  const books = allBooks();
  const kept = books.filter((b) => !(b.ownerId === ownerId && isTourSeedBook(b)));
  if (kept.length !== books.length) saveBooks(kept);
}

const WRITER_COVER_NOTE =
  "Print pack already attached — front, back, 300 dpi, and combined PDF. Don’t rebuild.";

function sanitizeBook(book: Book): Book {
  let next = { ...book };
  let changed = false;
  if (next.coverPackNote && next.coverPackNote.includes("/workspace/")) {
    next.coverPackNote = WRITER_COVER_NOTE;
    changed = true;
  }
  const isEdens = next.id.endsWith("_edens-fall");
  const isNight = next.id.endsWith("_night-orchard");
  if ((isEdens || isNight) && next.manuscriptText === undefined) {
    next.manuscriptText = SAMPLE_CHAPTER;
    changed = true;
  }
  // Backfill only when the field was never set (undefined). Empty string means the writer cleared it.
  if (isEdens && next.authorName === undefined) {
    next.authorName = "Sarah Brundige";
    changed = true;
  }
  if (isEdens && next.copyrightYear === undefined) {
    next.copyrightYear = "2026";
    changed = true;
  }
  if (!changed) return book;
  next.updatedAt = now();
  const books = allBooks();
  const idx = books.findIndex((b) => b.id === book.id);
  if (idx >= 0) {
    books[idx] = next;
    saveBooks(books);
  }
  return next;
}

export function listBooks(ownerId: string): Book[] {
  if (isLocalOnlyUserId(ownerId) || ownerId === LOCAL_USER_ID) {
    purgeTourSeedBooks(ownerId);
    if (ownerId === LEGACY_DEMO_USER_ID) purgeTourSeedBooks(LOCAL_USER_ID);
  }
  return allBooks()
    .filter((b) => b.ownerId === ownerId)
    .map(sanitizeBook)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getBook(id: string): Book | undefined {
  const book = allBooks().find((b) => b.id === id);
  return book ? sanitizeBook(book) : undefined;
}

export function createBook(ownerId: string, title: string): Book {
  const t = now();
  const book: Book = {
    id: `book_${crypto.randomUUID()}`,
    ownerId,
    title: title.trim() || "Untitled manuscript",
    status: "draft",
    trim: "5.5x8.5",
    theme: "trade-paperback",
    createdAt: t,
    updatedAt: t,
  };
  saveBooks([...allBooks(), book]);
  return book;
}

export function updateBook(id: string, patch: BookPatch): Book | undefined {
  const books = allBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx < 0) return undefined;
  const next: Book = { ...books[idx], ...patch, updatedAt: now() };
  if ("coverSrc" in patch && !patch.coverSrc) delete next.coverSrc;
  if ("coverPackNote" in patch && !patch.coverPackNote) delete next.coverPackNote;
  books[idx] = next;
  saveBooks(books);
  return next;
}

export function setTrim(id: string, trim: TrimSize): Book | undefined {
  return updateBook(id, { trim });
}

export function recordExport(
  id: string,
  entry: { kind: BookExport["kind"]; filename: string; sizeBytes?: number },
): Book | undefined {
  const books = allBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx < 0) return undefined;
  const rec: BookExport = {
    id: `exp_${crypto.randomUUID()}`,
    kind: entry.kind,
    filename: entry.filename,
    createdAt: now(),
    ...(entry.sizeBytes != null ? { sizeBytes: entry.sizeBytes } : {}),
  };
  const exports = [rec, ...(books[idx].exports ?? [])].slice(0, 10);
  const next: Book = { ...books[idx], exports, updatedAt: now() };
  books[idx] = next;
  saveBooks(books);
  return next;
}
