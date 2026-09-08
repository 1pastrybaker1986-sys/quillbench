/** Detect the manuscript paper region in a phone photo (crop out hands/desk). */

export type PageRect = { x: number; y: number; w: number; h: number };

const ANALYSIS_MAX = 420;

function lumaOf(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chromaOf(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/** Rough skin / warm hand cue — paper is near-neutral cream. */
function looksLikeSkin(r: number, g: number, b: number): boolean {
  if (r < 70 || g < 40 || b < 25) return false;
  if (r <= g + 8) return false;
  if (r <= b + 12) return false;
  const c = chromaOf(r, g, b);
  if (c < 18) return false;
  // Hands in frame are often mid-bright with noticeable chroma.
  const L = lumaOf(r, g, b);
  return L > 55 && L < 210 && c > 22;
}

function trimEnds(frac: Float64Array, lo: number): [number, number] {
  let i0 = 0;
  let i1 = frac.length - 1;
  while (i0 < i1 && frac[i0] < lo) i0 += 1;
  while (i1 > i0 && frac[i1] < lo) i1 -= 1;
  return [i0, i1];
}

/**
 * Find an axis-aligned crop of the typed page on a prepared canvas.
 * Returns null when detection is unsure — caller should OCR the full frame.
 */
export function detectPageRect(source: HTMLCanvasElement): PageRect | null {
  const sw = source.width;
  const sh = source.height;
  if (sw < 32 || sh < 32) return null;

  const scale = Math.min(1, ANALYSIS_MAX / Math.max(sw, sh));
  const aw = Math.max(1, Math.round(sw * scale));
  const ah = Math.max(1, Math.round(sh * scale));

  const tmp = document.createElement("canvas");
  tmp.width = aw;
  tmp.height = ah;
  const tctx = tmp.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!tctx) return null;
  tctx.drawImage(source, 0, 0, aw, ah);
  const { data } = tctx.getImageData(0, 0, aw, ah);

  const luma = new Float32Array(aw * ah);
  const chroma = new Float32Array(aw * ah);
  const skin = new Uint8Array(aw * ah);
  for (let i = 0, p = 0; i < luma.length; i += 1, p += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    luma[i] = lumaOf(r, g, b);
    chroma[i] = chromaOf(r, g, b);
    if (looksLikeSkin(r, g, b)) skin[i] = 1;
  }

  const cy = Math.floor(ah / 2);
  const cx = Math.floor(aw / 2);
  let paperSum = 0;
  let chromaSum = 0;
  let n = 0;
  for (let y = cy - 10; y <= cy + 10; y += 1) {
    for (let x = cx - 10; x <= cx + 10; x += 1) {
      if (y < 0 || y >= ah || x < 0 || x >= aw) continue;
      const i = y * aw + x;
      paperSum += luma[i];
      chromaSum += chroma[i];
      n += 1;
    }
  }
  if (n < 1) return null;
  const paperRef = paperSum / n;
  const chromaRef = chromaSum / n;

  let thrL = Math.max(135, paperRef - 28);
  let thrC = Math.max(40, chromaRef + 35);
  const mask = new Uint8Array(aw * ah);
  let paperCount = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (skin[i]) continue;
    if (luma[i] >= thrL && chroma[i] <= thrC) {
      mask[i] = 1;
      paperCount += 1;
    }
  }
  if (paperCount / mask.length < 0.2) {
    thrL = Math.max(125, paperRef - 38);
    thrC = Math.max(55, chromaRef + 50);
    paperCount = 0;
    for (let i = 0; i < mask.length; i += 1) {
      if (!skin[i] && luma[i] >= thrL && chroma[i] <= thrC) {
        mask[i] = 1;
        paperCount += 1;
      } else {
        mask[i] = 0;
      }
    }
  }
  if (paperCount < 1) return null;

  let seedY = cy;
  let seedX = cx;
  if (!mask[seedY * aw + seedX]) {
    let best = Infinity;
    for (let y = 0; y < ah; y += 1) {
      for (let x = 0; x < aw; x += 1) {
        if (!mask[y * aw + x]) continue;
        const d = (y - cy) * (y - cy) + (x - cx) * (x - cx);
        if (d < best) {
          best = d;
          seedY = y;
          seedX = x;
        }
      }
    }
    if (!Number.isFinite(best)) return null;
  }

  const visited = new Uint8Array(aw * ah);
  const qx = new Int32Array(aw * ah);
  const qy = new Int32Array(aw * ah);
  let qh = 0;
  let qt = 0;
  qx[qt] = seedX;
  qy[qt] = seedY;
  qt += 1;
  visited[seedY * aw + seedX] = 1;
  let minx = seedX;
  let maxx = seedX;
  let miny = seedY;
  let maxy = seedY;
  let flood = 0;

  while (qh < qt) {
    const x = qx[qh];
    const y = qy[qh];
    qh += 1;
    flood += 1;
    if (x < minx) minx = x;
    if (x > maxx) maxx = x;
    if (y < miny) miny = y;
    if (y > maxy) maxy = y;
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= aw || ny >= ah) continue;
      const i = ny * aw + nx;
      if (visited[i] || !mask[i]) continue;
      visited[i] = 1;
      qx[qt] = nx;
      qy[qt] = ny;
      qt += 1;
    }
  }

  const rw = maxx - minx + 1;
  const rh = maxy - miny + 1;
  if (rw < 8 || rh < 8) return null;

  const rowFrac = new Float64Array(rh);
  const colFrac = new Float64Array(rw);
  const colSkin = new Float64Array(rw);
  for (let y = miny; y <= maxy; y += 1) {
    let row = 0;
    for (let x = minx; x <= maxx; x += 1) {
      const i = y * aw + x;
      if (visited[i]) {
        row += 1;
        colFrac[x - minx] += 1;
      }
      if (skin[i]) colSkin[x - minx] += 1;
    }
    rowFrac[y - miny] = row / rw;
  }
  for (let x = 0; x < rw; x += 1) {
    colFrac[x] /= rh;
    colSkin[x] /= rh;
  }

  let [r0, r1] = trimEnds(rowFrac, 0.28);
  let [c0, c1] = trimEnds(colFrac, 0.22);

  // Peel columns that are mostly skin / hand at the outer edges.
  while (c0 < c1 && colSkin[c0] > 0.12 && colFrac[c0] < 0.55) c0 += 1;
  while (c1 > c0 && colSkin[c1] > 0.12 && colFrac[c1] < 0.55) c1 -= 1;

  let x0 = minx + c0;
  let x1 = minx + c1 + 1;
  let y0 = miny + r0;
  let y1 = miny + r1 + 1;
  const pad = Math.max(2, Math.round(0.01 * Math.max(aw, ah)));
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(aw, x1 + pad);
  y1 = Math.min(ah, y1 + pad);

  const fx0 = Math.max(0, Math.floor(x0 / scale));
  const fy0 = Math.max(0, Math.floor(y0 / scale));
  const fx1 = Math.min(sw, Math.ceil(x1 / scale));
  const fy1 = Math.min(sh, Math.ceil(y1 / scale));
  const fw = fx1 - fx0;
  const fh = fy1 - fy0;
  const areaFrac = (fw * fh) / (sw * sh);
  const floodFrac = flood / (aw * ah);
  if (fw < 24 || fh < 24) return null;
  if (areaFrac < 0.25 || floodFrac < 0.15) return null;
  return { x: fx0, y: fy0, w: fw, h: fh };
}

/** Crop `source` to `rect`. Returns null if the crop is invalid. */
export function cropCanvas(
  source: HTMLCanvasElement,
  rect: PageRect,
): HTMLCanvasElement | null {
  if (rect.w < 24 || rect.h < 24) return null;
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > source.width || rect.y + rect.h > source.height) {
    return null;
  }
  const out = document.createElement("canvas");
  out.width = rect.w;
  out.height = rect.h;
  const ctx = out.getContext("2d", { alpha: false });
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, rect.w, rect.h);
  ctx.drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return out;
}

/** Detect page and crop; falls back to the original canvas. */
export function cropToDetectedPage(source: HTMLCanvasElement): HTMLCanvasElement {
  try {
    const rect = detectPageRect(source);
    if (!rect) return source;
    const areaSaved = 1 - (rect.w * rect.h) / (source.width * source.height);
    const sideTrim =
      rect.x > 8 ||
      rect.y > 8 ||
      rect.x + rect.w < source.width - 8 ||
      rect.y + rect.h < source.height - 8;
    if (areaSaved < 0.02 && !sideTrim) return source;
    return cropCanvas(source, rect) ?? source;
  } catch {
    return source;
  }
}
