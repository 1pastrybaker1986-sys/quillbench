/**
 * Soft-launch payments waitlist — emails in localStorage until a backend exists.
 * Key: quillbench.waitlist.v1 (string[]).
 *
 * Optional remote capture later:
 * - mailto:hello@quillbench.app?subject=Waitlist
 * - Formspree: POST https://formspree.io/f/YOUR_FORM_ID with { email }
 *   (replace YOUR_FORM_ID; see ../DEPLOY.md)
 */

const WAITLIST_KEY = "quillbench.waitlist.v1";

function readList(): string[] {
  try {
    const raw = localStorage.getItem(WAITLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is string => typeof e === "string");
  } catch {
    return [];
  }
}

function writeList(emails: string[]) {
  localStorage.setItem(WAITLIST_KEY, JSON.stringify(emails));
}

export function listWaitlistEmails(): string[] {
  return readList();
}

/** Normalize, dedupe, persist. Returns false if email is empty/invalid-looking. */
export function addWaitlistEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@") || trimmed.length < 5) return false;
  const list = readList();
  if (!list.includes(trimmed)) {
    list.push(trimmed);
    writeList(list);
  }
  return true;
}

export function isOnWaitlist(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 && readList().includes(trimmed);
}
