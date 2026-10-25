// @ts-nocheck -- rebuilt from the live production bundle (deploy 6add746e) on Oct 25, 2026.
// Live camera page scan: opens the rear camera, captures pages as JPEGs, and hands File[] back
// to Workspace for local OCR. Falls back to the photo picker on any camera error.
// TODO: rename minified locals and add types.
import React from "react";

export function checkCameraSupport(n) {
  return n.isSecureContext === false
    ? {
        ok: false,
        reason: "insecure",
      }
    : !n.mediaDevices || typeof n.mediaDevices.getUserMedia != "function"
      ? {
          ok: false,
          reason: "no-api",
        }
      : {
          ok: true,
        };
}
export function classifyCameraError(n) {
  switch (n && typeof n == "object" && "name" in n ? String(n.name) : "") {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "no-camera";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "busy";
    default:
      return "error";
  }
}
export function cameraFallbackMessage(n) {
  switch (n) {
    case "denied":
      return "Camera access is off — choose page photos instead.";
    case "no-camera":
      return "No camera found — choose page photos instead.";
    case "busy":
      return "The camera is in use by another app — choose page photos instead.";
    case "insecure":
      return "The camera needs a secure (https) page — choose page photos instead.";
    case "no-api":
      return "This browser can’t open the camera here — choose page photos instead.";
    default:
      return "Couldn’t start the camera — choose page photos instead.";
  }
}
function cameraConstraints(n) {
  const e = {
    width: {
      ideal: 1920,
    },
    height: {
      ideal: 1080,
    },
  };
  return n
    ? {
        audio: false,
        video: {
          deviceId: {
            exact: n,
          },
          ...e,
        },
      }
    : {
        audio: false,
        video: {
          facingMode: {
            ideal: "environment",
          },
          ...e,
        },
      };
}
function nextCameraId(n, e) {
  const t = n.filter(Boolean);
  if (t.length < 2) return null;
  const a = e ? t.indexOf(e) : -1;
  return t[(a + 1) % t.length];
}
function stopStream(n) {
  if (n)
    for (const e of n.getTracks())
      try {
        e.stop();
      } catch {}
}
function scanPageFileName(n) {
  return `scan-page-${String(n + 1).padStart(2, "0")}.jpg`;
}
function putPage(n, e, t) {
  if (t !== null && t >= 0 && t < n.length) {
    const a = n.slice();
    return ((a[t] = e), a);
  }
  return [...n, e];
}
function removePage(n, e) {
  return e < 0 || e >= n.length ? n : n.filter((t, a) => a !== e);
}
let captureSeq = 0;
export default function CameraScan({ onDone, onCancel, onFallback, onUploadInstead, replace }) {
  const s = React.useRef(null),
    u = React.useRef(null),
    f = React.useRef(null),
    d = React.useRef(null),
    h = React.useRef(0),
    p = React.useRef(false),
    g = React.useRef(null),
    x = React.useRef([]),
    b = React.useRef(onFallback);
  b.current = onFallback;
  const [w, S] = React.useState("starting"),
    [T, C] = React.useState([]),
    [O, D] = React.useState(null),
    [M, z] = React.useState([]),
    [q, B] = React.useState(false),
    [W, I] = React.useState(false),
    [re, se] = React.useState("");
  x.current = T;
  const R = React.useCallback(() => {
      ((h.current += 1),
        stopStream(d.current),
        (d.current = null),
        s.current && (s.current.srcObject = null));
    }, []),
    _ = React.useCallback(
      async (ae) => {
        R();
        const ge = h.current;
        S("starting");
        let Re;
        try {
          Re = await navigator.mediaDevices.getUserMedia(cameraConstraints(ae));
        } catch (He) {
          if (ge !== h.current || !p.current) return;
          b.current(classifyCameraError(He));
          return;
        }
        if (ge !== h.current || !p.current) {
          stopStream(Re);
          return;
        }
        d.current = Re;
        const Ce = Re.getVideoTracks()[0];
        ((g.current = Ce?.getSettings?.().deviceId ?? ae ?? null),
          Ce &&
            Ce.addEventListener("ended", () => {
              d.current === Re && p.current && S("paused");
            }));
        const Oe = s.current;
        if (Oe) {
          Oe.srcObject = Re;
          try {
            await Oe.play();
          } catch {}
        }
        if (!(ge !== h.current || !p.current)) {
          (S("live"), u.current?.focus());
          try {
            const Ie = ((await navigator.mediaDevices.enumerateDevices?.()) ?? [])
              .filter((Ke) => Ke.kind === "videoinput" && Ke.deviceId)
              .map((Ke) => Ke.deviceId);
            p.current && z(Array.from(new Set(Ie)));
          } catch {}
        }
      },
      [R],
    );
  (React.useEffect(() => {
    p.current = true;
    const ae = document.activeElement,
      ge = document.body.style.overflow;
    return (
      (document.body.style.overflow = "hidden"),
      u.current?.focus(),
      _(null),
      () => {
        ((p.current = false), R());
        for (const Re of x.current) URL.revokeObjectURL(Re.url);
        ((document.body.style.overflow = ge), ae?.focus?.());
      }
    );
  }, [_, R]),
    React.useEffect(() => {
      function ae() {
        document.visibilityState === "hidden"
          ? (R(), S("paused"))
          : p.current && !d.current && _(g.current);
      }
      return (
        document.addEventListener("visibilitychange", ae),
        window.addEventListener("pagehide", R),
        () => {
          (document.removeEventListener("visibilitychange", ae),
            window.removeEventListener("pagehide", R));
        }
      );
    }, [_, R]));
  async function j() {
    const ae = s.current;
    if (!(q || w !== "live" || !ae || !ae.videoWidth || !ae.videoHeight)) {
      B(true);
      try {
        const ge = document.createElement("canvas");
        ((ge.width = ae.videoWidth), (ge.height = ae.videoHeight));
        const Re = ge.getContext("2d", {
          alpha: false,
        });
        if (!Re) throw new Error("no canvas");
        Re.drawImage(ae, 0, 0, ge.width, ge.height);
        const Ce = await new Promise((Ke) => ge.toBlob(Ke, "image/jpeg", 0.92));
        if (!Ce || !p.current) {
          se("Couldn’t capture that page — try again");
          return;
        }
        const Oe = {
            id: ++captureSeq,
            blob: Ce,
            url: URL.createObjectURL(Ce),
          },
          He = O !== null && O < T.length ? O : null;
        He !== null && URL.revokeObjectURL(T[He].url);
        const Ie = putPage(T, Oe, He);
        (C(Ie),
          D(null),
          se(He !== null ? `Page ${He + 1} retaken` : `Page ${Ie.length} captured`),
          I(true),
          window.setTimeout(() => I(false), 160));
      } catch {
        se("Couldn’t capture that page — try again");
      } finally {
        (B(false), u.current?.focus());
      }
    }
  }
  function le(ae) {
    const ge = T[ae];
    ge &&
      (URL.revokeObjectURL(ge.url),
      C(removePage(T, ae)),
      O === ae ? D(null) : O !== null && O > ae && D(O - 1),
      se(`Page ${ae + 1} deleted`),
      u.current?.focus());
  }
  function Z(ae) {
    (D(O === ae ? null : ae),
      se(O === ae ? "Retake cancelled" : `Capture to replace page ${ae + 1}`),
      u.current?.focus());
  }
  function Y() {
    const ae = T.length;
    return ae === 0 ? true : window.confirm(`Discard ${ae} captured page${ae === 1 ? "" : "s"}?`);
  }
  function Te() {
    Y() && (R(), onCancel());
  }
  function Q() {
    Y() && (R(), onUploadInstead());
  }
  function J() {
    if (T.length === 0) return;
    R();
    const ae = Date.now(),
      ge = T.map(
        (Re, Ce) =>
          new File([Re.blob], scanPageFileName(Ce), {
            type: "image/jpeg",
            lastModified: ae + Ce,
          }),
      );
    onDone(ge);
  }
  function E() {
    const ae = nextCameraId(M, g.current);
    ae && _(ae);
  }
  function F(ae) {
    if (ae.key === "Escape") {
      (ae.preventDefault(), ae.stopPropagation(), Te());
      return;
    }
    if (ae.key !== "Tab" || !f.current) return;
    const ge = Array.from(
      f.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (ge.length === 0) return;
    const Re = ge[0],
      Ce = ge[ge.length - 1];
    ae.shiftKey && document.activeElement === Re
      ? (ae.preventDefault(), Ce.focus())
      : !ae.shiftKey && document.activeElement === Ce && (ae.preventDefault(), Re.focus());
  }
  const $ = T.length,
    ie = O !== null ? `Capture page ${O + 1} again` : `Capture page ${$ + 1}`;
  return (
    <div className="cam-backdrop">
      <div
        ref={f}
        className="cam-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cam-title"
        aria-describedby="cam-help"
        onKeyDown={F}
      >
        <div className="cam-head">
          <h2 id="cam-title" className="cam-title">
            {replace ? "Scan pages (replace)" : "Scan pages"}
          </h2>
          <button type="button" className="cam-close" aria-label="Close camera" onClick={Te}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className={`cam-stage${W ? " flash" : ""}`}>
          <video
            ref={s}
            className="cam-video"
            playsInline
            muted
            autoPlay
            aria-label="Camera preview"
          />
          {w === "starting" ? <p className="cam-overlay">Starting camera…</p> : null}
          {w === "paused" ? (
            <button
              type="button"
              className="cam-overlay cam-resume"
              onClick={() => {
                _(g.current);
              }}
            >
              Camera paused — tap to resume
            </button>
          ) : null}
          {M.length > 1 && w === "live" ? (
            <button type="button" className="cam-switch" aria-label="Switch camera" onClick={E}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path
                  d="M4 8h3l2-2h6l2 2h3v11H4zM9 13a3 3 0 0 0 5.2 2M15 13a3 3 0 0 0-5.2-2M14 15.5V13h-2.5M10 10.5V13h2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
        <p id="cam-help" className="cam-help">
          {O !== null
            ? `Retaking page ${O + 1} — capture to replace it.`
            : "Hold the page flat and fill the frame. Capture each page, then Done."}
        </p>
        <div className="cam-controls">
          <button
            ref={u}
            type="button"
            className="cam-capture"
            aria-label={ie}
            aria-disabled={w !== "live" || q}
            onClick={() => {
              j();
            }}
          >
            <span className="cam-capture-dot" aria-hidden="true" />
            <span className="cam-capture-text">Capture</span>
          </button>
          <button
            type="button"
            className="btn-export primary cam-done"
            disabled={$ === 0}
            aria-label={
              $ === 0 ? "Done (capture a page first)" : `Done — read ${$} page${$ === 1 ? "" : "s"}`
            }
            onClick={J}
          >
            {$ === 0 ? "Done" : `Done · ${$} page${$ === 1 ? "" : "s"}`}
          </button>
        </div>
        {$ > 0 ? (
          <ol className="cam-strip" aria-label="Captured pages">
            {T.map((ae, ge) => (
              <li className={`cam-thumb${O === ge ? " is-retake" : ""}`} key={ae.id}>
                <img src={ae.url} alt={`Page ${ge + 1}`} />
                <span className="cam-thumb-no" aria-hidden="true">
                  {ge + 1}
                </span>
                <span className="cam-thumb-actions">
                  <button
                    type="button"
                    aria-label={`Retake page ${ge + 1}`}
                    aria-pressed={O === ge}
                    onClick={() => Z(ge)}
                  >
                    Retake
                  </button>
                  <button type="button" aria-label={`Delete page ${ge + 1}`} onClick={() => le(ge)}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        <button type="button" className="linkish cam-upload" onClick={Q}>
          Upload a photo instead
        </button>
        <p className="sr-only" role="status" aria-live="polite">
          {re}
        </p>
      </div>
    </div>
  );
}
