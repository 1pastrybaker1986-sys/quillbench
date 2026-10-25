import Tesseract from "tesseract.js";
import { cropToDetectedPage } from "./pageDetect";

/** Longest edge after downsample — keeps OCR fast without crushing typewritten glyphs. */
export const OCR_MAX_EDGE = 2000;

export const SCAN_ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

const SCAN_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function isScanImage(file: File): boolean {
  if (SCAN_TYPES.has(file.type)) return true;
  return /\.(png|jpe?g|webp)$/i.test(file.name);
}

export type ScanProgress = {
  page: number;
  total: number;
  status: string;
};

export type ScanResult = {
  text: string;
  pagesRead: number;
  pagesWithText: number;
  skipped: number;
};

type TessWorker = Tesseract.Worker;

let workerPromise: Promise<TessWorker> | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function getWorker(): Promise<TessWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker("eng");
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      return worker;
    })().catch((err: unknown) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

async function resetWorker() {
  const pending = workerPromise;
  workerPromise = null;
  if (!pending) return;
  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    /* already gone */
  }
}

async function bitmapFromFile(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}

/** Downsample huge photos; paint to canvas so EXIF rotation is applied. */
export async function preparePageImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await bitmapFromFile(file);
  try {
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    if (srcW < 1 || srcH < 1) {
      throw new Error("Could not read that image");
    }
    const scale = Math.min(1, OCR_MAX_EDGE / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Could not prepare that page");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas;
  } finally {
    bitmap.close();
  }
}

export function cleanOcrText(raw: string): string {
  const normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n");

  const lines = normalized.split("\n").map((line) => {
    const start = line.search(/[A-Za-z\u201C\u201D"']/);
    if (start > 0) {
      const prefix = line.slice(0, start);
      if (!/[A-Za-z]/.test(prefix)) line = line.slice(start);
    }
    return line.replace(/[ \t]+$/g, "");
  });

  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    const letters = (trimmed.match(/\p{L}/gu) ?? []).length;
    if (letters === 0) return false;
    if (trimmed.length < 40 && letters / trimmed.length < 0.35) return false;
    return true;
  });

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function joinManuscript(existing: string, added: string): string {
  const a = existing.replace(/\s+$/, "");
  const b = added.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a}\n\n${b}`;
}

export type ScanOptions = {
  /** When true, detect the typed page and crop surroundings before OCR. Default off. */
  detectPage?: boolean;
};

async function ocrImageFilesInner(
  files: File[],
  onProgress: (progress: ScanProgress) => void,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const detectPage = Boolean(options.detectPage);
  const images = files.filter(isScanImage);
  const skipped = files.length - images.length;
  if (images.length === 0) {
    return { text: "", pagesRead: 0, pagesWithText: 0, skipped };
  }

  onProgress({ page: 0, total: images.length, status: "Preparing reader…" });
  const worker = await getWorker();

  const parts: string[] = [];
  for (let i = 0; i < images.length; i++) {
    try {
      if (detectPage) {
        onProgress({
          page: i + 1,
          total: images.length,
          status: `Finding page ${i + 1} of ${images.length}…`,
        });
      }
      const prepared = await preparePageImage(images[i]);
      const canvas = detectPage ? cropToDetectedPage(prepared) : prepared;
      onProgress({
        page: i + 1,
        total: images.length,
        status: `Reading page ${i + 1} of ${images.length}…`,
      });
      const { data } = await worker.recognize(canvas);
      const cleaned = cleanOcrText(data.text);
      if (cleaned) parts.push(cleaned);
    } catch {
      /* skip a bad page; keep going — no artificial caps */
    }
  }

  return {
    text: parts.join("\n\n"),
    pagesRead: images.length,
    pagesWithText: parts.length,
    skipped,
  };
}

/** Sequential OCR. Reuses one English Tesseract worker across pages and later scans. */
export function ocrImageFiles(
  files: File[],
  onProgress: (progress: ScanProgress) => void,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const run = async () => {
    try {
      return await ocrImageFilesInner(files, onProgress, options);
    } catch (err) {
      await resetWorker();
      throw err;
    }
  };
  const next = queue.then(run, run);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
