/**
 * Netlify Identity + Blobs ManuscriptStore adapter (real client, Soft-FAIL gated).
 *
 * When VITE_CLOUD_SAVE=off the factory never selects this module for runtime use.
 * gotrue-js is never statically imported — only via identityGoTrue dynamic import
 * on the flag-on path.
 *
 * Soft-PASS path (dev flag ON only):
 * 1. Magic-link / passwordless via GoTrue (requestMagicLink + completeIdentityFromUrl).
 * 2. After JWT: Blobs JSON at owners/{identity.sub}/library.v0.json via Netlify Function.
 * 3. Payload = CloudSyncPayloadV0 (Book + manuscriptText + editingBoard + priorityReview).
 *
 * Demo mode stays LS-only even when the flag is on.
 */

import type { ManuscriptStore } from "./manuscriptStore";
import {
  createBook,
  getBook,
  getSession,
  listBooks,
  setTrim,
  signInDemo,
  signOut as localSignOut,
  updateBook,
  writeSession,
} from "./store";
import { isCloudSaveEnabled } from "./cloudSaveFlag";
import type { CloudSyncPayloadV0 } from "./cloudSyncPayload";
import { buildCloudSyncPayloadV0, migrateThisDeviceWip } from "./cloudSyncPayload";
import type { Session } from "./types";
import {
  completeIdentityFromUrl,
  getIdentityAccessToken,
  identitySignOut,
  requestMagicLink,
  sessionFromCurrentUser,
} from "./identityGoTrue";

export type CloudSaveOpResult =
  | { ok: true; mode: "local-fallback" | "pending" | "cloud"; message: string; payload?: CloudSyncPayloadV0 }
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

function cloudSaveFunctionUrl(): string {
  const fromEnv = (import.meta.env.VITE_CLOUD_SAVE_FUNCTION_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  return "/.netlify/functions/cloud-save-library";
}

/**
 * Magic-link Identity sign-in (passwordless).
 * Sends email via GoTrue; Session is created only after completeIdentityFromUrl / currentUser.
 */
export async function identityMagicLink(email: string): Promise<CloudSaveOpResult> {
  const blocked = assertFlagOn("identityMagicLink");
  if (blocked) return blocked;

  const result = await requestMagicLink(email);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, mode: "pending", message: result.message };
}

/** @deprecated alias — kept for STATUS / callers that still say sketch* */
export const sketchIdentityMagicLink = identityMagicLink;

/**
 * Pull library JSON from Netlify Blobs via Function (Identity JWT required).
 */
export async function blobsPull(_session: Session): Promise<CloudSaveOpResult> {
  const blocked = assertFlagOn("blobsPull");
  if (blocked) return blocked;
  void _session;

  let token: string | null;
  try {
    token = await getIdentityAccessToken();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
  if (!token) {
    return {
      ok: false,
      message: "Blobs pull: no Identity JWT. Complete magic-link login first (Identity not Live until Soft-PASS).",
    };
  }

  try {
    const res = await fetch(cloudSaveFunctionUrl(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      payload?: CloudSyncPayloadV0 | null;
      message?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        message:
          body.error ||
          `Blobs pull failed (${res.status}). Function/Identity/Blobs may be unavailable on this preview.`,
      };
    }
    return {
      ok: true,
      mode: "cloud",
      message: body.message || "Blobs pull ok.",
      payload: body.payload ?? undefined,
    };
  } catch (e) {
    return {
      ok: false,
      message: `Blobs pull network error: ${e instanceof Error ? e.message : String(e)}. Use netlify dev / a deploy with Identity+Blobs.`,
    };
  }
}

export const sketchBlobsPull = blobsPull;

/**
 * Push v0 payload to Blobs via Function (first sign-in migrate or debounce save).
 */
export async function blobsPush(session: Session): Promise<CloudSaveOpResult> {
  const blocked = assertFlagOn("blobsPush");
  if (blocked) return blocked;

  const migrate = await migrateThisDeviceWip(session);
  if (migrate.status === "ok") {
    return { ok: true, mode: "cloud", message: migrate.message };
  }
  if (migrate.status === "error") {
    return { ok: false, message: migrate.message };
  }
  // not-enabled (and any other status)
  return { ok: false, message: migrate.message };
}

export const sketchBlobsPush = blobsPush;

/** Low-level PUT used by migrateThisDeviceWip. */
export async function pushCloudSyncPayload(
  session: Session,
  payload: CloudSyncPayloadV0,
): Promise<CloudSaveOpResult> {
  const blocked = assertFlagOn("pushCloudSyncPayload");
  if (blocked) return blocked;

  let token: string | null;
  try {
    token = await getIdentityAccessToken();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
  if (!token) {
    return {
      ok: false,
      message:
        "Blobs push: no Identity JWT. Complete magic-link login first. Identity is not enabled in production.",
    };
  }

  try {
    const res = await fetch(cloudSaveFunctionUrl(), {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ payload }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!res.ok) {
      return {
        ok: false,
        message:
          body.error ||
          `Blobs push failed (${res.status}). Ensure Identity + Blobs store env on the site (not Live Soft-FAIL).`,
      };
    }
    return {
      ok: true,
      mode: "cloud",
      message: body.message || `Uploaded ${payload.books.length} book(s) for ${session.email}.`,
      payload,
    };
  } catch (e) {
    return {
      ok: false,
      message: `Blobs push network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * After magic-link return: finish Identity handshake, write Session, migrate WIP.
 */
export async function finishIdentityLoginAndMigrate(): Promise<{
  session: Session | null;
  migrateMessage?: string;
}> {
  if (!isCloudSaveEnabled()) return { session: getSession() };
  const session = (await completeIdentityFromUrl()) ?? (await sessionFromCurrentUser());
  if (!session || session.userId === "user_demo") {
    return { session };
  }
  const migrate = await migrateThisDeviceWip(session);
  return { session, migrateMessage: migrate.message };
}

/**
 * Cloud ManuscriptStore: when selected (flag ON), session/CRUD still use LS so Scan/Write/Editing
 * keep working. Cloud ops go through Identity + Function (flag-on only).
 */
export const netlifyCloudManuscriptStore: ManuscriptStore = {
  id: "netlify-identity-blobs",

  getSession,
  signInDemo, // public bench demo stays local-only even when flag is on
  async signOut() {
    await identitySignOut();
  },

  async signInWithEmail(email: string) {
    const link = await identityMagicLink(email);
    if (!link.ok) {
      throw new Error(link.message);
    }
    // Magic link pending — no Session yet. Callers (Landing) should show link.message.
    // If GoTrue already has a current user (rare), map it.
    const existing = await sessionFromCurrentUser();
    if (existing && existing.email === email.trim().toLowerCase()) {
      void migrateThisDeviceWip(existing);
      return existing;
    }
    // Return a non-persisted placeholder is unsafe; rethrow as pending for Landing to catch.
    const pending = new Error(link.message) as Error & { code?: string };
    pending.code = "IDENTITY_MAGIC_LINK_PENDING";
    throw pending;
  },

  listBooks,
  getBook,
  createBook,
  updateBook,
  setTrim,
};

// Re-export for App boot — keep writeSession available if needed
export { writeSession, buildCloudSyncPayloadV0, localSignOut };
