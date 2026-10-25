import { useEffect, useId, useRef, useState } from "react";
import Nib from "./Nib";
import { signOut } from "../lib/store";
import { cloudSaveStatusLine, isCloudSaveEnabled } from "../lib/cloudSaveFlag";
import { identitySignOut } from "../lib/identityGoTrue";
import { downloadWipBackup, pickAndRestoreWipBackup } from "../lib/wipBackup";
import type { Session } from "../lib/types";

type Props = {
  session: Session;
  onSignOut: () => void;
  /** Optional: refresh Works in Progress after restore. */
  onLibraryChanged?: () => void;
};

export default function AccountMenu({ session, onSignOut, onLibraryChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSignOut() {
    setOpen(false);
    if (isCloudSaveEnabled()) {
      void identitySignOut().finally(() => onSignOut());
    } else {
      signOut();
      onSignOut();
    }
  }

  function handleDownloadBackup() {
    try {
      const { bookCount } = downloadWipBackup(session);
      setNote(`Downloaded backup (${bookCount} book${bookCount === 1 ? "" : "s"}).`);
    } catch {
      setNote("Could not download backup.");
    }
  }

  async function handleRestoreBackup() {
    const result = await pickAndRestoreWipBackup(session);
    setNote(result.message);
    if (result.ok) {
      onLibraryChanged?.();
    }
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <Nib className="nib" />
        <span className="wordmark">Quillbench</span>
        <span className="account-menu-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="account-menu-panel" id={menuId} role="menu" aria-label="Account">
          <div className="account-menu-identity" role="none">
            <div className="account-menu-name">{session.displayName}</div>
            {session.email ? (
              <div className="account-menu-email">{session.email}</div>
            ) : null}
            <div className="account-menu-save-hint">{cloudSaveStatusLine()}</div>
          </div>
          <button
            type="button"
            className="account-menu-item"
            role="menuitem"
            onClick={handleDownloadBackup}
          >
            Download Works in Progress backup
          </button>
          <button
            type="button"
            className="account-menu-item"
            role="menuitem"
            onClick={() => void handleRestoreBackup()}
          >
            Restore backup
          </button>
          {note ? (
            <div className="account-menu-note" role="status">
              {note}
            </div>
          ) : null}
          <button
            type="button"
            className="account-menu-item"
            role="menuitem"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
