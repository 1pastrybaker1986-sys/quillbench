/** Shared sample chapter used to seed books and reset the rail. */
export const SAMPLE_CHAPTER =
`Chapter One
The first unquiet hour

The orchard held its breath. Leaves turned their pale undersides to a sky that had not yet decided on weather, and the house at the end of the lane kept its windows shut against a rumor of rain.

She stood in the kitchen with a manuscript that was not yet a book and a kettle that had already forgotten why it had been lit. The work, she knew, was not the sentences. The work was everything after.

Trim, theme, a spread that would one day be ink on paper. For now the pages were only a shape — a promise of 5.5 by 8.5, or six by nine, waiting for type that knew how to sit.

Outside, the first crow found the fence post. Inside, she turned a leaf and began again.
`;

export type ParsedChapter = {
  label?: string;
  title?: string;
  paragraphs: string[];
};

export type ParsedManuscript = {
  chapters: ParsedChapter[];
  /** First chapter — kept so single-chapter call sites stay valid. */
  chapterLabel?: string;
  chapterTitle?: string;
  paragraphs: string[];
};

const CHAPTER_LINE =
  /^(chapter\s+[\wIVXLC0-9]+|prologue|epilogue|part\s+[\wIVXLC0-9]+)\b/i;

function isShortHeading(line: string): boolean {
  if (!line || line.length > 72) return false;
  if (/[.?!]$/.test(line)) return false;
  return true;
}

function isChapterMarker(line: string): boolean {
  const t = line.trim();
  return CHAPTER_LINE.test(t) && isShortHeading(t);
}

function linesToParagraphs(bodyLines: string[]): string[] {
  const rest = bodyLines.join("\n").trim();
  if (!rest) return [];
  return rest
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

function chapterFrom(
  label: string | undefined,
  title: string | undefined,
  bodyLines: string[],
): ParsedChapter {
  return { label, title, paragraphs: linesToParagraphs(bodyLines) };
}

function isEmptyChapter(ch: ParsedChapter): boolean {
  return !ch.label && !ch.title && ch.paragraphs.length === 0;
}

export function parseManuscript(text: string): ParsedManuscript {
  const raw = text.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "").trim();
  if (!raw) return { chapters: [], paragraphs: [] };

  const lines = raw.split("\n").map((l) => l.trimEnd());
  const chapters: ParsedChapter[] = [];

  let label: string | undefined;
  let title: string | undefined;
  let bodyLines: string[] = [];
  let started = false;

  const flush = () => {
    if (!started) return;
    const ch = chapterFrom(label, title, bodyLines);
    if (!isEmptyChapter(ch)) chapters.push(ch);
    label = undefined;
    title = undefined;
    bodyLines = [];
    started = false;
  };

  const openChapter = (nextLabel?: string, nextTitle?: string) => {
    flush();
    label = nextLabel;
    title = nextTitle;
    bodyLines = [];
    started = true;
  };

  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (isChapterMarker(trimmed)) {
      openChapter(trimmed);
      i++;
      while (i < lines.length && lines[i].trim() === "") i++;
      const next = i < lines.length ? lines[i].trim() : "";
      if (next && isShortHeading(next) && !isChapterMarker(next)) {
        title = next;
        i++;
      }
      continue;
    }

    if (!started) {
      if (trimmed && isShortHeading(trimmed) && trimmed.length < 60) {
        openChapter(undefined, trimmed);
        i++;
        continue;
      }
      openChapter();
    }

    bodyLines.push(lines[i]);
    i++;
  }

  flush();

  const first = chapters[0];
  return {
    chapters,
    chapterLabel: first?.label,
    chapterTitle: first?.title,
    paragraphs: first?.paragraphs ?? [],
  };
}

export function chapterNavTitle(
  chapter: ParsedChapter,
  fallback = "Chapter",
): string {
  return chapter.title || chapter.label || fallback;
}
