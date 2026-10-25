/**
 * Studio package catalog + local unlock (no real payment yet).
 * Owned package ids persist in localStorage until billing wires in.
 */

export type PackageId = "full-edit" | "cover-design" | "marketing" | "studio-bundle";

export type StudioPackage = {
  id: PackageId;
  title: string;
  price: number;
  blurb: string;
  /** Packages this unlock grants. studio-bundle grants all three singles. */
  unlocks: Exclude<PackageId, "studio-bundle">[];
  /** Highlight as best value on the shelf (Studio Bundle). */
  featured?: boolean;
};

const STORAGE_KEY = "quillbench.packages.v1";

export const PACKAGES: StudioPackage[] = [
  {
    id: "studio-bundle",
    title: "Studio Bundle",
    price: 499,
    blurb:
      "Cover (ebook front cover, 2400x2400 audiobook cover and 3D book mockup), print wrap, proofread up to 40,000 words (a novella or short book), blurb polish, and 6 promo graphics in one package. Writing a full-length novel? Most run 70,000 to 110,000 words. Email Quillbench for a quote before you buy.",
    unlocks: ["full-edit", "cover-design", "marketing"],
    featured: true,
  },
  {
    id: "full-edit",
    title: "Full Edit",
    price: 249,
    blurb:
      "Four-pass board plus priority review: focus-first, open questions, and non-negotiables for your editor.",
    unlocks: ["full-edit"],
  },
  {
    id: "cover-design",
    title: "Cover Design",
    price: 99,
    blurb: "One cover concept: ebook front cover, 2400x2400 audiobook cover, and a 3D book mockup. 2 rounds of changes included.",
    unlocks: ["cover-design"],
  },
  {
    id: "marketing",
    title: "Marketing",
    price: 129,
    blurb: "Audience one-liner, blurb, keywords, and a launch kit with a done-looks-like on each check.",
    unlocks: ["marketing"],
  },
];

/**
 * Paid-session ledger written by /thank-you/ after a verified Stripe Checkout.
 * Entries look like { sid: "cs_live_…", pkg: "cover-design" | "studio-bundle" }.
 */
const PAID_KEY = "quillbench.packages.paid.v1";

function readPaid(): Set<string> {
  const paid = new Set<string>();
  try {
    const parsed = JSON.parse(localStorage.getItem(PAID_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return paid;
    for (const entry of parsed) {
      const sid = entry && typeof entry === "object" ? (entry as { sid?: unknown }).sid : undefined;
      const pkg = entry && typeof entry === "object" ? (entry as { pkg?: unknown }).pkg : undefined;
      if (typeof sid !== "string" || !/^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(sid)) continue;
      if (pkg !== "cover-design" && pkg !== "studio-bundle") continue;
      paid.add(pkg);
      if (pkg === "studio-bundle") ["full-edit", "cover-design", "marketing"].forEach((id) => paid.add(id));
    }
  } catch {
    /* ignore */
  }
  return paid;
}

/** Owned ids, filtered to those backed by a paid Checkout session (stale/forged unlocks are dropped). */
function readOwned(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.filter((x): x is string => typeof x === "string");
    const paid = readPaid();
    const kept = ids.filter((id) => paid.has(id));
    if (kept.length !== ids.length) writeOwned(kept);
    return kept;
  } catch {
    return [];
  }
}

function writeOwned(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota */
  }
}

/**
 * Packages whose standalone buy buttons are hidden until Sarah defines what they
 * deliver (Sarah 2026-09-30 8:55 AM). Remove an id here to bring its button back.
 */
const BUY_HIDDEN = new Set<string>(["full-edit", "marketing"]);

export function canBuy(id: PackageId | string): boolean {
  return !BUY_HIDDEN.has(id);
}

export function listPackages(): StudioPackage[] {
  return PACKAGES.slice();
}

export function getOwned(): string[] {
  return readOwned();
}

export function owns(id: PackageId | string): boolean {
  const owned = new Set(readOwned());
  if (owned.has(id)) return true;
  if (owned.has("studio-bundle")) {
    const pkg = PACKAGES.find((p) => p.id === id);
    if (pkg && pkg.id !== "studio-bundle") return true;
  }
  // studio-bundle also counts if they bought it
  if (id === "studio-bundle") return owned.has("studio-bundle");
  // If they own all three singles, treat as owning the capability (not the bundle sku)
  if (id === "full-edit" || id === "cover-design" || id === "marketing") {
    return owned.has(id) || owned.has("studio-bundle");
  }
  return false;
}

/** Instant unlock — no payment. Persists on this device. */
export function purchase(id: PackageId): string[] {
  const owned = new Set(readOwned());
  owned.add(id);
  if (id === "studio-bundle") {
    owned.add("full-edit");
    owned.add("cover-design");
    owned.add("marketing");
  }
  const next = Array.from(owned);
  writeOwned(next);
  return next;
}

export function ownsFullEdit(): boolean {
  return owns("full-edit");
}

export function ownsCoverDesign(): boolean {
  return owns("cover-design");
}

export function ownsMarketing(): boolean {
  return owns("marketing");
}

export function ownsStudioBundle(): boolean {
  return owns("studio-bundle");
}

export function formatPrice(centsOrDollars: number): string {
  return `$${centsOrDollars}`;
}
