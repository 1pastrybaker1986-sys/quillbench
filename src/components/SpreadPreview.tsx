import type { Book } from "../lib/types";
import { parseManuscript } from "../lib/sampleManuscript";

type Props = { book: Book };

export default function SpreadPreview({ book }: Props) {
  const inches = book.trim === "6x9" ? { w: 6, h: 9 } : { w: 5.5, h: 8.5 };
  const scale = 52;
  const width = inches.w * scale;
  const height = inches.h * scale;
  const parsed = parseManuscript(book.manuscriptText ?? "");
  const chapter = parsed.chapters[0];
  const paras = chapter?.paragraphs ?? [];
  const split = Math.max(1, Math.ceil(paras.length / 2));
  const versoParas = paras.slice(0, split);
  const rectoParas = paras.slice(split);
  const empty = parsed.chapters.length === 0;

  return (
    <div className="spread" aria-label="Print spread preview">
      <article className="page verso" style={{ width, height }}>
        <div className="page-inner">
          <div className="running">{book.title}</div>
          {empty ? (
            <p className="preview-empty">Paste or drop a chapter in the Manuscript rail.</p>
          ) : (
            <>
              {chapter?.label ? (
                <div className="ch-label">{chapter.label}</div>
              ) : null}
              {chapter?.title ? (
                <h2 className="ch-title">{chapter.title}</h2>
              ) : null}
              <div className="prose">
                {versoParas.map((para, i) => (
                  <p key={i} className={i === 0 ? "first" : undefined}>
                    {para}
                  </p>
                ))}
              </div>
            </>
          )}
          <div className="folio">2</div>
        </div>
      </article>
      <article className="page recto" style={{ width, height }}>
        <div className="page-inner">
          <div className="running">{book.title}</div>
          <div className="prose" style={{ marginTop: empty ? undefined : "2.2rem" }}>
            {rectoParas.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          <div className="folio">3</div>
        </div>
      </article>
    </div>
  );
}
