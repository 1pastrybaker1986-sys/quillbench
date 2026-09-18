/**
 * Netlify Identity + Blobs ManuscriptStore adapter (Soft-FAIL sketch).
 *
 * When VITE_CLOUD_SAVE=off the factory never selects this module for runtime use.
 * This file has no import-time side effects and does not load Identity/Blobs SDKs.
 *
 * Soft-PASS path (dev flag ON only):
 * 1. Magic-link / passwordless via Netlify Identity (GoTrue) — demo mode stays LS-only.
 * 2. After JWT: Blobs JSON at `owners/{identity.sub}/library.v0.json` (via Function or Blobs API).
 * 3. Payload = CloudSyncPayloadV0 (Book + manuscriptText + editingBoard + priorityReview).
 *
 * STUB vs REAL:
 * - STUB: session/list/update fall through to localStorage; cloud pull/push return stub messages.
 * - REAL (blocked): Identity widget + Blobs PUT/GET — requires Identity enabled (NOT in production yet).
 */

import type { ManuscriptStore } from "./manuscriptStore";
import {
  createBook,
  getBook,
  getSession,
  listBooks,
  setTrim,
  signInDemo,
  signInWithEmail,
  signOut,
  updateBook,
} from "./store";
import { isCloudSaveEnabled } from "./cloudSaveFlag";
import type { CloudSyncPayloadV0 } from "./cloudSyncPayload";
import { buildCloudSyncPayloadV0, migrateThisDeviceWip } from "./cloudSyncPayload";
import type { Session } from "./types";

export type CloudSaveOpResult =
  | { ok: true; mode: "local-fallback" | "stub" | "cloud"; message: string; payload?: CloudSyncPayloadV0 }
  | { ok: false; message: string };

function assertFlagOn(op: string): CloudSaveOpResult | null {
  if (!isCloudSaveEnabled()) {
    return {
      ok: false,
      message: `${op}: VITE_CLOUD_SAVE is off — Identity/Blobs must not be called.`,
    };
  }
  return null;
}

/**
 * Sketch: magic-link Identity sign-in.
 * STUB — returns local email session so the bench keeps working; does not open Identity widget.
 * When Soft-PASSed: load netlify-identity-widget (or gotrue-js), open({ show: 'login' }), map user → Session.
 */
export async function sketchIdentityMagicLink(email: string): Promise<CloudSaveOpResult> {
  const blocked = assertFlagOn("sketchIdentityMagicLink");
  if (blocked) return blocked;

  // Local fallback so flag-on local builds still work without Identity enabled.
  signInWithEmail(email);
  return {
    ok: true,
    mode: "stub",
    message:
      "Identity magic-link stub: local session written. Wire netlify-identity-widget after Soft-PASS; do not enable Identity in production yet.",
  };
}

/**
 * Sketch: pull library JSON from Netlify Blobs for the signed-in owner.
 * STUB — does not network; returns local payload snapshot.
 */
export async function sketchBlobsPull(session: Session): Promise<CloudSaveOpResult> {
  const blocked = assertFlagOn("sketchBlobsPull");
  if (blocked) return blocked;

  const payload = buildCloudSyncPayloadV0(session);
  return {
    ok: true,
    mode: "stub",
    message:
      "Blobs pull stub: no network. Real path = GET owners/{sub}/library.v0.json after Identity JWT.",
    payload,
  };
}

/**
 * Sketch: push v0 payload to Blobs (first sign-in migrate or debounce save).
 * STUB — builds payload only.
 */
export async function sketchBlobsPush(session: Session): Promise<CloudSaveOpResult> {
  const blocked = assertFlagOn("sketchBlobsPush");
  if (blocked) return blocked;

  const migrate = await migrateThisDeviceWip(session);
  if (migrate.status === "stub") {
    return {
      ok: true,
      mode: "stub",
      message: migrate.message,
      payload: migrate.payload,
    };
  }
  if (migrate.status === "ok") {
    return { ok: true, mode: "cloud", message: migrate.message };
  }
  return { ok: false, message: migrate.message };
}

/**
 * Cloud ManuscriptStore: when selected (flag ON), session/CRUD still use LS so Scan/Write/Editing
 * keep working. Cloud ops are explicit sketch* helpers + migrateThisDeviceWip — not silent network.
 */
export const netlifyCloudManuscriptStore: ManuscriptStore = {
  id: "netlify-identity-blobs",

  getSession,
  signInDemo, // public bench demo stays local-only even when flag is on
  signOut,

  async signInWithEmail(email: string) {
    await sketchIdentityMagicLink(email);
    const session = getSession();
    if (!session) {
      // Should not happen — sketch writes LS session
      return signInWithEmail(email);
    }
    // Kick migrate-this-device WIP (stub upload) — non-demo only
    void migrateThisDeviceWip(session);
    return session;
  },

  listBooks,
  getBook,
  createBook,
  updateBook,
  setTrim,
};
