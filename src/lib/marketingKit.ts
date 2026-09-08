/**
 * Marketing payoff — blurb, keywords, launch checklist per book (localStorage).
 */

export type LaunchItemId = "preorder" | "newsletter" | "social" | "kdp-categories";

export type MarketingKit = {
  blurb: string;
  keywords: string;
  launch: Record<LaunchItemId, boolean>;
};

const STORAGE_KEY = "quillbench.marketingKit.v1";

export const LAUNCH_ITEMS: { id: LaunchItemId; label: string; hint: string }[] = [
  {
    id: "preorder",
    label: "Preorder",
    hint: "Retail or direct preorder page live (or scheduled).",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    hint: "Launch note drafted for your list.",
  },
  {
    id: "social",
    label: "Social",
    hint: "Cover reveal / launch posts planned.",
  },
  {
    id: "kdp-categories",
    label: "KDP categories",
    hint: "Browse categories + keywords chosen for discovery.",
  },
];

type Store = Record<string, Partial<MarketingKit>>;

function empty(): MarketingKit {
  return {
    blurb: "",
    keywords: "",
    launch: {
      preorder: false,
      newsletter: false,
      social: false,
      "kdp-categories": false,
    },
  };
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function getMarketingKit(bookId: string): MarketingKit {
  const base = empty();
  const raw = readStore()[bookId] ?? {};
  const launch = raw.launch;
  return {
    blurb: typeof raw.blurb === "string" ? raw.blurb : base.blurb,
    keywords: typeof raw.keywords === "string" ? raw.keywords : base.keywords,
    launch: {
      preorder: !!(launch && launch.preorder),
      newsletter: !!(launch && launch.newsletter),
      social: !!(launch && launch.social),
      "kdp-categories": !!(launch && launch["kdp-categories"]),
    },
  };
}

export function setMarketingKit(bookId: string, patch: Partial<MarketingKit>): MarketingKit {
  const cur = getMarketingKit(bookId);
  const next: MarketingKit = {
    ...cur,
    ...patch,
    launch: patch.launch ? { ...cur.launch, ...patch.launch } : cur.launch,
  };
  const store = readStore();
  store[bookId] = next;
  writeStore(store);
  return next;
}

export function setLaunchItem(
  bookId: string,
  id: LaunchItemId,
  done: boolean,
): MarketingKit {
  const cur = getMarketingKit(bookId);
  return setMarketingKit(bookId, {
    launch: { ...cur.launch, [id]: done },
  });
}

export function freshMarketingKit(): MarketingKit {
  return empty();
}
