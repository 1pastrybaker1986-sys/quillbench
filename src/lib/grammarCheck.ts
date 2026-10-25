/**
 * Lightweight, fiction-aware manuscript notes. Client-side only — no paid API.
 * Flag for review; do not flatten dialect, fragments, or character speech.
 * Tuned for typewritten / OCR manuscripts: hyphen joins, spaced letters, OCR slips.
 */

export type GrammarSeverity = "info" | "warn";

export type GrammarIssueKind =
  | "repeated-word"
  | "odd-whitespace"
  | "missing-space"
  | "long-sentence"
  | "repeated-starter"
  | "quote-mix"
  | "hyphen-join"
  | "spaced-letters"
  | "ocr-slip"
  | "dash-ellipsis";

export type GrammarIssue = {
  /** Stable fingerprint: kind + offset + clipped match. */
  key: string;
  kind: GrammarIssueKind;
  severity: GrammarSeverity;
  title: string;
  note: string;
  snippet: string;
  start: number;
  /** Rough family for grouped UI. */
  group: "ocr" | "rhythm" | "tidy";
};

const DISMISSED_KEY = "quillbench.grammarDismissed.v1";
const MAX_ISSUES = 80;
const LONG_SENTENCE_WORDS = 40;
const SNIPPET_RADIUS = 36;

/** Fresh each call — a shared /g regex would leak lastIndex between checks. */
function wordRe(): RegExp {
  return /[\p{L}0-9]+(?:['’-][\p{L}0-9]+)*/gu;
}

function wordsIn(s: string): string[] {
  return s.match(wordRe()) ?? [];
}

/** Doubles that are often the right beat in English — still a glance, not a slap. */
const SOFT_DOUBLES = new Set(["had", "that", "there", "well", "so", "very"]);

type DismissedMap = Record<string, string[]>;

function issueKey(kind: GrammarIssueKind, start: number, match: string): string {
  const clip = match.replace(/\s+/g, " ").trim().slice(0, 48);
  return `${kind}:${start}:${clip}`;
}

function snippetAround(text: string, start: number, end: number): string {
  const a = Math.max(0, start - SNIPPET_RADIUS);
  const b = Math.min(text.length, end + SNIPPET_RADIUS);
  let s = text.slice(a, b).replace(/\t/g, "→").replace(/\r?\n+/g, " ");
  s = s.trim();
  if (a > 0) s = `…${s}`;
  if (b < text.length) s = `${s}…`;
  return s;
}

function wordCount(s: string): number {
  return wordsIn(s).length;
}

function firstThreeWords(s: string): string | null {
  const words = wordsIn(s);
  if (words.length < 3) return null;
  return words.slice(0, 3).join(" ").toLowerCase();
}

function splitParagraphs(text: string): { start: number; text: string }[] {
  const parts: { start: number; text: string }[] = [];
  const re = /\n\s*\n/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const chunk = text.slice(last, m.index);
    const lead = chunk.search(/\S/);
    if (lead >= 0) parts.push({ start: last + lead, text: chunk.trim() });
    last = m.index + m[0].length;
  }
  const chunk = text.slice(last);
  const lead = chunk.search(/\S/);
  if (lead >= 0) parts.push({ start: last + lead, text: chunk.trim() });
  return parts;
}

function pushIssue(
  out: GrammarIssue[],
  issue: Omit<GrammarIssue, "key"> & { match: string },
) {
  out.push({
    key: issueKey(issue.kind, issue.start, issue.match),
    kind: issue.kind,
    severity: issue.severity,
    title: issue.title,
    note: issue.note,
    snippet: issue.snippet,
    start: issue.start,
    group: issue.group,
  });
}

function findRepeatedWords(text: string, out: GrammarIssue[]) {
  const wordScan = wordRe();
  let prev: { word: string; start: number; end: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = wordScan.exec(text))) {
    const word = m[0];
    const start = m.index;
    const end = start + word.length;
    if (prev) {
      const gap = text.slice(prev.end, start);
      if (/^[ \t]+$/.test(gap) && prev.word.toLowerCase() === word.toLowerCase()) {
        const soft = SOFT_DOUBLES.has(word.toLowerCase());
        pushIssue(out, {
          kind: "repeated-word",
          severity: soft ? "info" : "warn",
          group: "rhythm",
          title: "Repeated word",
          note: soft
            ? "The same word twice in a row — often the right beat. Glance if you want."
            : "The same word twice in a row. Sometimes that’s the beat; sometimes a scan or a slip.",
          snippet: snippetAround(text, prev.start, end),
          start: prev.start,
          match: `${prev.word} ${word}`,
        });
      }
    }
    prev = { word, start, end };
  }
}

function findOddWhitespace(text: string, out: GrammarIssue[]) {
  const re = / {2,}|\t+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index;
    const raw = m[0];
    const before = text.slice(Math.max(0, start - 4), start);
    const typewriterTwin = raw === "  " && /[.?!]["'”’)]?$/.test(before);
    pushIssue(out, {
      kind: "odd-whitespace",
      severity: typewriterTwin ? "info" : "warn",
      group: typewriterTwin ? "tidy" : "ocr",
      title: typewriterTwin ? "Two spaces" : "Odd whitespace",
      note: typewriterTwin
        ? "Two spaces after a stop — a typewriter habit. Fine to keep, or tidy for a modern line."
        : "Extra space or a tab landed here. Scans often leave these.",
      snippet: snippetAround(text, start, start + raw.length),
      start,
      match: raw.replace(/\t/g, "→"),
    });
  }
}

function findMissingSpace(text: string, out: GrammarIssue[]) {
  const re = /[,:;?!][\p{L}]|\.[\p{L}]/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index;
    pushIssue(out, {
      kind: "missing-space",
      severity: "warn",
      group: "ocr",
      title: "Missing space",
      note: "Punctuation running into the next word. Worth a glance — OCR does this a lot.",
      snippet: snippetAround(text, start, start + m[0].length),
      start,
      match: m[0],
    });
  }
}

function findLongSentences(text: string, out: GrammarIssue[]) {
  const re = /[^.!?]+[.!?]+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const consider = (start: number, end: number, sentence: string) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    const n = wordCount(trimmed);
    if (n <= LONG_SENTENCE_WORDS) return;
    pushIssue(out, {
      kind: "long-sentence",
      severity: "info",
      group: "rhythm",
      title: "Long sentence",
      note: `This sentence is ${n} words. Not wrong — a pacing note if you want a breath.`,
      snippet: snippetAround(text, start, Math.min(end, start + 90)),
      start,
      match: trimmed.slice(0, 48),
    });
  };
  while ((m = re.exec(text))) {
    consider(m.index, m.index + m[0].length, m[0]);
    last = m.index + m[0].length;
  }
  if (last < text.length) consider(last, text.length, text.slice(last));
}

function findRepeatedStarters(text: string, out: GrammarIssue[]) {
  const paras = splitParagraphs(text);
  for (let i = 1; i < paras.length; i++) {
    const prev = firstThreeWords(paras[i - 1].text);
    const cur = firstThreeWords(paras[i].text);
    if (!prev || !cur || prev !== cur) continue;
    const words = wordsIn(paras[i].text).slice(0, 3).join(" ") || cur;
    pushIssue(out, {
      kind: "repeated-starter",
      severity: "info",
      group: "rhythm",
      title: "Repeated opener",
      note: "This paragraph opens with the same first three words as the one before. Rhythm check only.",
      snippet: snippetAround(
        text,
        paras[i].start,
        paras[i].start + Math.min(paras[i].text.length, 72),
      ),
      start: paras[i].start,
      match: words,
    });
  }
}

function findQuoteMix(text: string, out: GrammarIssue[]) {
  const straight = (text.match(/"/g) ?? []).length;
  const curly = (text.match(/[“”]/g) ?? []).length;
  if (straight === 0 || curly === 0) return;
  pushIssue(out, {
    kind: "quote-mix",
    severity: "info",
    group: "tidy",
    title: "Quote marks mixed",
    note: "Straight and curly quotation marks both appear. A consistency pass is optional; mixed scans do this often.",
    snippet: 'Straight " and curly “ ” in the same manuscript',
    start: 0,
    match: "mixed-quotes",
  });
}

/** Typewritten line wrap left as `word-\\nword` instead of rejoined. */
function findHyphenJoins(text: string, out: GrammarIssue[]) {
  const re = /([\p{L}]{2,})-\r?\n([\p{L}]{2,})/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index;
    const joined = `${m[1]}${m[2]}`;
    pushIssue(out, {
      kind: "hyphen-join",
      severity: "warn",
      group: "ocr",
      title: "Hyphenated line break",
      note: `Looks like a typewriter wrap of “${joined}”. Join it, or keep the hyphen if it’s a real compound.`,
      snippet: snippetAround(text, start, start + m[0].length),
      start,
      match: m[0].replace(/\r?\n/g, "↵"),
    });
  }
}

/** Spaced-out letters from a bad scan: "t h e" (3+ single letters). */
function findSpacedLetters(text: string, out: GrammarIssue[]) {
  const re = /\b(?:[\p{L}]\s){2,}[\p{L}]\b/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[0];
    const letters = raw.replace(/\s+/g, "");
    if (letters.length < 3) continue;
    const start = m.index;
    pushIssue(out, {
      kind: "spaced-letters",
      severity: "warn",
      group: "ocr",
      title: "Spaced letters",
      note: `Letters look spaced out (“${letters}”). Common after a typed-page scan — tighten if it’s one word.`,
      snippet: snippetAround(text, start, start + raw.length),
      start,
      match: raw,
    });
  }
}

/**
 * Soft OCR slip hints — rn/cl clusters and digit 0 inside a letter word.
 * Info only; many hits are real words (turn, clear). Cap to avoid noise.
 */
function findOcrSlips(text: string, out: GrammarIssue[]) {
  let hits = 0;
  const cap = 12;
  // digit 0 inside an otherwise letter-ish token
  const zeroRe = /\b[\p{L}]*0[\p{L}]+\b|\b[\p{L}]+0[\p{L}]*\b/gu;
  let m: RegExpExecArray | null;
  while ((m = zeroRe.exec(text))) {
    if (hits >= cap) break;
    const start = m.index;
    pushIssue(out, {
      kind: "ocr-slip",
      severity: "info",
      group: "ocr",
      title: "Possible OCR slip",
      note: "A zero landed inside a word — often an O that scanned wrong. Glance if the word looks off.",
      snippet: snippetAround(text, start, start + m[0].length),
      start,
      match: m[0],
    });
    hits += 1;
  }
}

function findDashEllipsis(text: string, out: GrammarIssue[]) {
  const re = /\.{3,}|--+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[0];
    const start = m.index;
    const isEllipsis = raw.startsWith(".");
    pushIssue(out, {
      kind: "dash-ellipsis",
      severity: "info",
      group: "tidy",
      title: isEllipsis ? "Typewriter ellipsis" : "Typewriter dash",
      note: isEllipsis
        ? "Three dots in a row — fine in typed pages. Optional tidy to a single ellipsis glyph."
        : "Double hyphen — a typewriter em dash. Fine to keep, or swap for an em dash when you polish.",
      snippet: snippetAround(text, start, start + raw.length),
      start,
      match: raw,
    });
  }
}

/** Analyze manuscript (or a draft string). Empty input → no issues. */
export function checkManuscript(text: string): GrammarIssue[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
  if (!raw.trim()) return [];
  const out: GrammarIssue[] = [];
  findQuoteMix(raw, out);
  findRepeatedWords(raw, out);
  findOddWhitespace(raw, out);
  findMissingSpace(raw, out);
  findHyphenJoins(raw, out);
  findSpacedLetters(raw, out);
  findOcrSlips(raw, out);
  findDashEllipsis(raw, out);
  findLongSentences(raw, out);
  findRepeatedStarters(raw, out);
  out.sort((a, b) => a.start - b.start || a.key.localeCompare(b.key));
  if (out.length <= MAX_ISSUES) return out;
  return out.slice(0, MAX_ISSUES);
}

export const GRAMMAR_GROUP_LABELS: Record<GrammarIssue["group"], string> = {
  ocr: "Scan / typewriter",
  rhythm: "Rhythm",
  tidy: "Optional tidy",
};

function readDismissedMap(): DismissedMap {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const map: DismissedMap = {};
    for (const [id, keys] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(keys)) {
        map[id] = keys.filter((k): k is string => typeof k === "string");
      }
    }
    return map;
  } catch {
    return {};
  }
}

function writeDismissedMap(map: DismissedMap) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
}

export function loadDismissedKeys(bookId: string): Set<string> {
  const map = readDismissedMap();
  return new Set(map[bookId] ?? []);
}

export function dismissIssue(bookId: string, key: string): Set<string> {
  const map = readDismissedMap();
  const next = [...new Set([...(map[bookId] ?? []), key])].slice(-500);
  map[bookId] = next;
  writeDismissedMap(map);
  return new Set(next);
}
