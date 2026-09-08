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
      "Full Edit + Cover Design + Marketing in one unlock — best value for writers taking a book to market.",
    unlocks: ["full-edit", "cover-design", "marketing"],
    featured: true,
  },
  {
    id: "full-edit",
    title: "Full Edit",
    price: 249,
    blurb:
      "Four-pass board — developmental through proof — with priority review notes when checkout goes live.",
    unlocks: ["full-edit"],
  },
  {
    id: "cover-design",
    title: "Cover Design",
    price: 179,
    blurb: "Brief + deliverable checklist. You attach final print/ebook files.",
    unlocks: ["cover-design"],
  },
  {
    id: "marketing",
    title: "Marketing",
    price: 129,
    blurb: "Blurb, keywords, and launch checklist so the book can find its readers.",
    unlocks: ["marketing"],
  },
];

function readOwned(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
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
