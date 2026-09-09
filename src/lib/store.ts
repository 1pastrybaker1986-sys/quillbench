import type { Book, BookExport, Session, TrimSize } from "./types";
import { SAMPLE_CHAPTER } from "./sampleManuscript";

const SESSION_KEY = "quillbench.session.v1";
const BOOKS_KEY = "quillbench.books.v1";

const DEMO_USER_ID = "user_demo";

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

export function getSession(): Session | null {
  return readJson<Session | null>(SESSION_KEY, null);
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
  ensureSeededLibrary(session.userId);
  return session;
}

export function signInDemo(): Session {
  const session: Session = {
    userId: DEMO_USER_ID,
    displayName: "Demo Writer",
    email: "writer@quillbench.demo",
    createdAt: now(),
  };
  writeJson(SESSION_KEY, session);
  ensureSeededLibrary(session.userId);
  return session;
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

function allBooks(): Book[] {
  return readJson<Book[]>(BOOKS_KEY, []);
}

function saveBooks(books: Book[]) {
  writeJson(BOOKS_KEY, books);
}

function seedDemoBooks(ownerId: string): Book[] {
  const t = now();
  return [
    {
      id: `book_${ownerId}_glass-harbor`,
      ownerId,
      title: "The Glass Harbor",
      status: "formatting",
      trim: "5.5x8.5",
      theme: "trade-paperback",
      coverSrc: "/covers/demo-placeholder.svg",
      coverPackNote: "Placeholder cover for the public demo — not a real title.",
      manuscriptText: SAMPLE_CHAPTER,
      authorName: "Demo Writer",
      copyrightYear: "2026",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: `book_${ownerId}_copper-thread`,
      ownerId,
      title: "Copper Thread",
      status: "draft",
      trim: "6x9",
      theme: "trade-paperback",
      coverSrc: "/covers/demo-placeholder-alt.svg",
      coverPackNote: "Placeholder cover for the public demo — not a real title.",
      manuscriptText: SAMPLE_CHAPTER,
      authorName: "Demo Writer",
      copyrightYear: "2026",
      createdAt: t,
      updatedAt: t,
    },
  ];
}

/** Personal bench seed — real titles/covers for email sign-in only, never demo. */
function seedWriterBooks(ownerId: string): Book[] {
  const t = now();
  return [
    {
      id: `book_${ownerId}_edens-fall`,
      ownerId,
      title: "Eden’s Fall",
      status: "formatting",
      trim: "5.5x8.5",
      theme: "trade-paperback",
      coverSrc: "/covers/edens-fall-front.png",
      coverPackNote:
        "Print pack already attached — front, back, 300 dpi, and combined PDF. Don’t rebuild.",
      manuscriptText: SAMPLE_CHAPTER,
      authorName: "Sarah Brundige",
      copyrightYear: "2026",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: `book_${ownerId}_night-orchard`,
      ownerId,
      title: "Night Orchard",
      status: "draft",
      trim: "6x9",
      theme: "trade-paperback",
      manuscriptText: SAMPLE_CHAPTER,
      createdAt: t,
      updatedAt: t,
    },
  ];
}

const DEMO_LEGACY_SUFFIXES = ["_edens-fall", "_night-orchard"];

/** Replace an older demo library that still showed real titles/covers. */
function migrateDemoLibraryIfNeeded(ownerId: string) {
  if (ownerId !== DEMO_USER_ID) return;
  const books = allBooks();
  const mine = books.filter((b) => b.ownerId === ownerId);
  if (mine.length === 0) return;
  const looksLegacy = mine.some(
    (b) =>
      DEMO_LEGACY_SUFFIXES.some((s) => b.id.endsWith(s)) ||
      b.coverSrc === "/covers/edens-fall-front.png" ||
      b.title === "Eden’s Fall" ||
      b.title === "Night Orchard" ||
      b.authorName === "Sarah Brundige",
  );
  if (!looksLegacy) return;
  const others = books.filter((b) => b.ownerId !== ownerId);
  saveBooks([...others, ...seedDemoBooks(ownerId)]);
}

function ensureSeededLibrary(ownerId: string) {
  migrateDemoLibraryIfNeeded(ownerId);
  const books = allBooks();
  if (books.some((b) => b.ownerId === ownerId)) return;
  const seed = ownerId === DEMO_USER_ID ? seedDemoBooks(ownerId) : seedWriterBooks(ownerId);
  saveBooks([...books, ...seed]);
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
  ensureSeededLibrary(ownerId);
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
