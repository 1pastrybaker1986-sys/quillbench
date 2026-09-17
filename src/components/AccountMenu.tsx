import { useEffect, useId, useRef, useState } from "react";
import Nib from "./Nib";
import { signOut } from "../lib/store";
import type { Session } from "../lib/types";

type Props = {
  session: Session;
  onSignOut: () => void;
};

export default function AccountMenu({ session, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
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
    signOut();
    onSignOut();
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
          </div>
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
