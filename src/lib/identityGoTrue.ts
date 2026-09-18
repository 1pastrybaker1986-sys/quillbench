/**
 * Netlify Identity (GoTrue) magic-link / passwordless client.
 *
 * CRITICAL: gotrue-js is loaded only via dynamic import, and only after
 * isCloudSaveEnabled() is true. Flag-off builds never touch Identity.
 */

import { isCloudSaveEnabled } from "./cloudSaveFlag";
import { writeSession, signOut as localSignOut, getSession, reassignLocalWipOwner } from "./store";
import type { Session } from "./types";

type GoTrueClient = {
  settings: () => Promise<unknown>;
  signup: (email: string, password: string) => Promise<{ email?: string; confirmation_sent_at?: string }>;
  requestPasswordRecovery: (email: string) => Promise<void>;
  confirm: (token: string, remember?: boolean) => Promise<GoTrueUser>;
  recover: (token: string, remember?: boolean) => Promise<GoTrueUser>;
  acceptInvite: (token: string, password: string, remember?: boolean) => Promise<GoTrueUser>;
  currentUser: () => GoTrueUser | null;
};

type GoTrueUser = {
  id: string;
  email?: string;
  created_at?: string;
  token?: { access_token?: string } | null;
  jwt?: (forceRefresh?: boolean) => Promise<string>;
  logout?: () => Promise<void>;
};

let authClient: GoTrueClient | null = null;

export function identityApiUrl(): string {
  const fromEnv = (import.meta.env.VITE_NETLIFY_IDENTITY_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/.netlify/identity`;
  }
  return "/.netlify/identity";
}

function assertFlagOn(op: string): void {
  if (!isCloudSaveEnabled()) {
    throw new Error(`${op}: VITE_CLOUD_SAVE is off — Identity must not be called.`);
  }
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] || "writer";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function sessionFromUser(user: GoTrueUser): Session {
  const email = (user.email || "").trim().toLowerCase();
  return {
    userId: user.id,
    displayName: displayNameFromEmail(email || "writer"),
    email,
    createdAt: user.created_at || new Date().toISOString(),
  };
}

/** Dynamic import — never on the flag-off static graph beyond this async boundary. */
export async function getGoTrueClient(): Promise<GoTrueClient> {
  assertFlagOn("getGoTrueClient");
  if (authClient) return authClient;
  const mod = await import("gotrue-js");
  const GoTrue = mod.default;
  authClient = new GoTrue({
    APIUrl: identityApiUrl(),
    setCookie: true,
  }) as unknown as GoTrueClient;
  return authClient;
}

/** Reset cached client (tests / HMR after env change). */
export function resetGoTrueClient(): void {
  authClient = null;
}

function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type MagicLinkResult =
  | { ok: true; kind: "recovery" | "signup"; message: string }
  | { ok: false; message: string };

/**
 * Passwordless magic-link:
 * 1) requestPasswordRecovery (existing users — Netlify email link)
 * 2) if unknown user → signup with random password (confirmation email = magic link)
 *
 * Does not create a local Session until the user completes the email link.
 */
export async function requestMagicLink(email: string): Promise<MagicLinkResult> {
  try {
    assertFlagOn("requestMagicLink");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, message: "Enter a valid email for the magic link." };
  }

  let auth: GoTrueClient;
  try {
    auth = await getGoTrueClient();
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : "Could not load GoTrue client. Is Identity enabled on this site?",
    };
  }

  try {
    await auth.requestPasswordRecovery(trimmed);
    return {
      ok: true,
      kind: "recovery",
      message: "Magic link sent — check your email to finish signing in (Identity).",
    };
  } catch (recoverErr) {
    const msg =
      recoverErr && typeof recoverErr === "object" && "json" in recoverErr
        ? JSON.stringify((recoverErr as { json: unknown }).json)
        : recoverErr instanceof Error
          ? recoverErr.message
          : String(recoverErr);

    // Unknown user → signup so they get a confirmation (magic) link
    const notFound = /not found|no user|User not found|404/i.test(msg);
    if (!notFound) {
      // Still try signup as passwordless onboarding for open registration
      try {
        await auth.signup(trimmed, randomPassword());
        return {
          ok: true,
          kind: "signup",
          message:
            "Check your email for a confirmation link to finish signing in (Identity magic link).",
        };
      } catch (signupErr) {
        const sMsg =
          signupErr instanceof Error ? signupErr.message : String(signupErr);
        return {
          ok: false,
          message: `Identity magic link failed (${msg}). Signup also failed (${sMsg}). Identity may not be enabled on this site (not Live).`,
        };
      }
    }

    try {
      await auth.signup(trimmed, randomPassword());
      return {
        ok: true,
        kind: "signup",
        message:
          "Check your email for a confirmation link to finish signing in (Identity magic link).",
      };
    } catch (signupErr) {
      const sMsg = signupErr instanceof Error ? signupErr.message : String(signupErr);
      return {
        ok: false,
        message: `Identity signup failed: ${sMsg}. Identity may not be enabled (not Live).`,
      };
    }
  }
}

function takeHashParams(): URLSearchParams {
  const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
  return new URLSearchParams(hash);
}

function clearAuthHash(): void {
  try {
    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState({}, "", url.pathname + url.search);
  } catch {
    /* ignore */
  }
}

/**
 * Complete invite / confirm / recover from URL hash after magic-link click.
 * Writes Quillbench Session (userId = Identity sub) and returns it.
 */
export async function completeIdentityFromUrl(): Promise<Session | null> {
  assertFlagOn("completeIdentityFromUrl");
  const params = takeHashParams();
  const confirmation = params.get("confirmation_token");
  const recovery = params.get("recovery_token");
  const invite = params.get("invite_token");
  const accessToken = params.get("access_token");

  if (!confirmation && !recovery && !invite && !accessToken) {
    // Already logged in via GoTrue localStorage?
    return sessionFromCurrentUser();
  }

  const auth = await getGoTrueClient();
  let user: GoTrueUser | null = null;

  if (confirmation) {
    user = await auth.confirm(confirmation, true);
  } else if (recovery) {
    user = await auth.recover(recovery, true);
  } else if (invite) {
    user = await auth.acceptInvite(invite, randomPassword(), true);
  } else if (accessToken) {
    // Implicit token in hash (rare) — createUser from token payload shape
    const GoTrueMod = await import("gotrue-js");
    const token = {
      access_token: accessToken,
      token_type: "bearer" as const,
      expires_in: Number(params.get("expires_in") || 3600),
      refresh_token: params.get("refresh_token") || "",
      expires_at: Date.now() + Number(params.get("expires_in") || 3600) * 1000,
    };
    user = (await (auth as unknown as { createUser: (t: typeof token, r?: boolean) => Promise<GoTrueUser> }).createUser(
      token,
      true,
    )) as GoTrueUser;
    void GoTrueMod;
  }

  clearAuthHash();
  if (!user) return null;
  const session = sessionFromUser(user);
  if (session.email) {
    reassignLocalWipOwner(`user_${session.email}`, session.userId);
  }
  return writeSession(session);
}

export async function sessionFromCurrentUser(): Promise<Session | null> {
  if (!isCloudSaveEnabled()) return getSession();
  try {
    const auth = await getGoTrueClient();
    const user = auth.currentUser();
    if (!user?.id) return getSession();
    const session = sessionFromUser(user);
    if (session.email) {
      reassignLocalWipOwner(`user_${session.email}`, session.userId);
    }
    return writeSession(session);
  } catch {
    return getSession();
  }
}

/** JWT for Blobs Function Authorization header. */
export async function getIdentityAccessToken(): Promise<string | null> {
  assertFlagOn("getIdentityAccessToken");
  const auth = await getGoTrueClient();
  const user = auth.currentUser();
  if (!user) return null;
  if (typeof user.jwt === "function") {
    try {
      return await user.jwt();
    } catch {
      /* fall through */
    }
  }
  return user.token?.access_token ?? null;
}

export async function identitySignOut(): Promise<void> {
  if (!isCloudSaveEnabled()) {
    localSignOut();
    return;
  }
  try {
    const auth = await getGoTrueClient();
    const user = auth.currentUser();
    if (user && typeof user.logout === "function") {
      await user.logout();
    }
  } catch {
    /* ignore Identity errors on sign-out */
  }
  localSignOut();
}
