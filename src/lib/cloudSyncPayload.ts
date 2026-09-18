/**
 * v0 Cloud Save sync payload + migrate-this-device WIP.
 * Soft-FAIL: used by the Netlify Identity + Blobs adapter sketch; LS remains default.
 */

import type { Book, Session } from "./types";
import { listBooks } from "./store";
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
  | { status: "stub"; message: string; payload: CloudSyncPayloadV0 }
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
 * - Flag on → builds payload and returns stub (real Blobs PUT lands after Soft-PASS + Identity enabled).
 *
 * Call after Netlify Identity confirms a real user (not demo). Demo mode stays local-only.
 */
export async function migrateThisDeviceWip(
  session: Pick<Session, "userId" | "displayName" | "email">,
  opts?: { isDemo?: boolean },
): Promise<MigrateThisDeviceResult> {
  if (opts?.isDemo || session.userId === "user_demo") {
    return {
      status: "not-enabled",
      message: "Demo mode stays on this device — migrate-this-device skipped.",
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

  // Stub: real path = Identity JWT → Netlify Function → Blobs key `owners/{sub}/library.v0.json`
  return {
    status: "stub",
    message:
      "Cloud Save flag ON — payload built. Blobs upload is stubbed until Identity is Soft-PASSed and enabled (not Live).",
    payload,
  };
}
