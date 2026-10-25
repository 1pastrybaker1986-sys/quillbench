/**
 * Account-menu JSON backup / restore for Works in Progress ($0 interim while Cloud Save is off).
 * Device/file only — does not call Identity or Blobs.
 */

import type { Book, Session } from "./types";
import { getBook, listBooks, updateBook } from "./store";
import { getBoard, setPassStatus, setPassNote, type PassId } from "./editingBoard";
import { getPriorityReview, setPriorityReview } from "./priorityReview";

export const WIP_BACKUP_KIND = "quillbench.wip-backup.v1" as const;

export type WipBackupV1 = {
  version: 1;
  kind: typeof WIP_BACKUP_KIND;
  exportedAt: string;
  ownerId: string;
  email?: string;
  displayName?: string;
  books: Book[];
  /** Satellite maps keyed by book id (subset for this owner). */
  editingBoard: Record<string, ReturnType<typeof getBoard>>;
  priorityReview: Record<string, ReturnType<typeof getPriorityReview>>;
};

export function buildWipBackup(session: Session): WipBackupV1 {
  const books = listBooks(session.userId);
  const editingBoard: WipBackupV1["editingBoard"] = {};
  const priorityReview: WipBackupV1["priorityReview"] = {};

  for (const b of books) {
    editingBoard[b.id] = getBoard(b.id);
    priorityReview[b.id] = getPriorityReview(b.id);
  }

  return {
    version: 1,
    kind: WIP_BACKUP_KIND,
    exportedAt: new Date().toISOString(),
    ownerId: session.userId,
    email: session.email,
    displayName: session.displayName,
    books,
    editingBoard,
    priorityReview,
  };
}

export function downloadWipBackup(session: Session): { filename: string; bookCount: number } {
  const backup = buildWipBackup(session);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = backup.exportedAt.slice(0, 10);
  const filename = `quillbench-wip-backup-${stamp}.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { filename, bookCount: backup.books.length };
}

export type RestoreWipResult =
  | { ok: true; restored: number; message: string }
  | { ok: false; message: string };

function isPassId(id: string): id is PassId {
  return id === "developmental" || id === "line" || id === "copy" || id === "proof";
}

/**
 * Merge backup books into localStorage for the current session owner.
 * Re-keys ownerId to the live session so email-local accounts stay consistent.
 */
export function restoreWipBackup(session: Session, raw: unknown): RestoreWipResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, message: "Not a valid Quillbench backup file." };
  }
  const data = raw as Partial<WipBackupV1>;
  if (data.kind !== WIP_BACKUP_KIND || data.version !== 1 || !Array.isArray(data.books)) {
    return { ok: false, message: "Unsupported backup format (need quillbench.wip-backup.v1)." };
  }

  let restored = 0;
  for (const incoming of data.books) {
    if (!incoming || typeof incoming !== "object" || typeof incoming.id !== "string") continue;

    const existing = getBook(incoming.id);
    const next: Book = {
      ...incoming,
      ownerId: session.userId,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      updateBook(incoming.id, {
        trim: next.trim,
        title: next.title,
        status: next.status,
        manuscriptText: next.manuscriptText,
        authorName: next.authorName,
        subtitle: next.subtitle,
        dedication: next.dedication,
        copyrightYear: next.copyrightYear,
        publisherLine: next.publisherLine,
        coverSrc: next.coverSrc,
        coverPackNote: next.coverPackNote,
        exports: next.exports,
        editingBoard: next.editingBoard,
        priorityReview: next.priorityReview,
      });
    } else {
      // Insert via updateBook path: write through listBooks + create-like merge
      // Use createBook then patch to keep store invariants, or direct update after inject.
      // Prefer: createBook then overwrite fields via updateBook with same id is awkward.
      // Direct: updateBook only works for existing — so inject by updating store via create + replace.
      injectBook(next);
    }

    const board = data.editingBoard?.[incoming.id];
    if (board) {
      for (const key of Object.keys(board)) {
        if (!isPassId(key)) continue;
        const pass = board[key];
        if (pass?.status) setPassStatus(incoming.id, key, pass.status);
        if (typeof pass?.note === "string") setPassNote(incoming.id, key, pass.note);
      }
    }

    const pr = data.priorityReview?.[incoming.id];
    if (pr) {
      setPriorityReview(incoming.id, pr);
    }

    restored += 1;
  }

  return {
    ok: true,
    restored,
    message: `Restored ${restored} book${restored === 1 ? "" : "s"} into Works in Progress on this device.`,
  };
}

/** Insert a book record that is not yet in LS (restore of a new id). */
function injectBook(book: Book): void {
  const key = "quillbench.books.v1";
  try {
    const raw = localStorage.getItem(key);
    const books: Book[] = raw ? (JSON.parse(raw) as Book[]) : [];
    if (!Array.isArray(books)) return;
    if (books.some((b) => b.id === book.id)) {
      const idx = books.findIndex((b) => b.id === book.id);
      books[idx] = book;
    } else {
      books.push(book);
    }
    localStorage.setItem(key, JSON.stringify(books));
  } catch {
    /* ignore quota / parse */
  }
}

export async function pickAndRestoreWipBackup(session: Session): Promise<RestoreWipResult> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve({ ok: false, message: "No file selected." });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result)) as unknown;
          resolve(restoreWipBackup(session, parsed));
        } catch {
          resolve({ ok: false, message: "Could not read that JSON backup." });
        }
      };
      reader.onerror = () => resolve({ ok: false, message: "Could not read that file." });
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
  });
}
