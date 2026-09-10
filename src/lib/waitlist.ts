/**
 * Soft-launch waitlist — localStorage backup + Netlify Forms notify.
 * Key: quillbench.waitlist.v1 (string[]).
 *
 * Netlify Forms: form name `quillbench-waitlist` (hidden form in index.html for
 * build-time detection). Sarah must enable form notifications in Netlify UI
 * → Forms → quillbench-waitlist → email notifications to her Gmail
 * (or hello@quillbench.app). Support: hello@quillbench.app
 */

const WAITLIST_KEY = "quillbench.waitlist.v1";
export const WAITLIST_FORM_NAME = "quillbench-waitlist";

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

/**
 * Instant localStorage save, then best-effort Netlify Forms POST so Sarah
 * gets an email notification (when Forms notifications are enabled).
 */
export async function submitWaitlist(email: string): Promise<boolean> {
  const trimmed = email.trim().toLowerCase();
  if (!addWaitlistEmail(trimmed)) return false;

  try {
    const body = new URLSearchParams();
    body.set("form-name", WAITLIST_FORM_NAME);
    body.set("email", trimmed);
    body.set("source", "landing-soft-launch");
    await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    /* localStorage already saved — form notify is best-effort */
  }
  return true;
}
