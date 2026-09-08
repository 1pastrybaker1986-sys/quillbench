import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import type { Book } from "./types";
import { parseManuscript } from "./sampleManuscript";

const MARGIN_IN = 0.75;
const PT = 72;
const INK = rgb(0.12, 0.1, 0.08);

export function bookSlug(title: string): string {
  const ascii = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`´’‘]/g, "");
  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "book";
}

/** WinAnsi-safe text for Times (curly quotes, dashes, leftover unicode). */
export function pdfSafe(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\t\n\r\u0020-\u007E\u00A0-\u00FF]/g, (ch) => {
      const folded = ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
      if (/^[\u0020-\u007E\u00A0-\u00FF]+$/.test(folded)) return folded;
      return "";
    });
}

function trimPoints(trim: Book["trim"]): { w: number; h: number } {
  return trim === "6x9"
    ? { w: 6 * PT, h: 9 * PT }
    : { w: 5.5 * PT, h: 8.5 * PT };
}

type WrappedLine = { text: string; indent: number };

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  return wrapParagraph(text, font, size, maxWidth, 0).map((l) => l.text);
}

function wrapParagraph(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  firstLineIndent: number,
): WrappedLine[] {
  const cleaned = pdfSafe(text).replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const words = cleaned.split(" ");
  const rows: WrappedLine[] = [];
  let current = "";
  let isFirst = true;
  const widthOf = (s: string) => font.widthOfTextAtSize(s, size);
  const maxFor = () => Math.max(8, isFirst ? maxWidth - firstLineIndent : maxWidth);

  const flush = () => {
    if (!current) return;
    rows.push({ text: current, indent: isFirst ? firstLineIndent : 0 });
    current = "";
    isFirst = false;
  };

  const hardBreak = (word: string) => {
    let chunk = "";
    for (const ch of word) {
      const next = chunk + ch;
      if (widthOf(next) <= maxFor()) {
        chunk = next;
      } else {
        if (chunk) {
          current = chunk;
          flush();
        }
        chunk = ch;
      }
    }
    current = chunk;
  };

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (widthOf(next) <= maxFor()) {
      current = next;
    } else if (current) {
      flush();
      if (widthOf(word) <= maxFor()) current = word;
      else hardBreak(word);
    } else {
      hardBreak(word);
    }
  }
  if (current) flush();
  return rows;
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  pageW: number,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (pageW - width) / 2,
    y,
    size,
    font,
    color: INK,
  });
}

type Fonts = {
  roman: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
};

async function embedFonts(doc: PDFDocument): Promise<Fonts> {
  const [roman, bold, italic] = await Promise.all([
    doc.embedFont(StandardFonts.TimesRoman),
    doc.embedFont(StandardFonts.TimesRomanBold),
    doc.embedFont(StandardFonts.TimesRomanItalic),
  ]);
  return { roman, bold, italic };
}

function newPage(doc: PDFDocument, w: number, h: number): PDFPage {
  return doc.addPage([w, h]);
}

function drawTitlePage(
  page: PDFPage,
  book: Book,
  fonts: Fonts,
  w: number,
  h: number,
  innerW: number,
  margin: number,
) {
  const titleLines = wrapText(book.title || "Untitled", fonts.bold, 22, innerW);
  let y = h * 0.62;
  for (const line of titleLines) {
    drawCentered(page, line, y, fonts.bold, 22, w);
    y -= 28;
  }

  const subtitle = book.subtitle?.trim();
  if (subtitle) {
    y -= 10;
    const subLines = wrapText(subtitle, fonts.italic, 13, innerW);
    for (const line of subLines) {
      drawCentered(page, line, y, fonts.italic, 13, w);
      y -= 18;
    }
  }

  const author = book.authorName?.trim();
  if (author) {
    y -= 36;
    drawCentered(page, pdfSafe(author), y, fonts.roman, 14, w);
  }

  const publisher = book.publisherLine?.trim();
  if (publisher) {
    const pubLines = wrapText(publisher, fonts.roman, 10, innerW);
    let py = margin;
    for (let i = pubLines.length - 1; i >= 0; i--) {
      drawCentered(page, pubLines[i], py, fonts.roman, 10, w);
      py += 14;
    }
  }
}

function drawCopyrightPage(
  page: PDFPage,
  book: Book,
  fonts: Fonts,
  innerW: number,
  margin: number,
  h: number,
) {
  const year = book.copyrightYear?.trim();
  const author = book.authorName?.trim();
  const notice =
    year && author
      ? `Copyright \u00A9 ${year} ${author}`
      : year
        ? `Copyright \u00A9 ${year}`
        : author
          ? `Copyright \u00A9 ${author}`
          : "All rights reserved.";

  const blocks: string[] = [
    notice,
    "All rights reserved. No part of this book may be reproduced or used in any manner without written permission, except for brief quotations in a review.",
  ];
  const publisher = book.publisherLine?.trim();
  if (publisher) blocks.push(publisher);

  let y = h - margin - 8;
  const size = 10;
  const lineH = 14;
  for (const block of blocks) {
    const lines = wrapText(block, fonts.roman, size, innerW);
    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: fonts.roman,
        color: INK,
      });
      y -= lineH;
    }
    y -= 10;
  }
}

function drawDedicationPage(
  page: PDFPage,
  dedication: string,
  fonts: Fonts,
  w: number,
  h: number,
  innerW: number,
) {
  const lines = wrapText(dedication, fonts.italic, 13, innerW);
  const lineH = 20;
  const blockH = lines.length * lineH;
  let y = h * 0.55 + blockH / 2;
  for (const line of lines) {
    drawCentered(page, line, y, fonts.italic, 13, w);
    y -= lineH;
  }
}

function drawRunningHead(
  page: PDFPage,
  title: string,
  fonts: Fonts,
  w: number,
  h: number,
  margin: number,
) {
  const head = pdfSafe(title).toUpperCase();
  const size = 8;
  const maxW = w - margin * 2;
  let text = head;
  while (text.length > 3 && fonts.roman.widthOfTextAtSize(text, size) > maxW) {
    text = text.slice(0, -1);
  }
  drawCentered(page, text, h - margin + 18, fonts.roman, size, w);
}

function drawFolio(
  page: PDFPage,
  n: number,
  fonts: Fonts,
  w: number,
  margin: number,
) {
  drawCentered(page, String(n), margin - 22, fonts.roman, 9, w);
}

function drawBody(
  doc: PDFDocument,
  book: Book,
  fonts: Fonts,
  w: number,
  h: number,
  innerW: number,
  margin: number,
) {
  const parsed = parseManuscript(book.manuscriptText ?? "");
  const chapters = parsed.chapters.filter(
    (ch) => ch.label || ch.title || ch.paragraphs.length > 0,
  );
  if (chapters.length === 0) return;

  const bodySize = 11;
  const lineH = 16;
  const indent = 18;
  const contentTop = h - margin;
  const contentBottom = margin;

  let page = newPage(doc, w, h);
  let y = contentTop - 36;
  let folio = 1;

  const finishPage = () => {
    drawFolio(page, folio, fonts, w, margin);
    folio += 1;
  };

  const openContinuingPage = () => {
    page = newPage(doc, w, h);
    drawRunningHead(page, book.title, fonts, w, h, margin);
    y = contentTop - 12;
  };

  const openChapterPage = () => {
    page = newPage(doc, w, h);
    y = contentTop - 36;
  };

  const ensureRoom = (need: number) => {
    if (y - need >= contentBottom) return;
    finishPage();
    openContinuingPage();
  };

  chapters.forEach((chapter, ci) => {
    if (ci > 0) {
      finishPage();
      openChapterPage();
    }

    if (chapter.label) {
      const label = pdfSafe(chapter.label).toUpperCase();
      ensureRoom(lineH);
      page.drawText(label, {
        x: margin,
        y,
        size: 10,
        font: fonts.roman,
        color: INK,
      });
      y -= 18;
    }

    if (chapter.title) {
      const titleLines = wrapText(chapter.title, fonts.bold, 16, innerW);
      for (const line of titleLines) {
        ensureRoom(22);
        page.drawText(line, {
          x: margin,
          y,
          size: 16,
          font: fonts.bold,
          color: INK,
        });
        y -= 22;
      }
      y -= 14;
    }

    chapter.paragraphs.forEach((para, i) => {
      const paraIndent = i === 0 ? 0 : indent;
      const lines = wrapParagraph(para, fonts.roman, bodySize, innerW, paraIndent);
      if (lines.length === 0) return;
      for (const line of lines) {
        ensureRoom(lineH);
        page.drawText(line.text, {
          x: margin + line.indent,
          y,
          size: bodySize,
          font: fonts.roman,
          color: INK,
        });
        y -= lineH;
      }
      y -= 4;
    });
  });

  drawFolio(page, folio, fonts, w, margin);
}

export async function buildInteriorPdf(book: Book): Promise<Uint8Array> {
  const { w, h } = trimPoints(book.trim);
  const margin = MARGIN_IN * PT;
  const innerW = w - margin * 2;
  const doc = await PDFDocument.create();
  const fonts = await embedFonts(doc);

  const titlePage = newPage(doc, w, h);
  drawTitlePage(titlePage, book, fonts, w, h, innerW, margin);

  const copyrightPage = newPage(doc, w, h);
  drawCopyrightPage(copyrightPage, book, fonts, innerW, margin, h);

  const dedication = book.dedication?.trim();
  if (dedication) {
    const dPage = newPage(doc, w, h);
    drawDedicationPage(dPage, dedication, fonts, w, h, innerW);
  }

  drawBody(doc, book, fonts, w, h, innerW, margin);

  const bytes = await doc.save();
  return bytes;
}

export async function downloadInteriorPdf(
  book: Book,
): Promise<{ filename: string; sizeBytes: number }> {
  const bytes = await buildInteriorPdf(book);
  const filename = `${bookSlug(book.title)}-interior.pdf`;
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { filename, sizeBytes: bytes.byteLength };
}
