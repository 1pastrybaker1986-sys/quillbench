/**
 * Email sign-in link flow (pure, no imports so it can be unit-tested with node --test).
 *
 * Netlify Identity's POST /recover answers 200 `{}` even for unknown emails (anti-enumeration),
 * so a successful recover proves nothing. We therefore try signup FIRST:
 *  - signup ok      → new (or still-unconfirmed) user; GoTrue emails a confirmation link.
 *  - signup 422 / "already registered" → existing user; send a recovery (magic) link instead.
 *  - anything else  → error.
 */
export type MagicLinkAuth = {
  signup: (email: string, password: string) => Promise<unknown>;
  requestPasswordRecovery: (email: string) => Promise<unknown>;
};

export type MagicLinkResult =
  | { ok: true; kind: "recovery" | "signup"; message: string }
  | { ok: false; message: string };

export const SIGNIN_FAIL_MESSAGE =
  "Sign-in didn't finish. Try the email link again, or email sarah@brundigebusiness.com.";

export function isAlreadyRegistered(err: unknown): boolean {
  if (!err || typeof err !== "object") return /already (been )?registered|already exists/i.test(String(err));
  const e = err as { status?: number; json?: { code?: number; msg?: string; error_description?: string }; message?: string };
  const status = e.status ?? e.json?.code;
  const text = [e.json?.msg, e.json?.error_description, e.message].filter(Boolean).join(" ");
  if (/already (been )?registered|already exists/i.test(text)) return true;
  return status === 422 && !/password|invalid email|email.*invalid/i.test(text);
}

export async function runMagicLinkFlow(
  auth: MagicLinkAuth,
  email: string,
  makePassword: () => string,
): Promise<MagicLinkResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return { ok: false, message: "Enter a valid email address." };

  try {
    await auth.signup(trimmed, makePassword());
    return { ok: true, kind: "signup", message: "Check your email for a link to finish signing in." };
  } catch (signupErr) {
    if (!isAlreadyRegistered(signupErr)) return { ok: false, message: SIGNIN_FAIL_MESSAGE };
  }

  try {
    await auth.requestPasswordRecovery(trimmed);
    return { ok: true, kind: "recovery", message: "Sign-in link sent. Check your email to finish signing in." };
  } catch {
    return { ok: false, message: SIGNIN_FAIL_MESSAGE };
  }
}
