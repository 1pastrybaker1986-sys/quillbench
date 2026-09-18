/**
 * v0 Cloud Save sync payload + migrate-this-device WIP.
 * Soft-FAIL: used by the Netlify Identity + Blobs adapter; LS remains default when flag off.
 */

import type { Book, Session } from "./types";
import { isLocalOnlyUserId, listBooks } from "./store";
import { getBoard } from "./editingBoard";
import { getPriorityReview } from "./priorityReview";
import { isCloudSaveEnabled } from "./cloudSaveFlag";

/** Fields that sync in Cloud Save v0 (Soft-PASS contract). */
export type CloudBookV0 = Pick<
  Book,
  | "id"
  | "ownerId"
  | "title"
  | "status"
  | "trim"
  | "theme"
  | "manuscriptText"
  | "authorName"
  | "subtitle"
  | "dedication"
  | "copyrightYear"
  | "publisherLine"
  | "coverSrc"
  | "coverPackNote"
  | "editingBoard"
  | "priorityReview"
  | "createdAt"
  | "updatedAt"
>;

export type CloudSyncPayloadV0 = {
  version: 0;
  kind: "quillbench.cloud.v0";
  exportedAt: string;
  session: Pick<Session, "userId" | "displayName" | "email">;
  books: CloudBookV0[];
};

export type MigrateThisDeviceResult =
  | { status: "not-enabled"; message: string }
  | { status: "ok"; uploaded: number; message: string }
  | { status: "error"; message: string };

/**
 * Build the v0 payload from this device's localStorage books for `ownerId`.
 * Ensures editingBoard + priorityReview mirrors are present on each book.
 */
export function buildCloudSyncPayloadV0(
  session: Pick<Session, "userId" | "displayName" | "email">,
): CloudSyncPayloadV0 {
  const books = listBooks(session.userId).map((b): CloudBookV0 => {
    const board = getBoard(b.id);
    const priority = getPriorityReview(b.id);
    return {
      id: b.id,
      ownerId: b.ownerId,
      title: b.title,
      status: b.status,
      trim: b.trim,
      theme: b.theme,
      manuscriptText: b.manuscriptText,
      authorName: b.authorName,
      subtitle: b.subtitle,
      dedication: b.dedication,
      copyrightYear: b.copyrightYear,
      publisherLine: b.publisherLine,
      coverSrc: b.coverSrc,
      coverPackNote: b.coverPackNote,
      editingBoard: board,
      priorityReview: priority,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  });

  return {
    version: 0,
    kind: "quillbench.cloud.v0",
    exportedAt: new Date().toISOString(),
    session: {
      userId: session.userId,
      displayName: session.displayName,
      email: session.email,
    },
    books,
  };
}

/**
 * migrate-this-device WIP — first real sign-in upload of current LS books for that owner.
 *
 * Soft-FAIL behavior:
 * - Flag off → never touches Identity/Blobs; returns not-enabled.
 * - Flag on → builds payload and PUT via Netlify Function (requires Identity JWT).
 *
 * Call after Netlify Identity confirms a real user (not local-only guest). Local sessions stay device-only.
 */
export async function migrateThisDeviceWip(
  session: Pick<Session, "userId" | "displayName" | "email">,
  opts?: { isDemo?: boolean },
): Promise<MigrateThisDeviceResult> {
  if (opts?.isDemo || isLocalOnlyUserId(session.userId)) {
    return {
      status: "not-enabled",
      message: "Local sessions stay on this device — migrate-this-device skipped.",
    };
  }

  if (!isCloudSaveEnabled()) {
    return {
      status: "not-enabled",
      message:
        "VITE_CLOUD_SAVE is off. Turn on locally to exercise migrate-this-device; Identity is not enabled in production.",
    };
  }

  const payload = buildCloudSyncPayloadV0(session);

  // Dynamic import avoids circular dependency with netlifyCloudSave.ts
  try {
    const { pushCloudSyncPayload } = await import("./netlifyCloudSave");
    const result = await pushCloudSyncPayload(session as Session, payload);
    if (!result.ok) {
      return { status: "error", message: result.message };
    }
    return {
      status: "ok",
      uploaded: payload.books.length,
      message: result.message,
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
