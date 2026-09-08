import JSZip from "jszip";
import type { Book } from "./types";
import { chapterNavTitle, parseManuscript } from "./sampleManuscript";
import { bookSlug } from "./printPdf";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xhtml(title: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
${body}
</body>
</html>`;
}

const STYLES = `body { font-family: Georgia, "Times New Roman", serif; line-height: 1.45; margin: 1.2em; color: #1c1612; }
h1 { font-size: 1.6em; font-weight: 600; text-align: center; margin: 2em 0 0.4em; }
h2 { font-size: 1.15em; font-weight: 600; text-align: center; margin: 1.5em 0 0.75em; }
.subtitle, .author { text-align: center; color: #444; }
.author { margin-top: 2em; font-style: italic; }
.copyright { margin-top: 3em; font-size: 0.95em; }
.dedication { text-align: center; font-style: italic; margin-top: 4em; }
p { margin: 0 0 0.85em; text-indent: 1.2em; }
p.first { text-indent: 0; }
.chapter-label { text-align: center; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.85em; color: #666; margin-top: 2em; }
.cover { text-align: center; margin: 0; }
.cover img { max-width: 100%; height: auto; }
`;

function coverMedia(ct: string): { mediaType: string; ext: string } {
  const t = ct.toLowerCase();
  if (t.includes("jpeg") || t.includes("jpg")) return { mediaType: "image/jpeg", ext: "jpg" };
  if (t.includes("webp")) return { mediaType: "image/webp", ext: "webp" };
  return { mediaType: "image/png", ext: "png" };
}

async function maybeCover(
  zip: JSZip,
  book: Book,
): Promise<{ href: string; mediaType: string } | null> {
  const src = book.coverSrc?.trim();
  if (!src || src.startsWith("http")) return null;
  try {
    let buf: ArrayBuffer;
    let ct = "image/png";
    if (src.startsWith("data:")) {
      const comma = src.indexOf(",");
      if (comma < 0) return null;
      const header = src.slice(5, comma);
      const payload = src.slice(comma + 1);
      ct = header.split(";")[0] || "image/png";
      const bytes = header.toLowerCase().includes("base64")
        ? Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
        : new TextEncoder().encode(decodeURIComponent(payload));
      buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    } else {
      const res = await fetch(src);
      if (!res.ok) return null;
      buf = await res.arrayBuffer();
      ct = res.headers.get("content-type") || "image/png";
    }
    const { mediaType, ext } = coverMedia(ct);
    const href = `cover.${ext}`;
    zip.file(`OEBPS/${href}`, buf);
    return { href, mediaType };
  } catch {
    return null;
  }
}

export async function buildEbookEpub(book: Book): Promise<Uint8Array> {
  const zip = new JSZip();
  const title = book.title?.trim() || "Untitled";
  const author = book.authorName?.trim() || "Anonymous";
  const subtitle = book.subtitle?.trim() || "";
  const year = book.copyrightYear?.trim() || String(new Date().getFullYear());
  const publisher = book.publisherLine?.trim() || "";
  const dedication = book.dedication?.trim() || "";
  const parsed = parseManuscript(book.manuscriptText ?? "");
  const uid = `urn:quillbench:${book.id || bookSlug(title)}`;

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.folder("META-INF")!.file(
    "container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );

  const oebps = zip.folder("OEBPS")!;
  oebps.file("styles.css", STYLES);

  const cover = await maybeCover(zip, book);

  const spine: string[] = [];
  const manifest: string[] = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="css" href="styles.css" media-type="text/css"/>`,
  ];

  if (cover) {
    manifest.push(
      `<item id="cover-image" href="${cover.href}" media-type="${cover.mediaType}" properties="cover-image"/>`,
    );
    oebps.file(
      "cover.xhtml",
      xhtml(
        "Cover",
        `<div class="cover"><img src="${cover.href}" alt="Cover"/></div>`,
      ),
    );
    manifest.push(
      `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    );
    spine.push(`<itemref idref="cover"/>`);
  }

  oebps.file(
    "title.xhtml",
    xhtml(
      title,
      `<h1>${esc(title)}</h1>${
        subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ""
      }<p class="author">${esc(author)}</p>`,
    ),
  );
  manifest.push(
    `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`,
  );
  spine.push(`<itemref idref="title"/>`);

  const copyBits = [
    `<p class="first">Copyright © ${esc(year)} ${esc(author)}</p>`,
    publisher ? `<p>${esc(publisher)}</p>` : "",
    `<p>All rights reserved.</p>`,
  ]
    .filter(Boolean)
    .join("\n");
  oebps.file(
    "copyright.xhtml",
    xhtml("Copyright", `<div class="copyright">${copyBits}</div>`),
  );
  manifest.push(
    `<item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>`,
  );
  spine.push(`<itemref idref="copyright"/>`);

  if (dedication) {
    oebps.file(
      "dedication.xhtml",
      xhtml(
        "Dedication",
        `<p class="dedication first">${esc(dedication)}</p>`,
      ),
    );
    manifest.push(
      `<item id="dedication" href="dedication.xhtml" media-type="application/xhtml+xml"/>`,
    );
    spine.push(`<itemref idref="dedication"/>`);
  }

  const chapters =
    parsed.chapters.length > 0
      ? parsed.chapters
      : [{ paragraphs: [] as string[] }];

  const chapterFiles: { href: string; heading: string }[] = [];
  chapters.forEach((chapter, index) => {
    const n = index + 1;
    const href = `chapter-${n}.xhtml`;
    const id = `chapter-${n}`;
    const heading = chapterNavTitle(chapter, index === 0 ? title : `Chapter ${n}`);
    const chapHeading = [
      chapter.label
        ? `<p class="chapter-label first">${esc(chapter.label)}</p>`
        : "",
      chapter.title
        ? `<h2>${esc(chapter.title)}</h2>`
        : !chapter.label
          ? `<h2>${esc(heading)}</h2>`
          : "",
    ]
      .filter(Boolean)
      .join("\n");
    const paras =
      chapter.paragraphs.length > 0
        ? chapter.paragraphs
            .map(
              (p, i) =>
                `<p class="${i === 0 ? "first" : ""}">${esc(p)}</p>`,
            )
            .join("\n")
        : `<p class="first"> </p>`;
    oebps.file(href, xhtml(heading, `${chapHeading}\n${paras}`));
    manifest.push(
      `<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`,
    );
    spine.push(`<itemref idref="${id}"/>`);
    chapterFiles.push({ href, heading });
  });

  const navItems = [
    cover ? `<li><a href="cover.xhtml">Cover</a></li>` : "",
    `<li><a href="title.xhtml">Title</a></li>`,
    `<li><a href="copyright.xhtml">Copyright</a></li>`,
    dedication ? `<li><a href="dedication.xhtml">Dedication</a></li>` : "",
    ...chapterFiles.map(
      (ch) => `<li><a href="${ch.href}">${esc(ch.heading)}</a></li>`,
    ),
  ]
    .filter(Boolean)
    .join("\n");

  oebps.file(
    "nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head><meta charset="UTF-8"/><title>Contents</title></head>
<body>
  <nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${navItems}</ol></nav>
</body>
</html>`,
  );

  const metaCover = cover
    ? `<meta name="cover" content="cover-image"/>`
    : "";
  oebps.file(
    "package.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${esc(uid)}</dc:identifier>
    <dc:title>${esc(title)}</dc:title>
    <dc:creator>${esc(author)}</dc:creator>
    <dc:language>en</dc:language>
    <dc:date>${esc(year)}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
    ${metaCover}
  </metadata>
  <manifest>
    ${manifest.join("\n    ")}
  </manifest>
  <spine>
    ${spine.join("\n    ")}
  </spine>
</package>`,
  );

  const out = await zip.generateAsync({
    type: "uint8array",
    mimeType: "application/epub+zip",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return out;
}

export async function downloadEbookEpub(
  book: Book,
): Promise<{ filename: string; sizeBytes: number }> {
  const bytes = await buildEbookEpub(book);
  const filename = `${bookSlug(book.title)}-ebook.epub`;
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/epub+zip" });
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
