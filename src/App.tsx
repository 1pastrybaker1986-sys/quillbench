import { useEffect, useMemo, useState } from "react";
import Toast from "./components/Toast";
import { purchase, type PackageId } from "./lib/packages";
import { isCloudSaveEnabled } from "./lib/cloudSaveFlag";
import { finishIdentityLoginAndMigrate } from "./lib/netlifyCloudSave";
import { createBook, getSession, listBooks, startLocalSession } from "./lib/store";
import type { ModuleId, Session } from "./lib/types";
import Landing from "./screens/Landing";
import Library from "./screens/Library";
import Privacy from "./screens/Privacy";
import Terms from "./screens/Terms";
import Workspace from "./screens/Workspace";

type LegalPage = "privacy" | "terms";

type Route =
  | { name: "landing" }
  | { name: "library" }
  | {
      name: "workspace";
      bookId: string;
      initialModule?: ModuleId;
      autoScan?: boolean;
    }
  | { name: LegalPage };

function readLegalFromUrl(): LegalPage | null {
  try {
    const q = new URLSearchParams(window.location.search).get("page");
    if (q === "privacy" || q === "terms") return q;
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (hash === "privacy" || hash === "terms") return hash;
  } catch {
    /* ignore */
  }
  return null;
}

function setLegalUrl(page: LegalPage | null) {
  try {
    const url = new URL(window.location.href);
    if (page) {
      url.searchParams.set("page", page);
      url.hash = "";
    } else {
      url.searchParams.delete("page");
    }
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  } catch {
    /* ignore */
  }
}

const PACKAGE_IDS = new Set<string>(["full-edit", "cover-design", "marketing", "studio-bundle"]);

/** Handle Stripe Checkout return query params once on boot. */
function consumeCheckoutReturn(): string | null {
  try {
    const url = new URL(window.location.href);
    const checkout = url.searchParams.get("checkout");
    if (!checkout) return null;

    const pkg = url.searchParams.get("pkg");
    let banner: string | null = null;

    if (checkout === "success" && pkg && PACKAGE_IDS.has(pkg)) {
      purchase(pkg as PackageId);
      banner = "Payment successful — package unlocked on this device.";
    } else if (checkout === "cancel") {
      banner = "Checkout canceled — no charge was made.";
    }

    url.searchParams.delete("checkout");
    url.searchParams.delete("pkg");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    return banner;
  } catch {
    return null;
  }
}

function initialRoute(session: Session | null): Route {
  const legal = readLegalFromUrl();
  if (legal) return { name: legal };
  if (!session) return { name: "landing" };
  return { name: "library" };
}

function resolveBookForScan(session: Session): string {
  const books = listBooks(session.userId);
  if (books.length > 0) return books[0].id;
  return createBook(session.userId, "Scanned pages").id;
}

function isHostNoiseBanner(message: string): boolean {
  return /blobs|identity jwt|identity is not enabled|identity handshake|not Live|GoTrue|magic-link login first/i.test(
    message,
  );
}

export default function App() {
  const boot = useMemo(() => getSession(), []);
  const [session, setSession] = useState<Session | null>(boot);
  const [route, setRoute] = useState<Route>(() => initialRoute(boot));
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);

  useEffect(() => {
    setCheckoutBanner(consumeCheckoutReturn());
  }, []);

  // If a magic-link hash arrives while the SPA is already open, finish Identity again.
  useEffect(() => {
    if (!isCloudSaveEnabled()) return;
    function onHash() {
      const h = window.location.hash || "";
      if (!/(confirmation_token|recovery_token|invite_token|access_token)=/.test(h)) return;
      void (async () => {
        try {
          const { session: next, migrateMessage } = await finishIdentityLoginAndMigrate();
          if (!next) return;
          setSession(next);
          setLegalUrl(null);
          setRoute({ name: "library" });
          if (migrateMessage) setCheckoutBanner(migrateMessage);
        } catch (e) {
          setCheckoutBanner(
            e instanceof Error ? e.message : "Identity handshake failed (not Live).",
          );
        }
      })();
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Flag ON only: complete Identity magic-link / recover tokens, then migrate-this-device WIP.
  useEffect(() => {
    if (!isCloudSaveEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        const { session: next, migrateMessage } = await finishIdentityLoginAndMigrate();
        if (cancelled || !next) return;
        setSession(next);
        setLegalUrl(null);
        setRoute({ name: "library" });
        if (migrateMessage) setCheckoutBanner(migrateMessage);
      } catch (e) {
        if (!cancelled) {
          setCheckoutBanner(
            e instanceof Error ? e.message : "Identity handshake failed (not Live).",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openLegal(page: LegalPage) {
    setLegalUrl(page);
    setRoute({ name: page });
  }

  function leaveLegal() {
    setLegalUrl(null);
    setRoute(session ? { name: "library" } : { name: "landing" });
  }

  function openScanWorkspace(next: Session) {
    setSession(next);
    setLegalUrl(null);
    const bookId = resolveBookForScan(next);
    setRoute({
      name: "workspace",
      bookId,
      initialModule: "write",
      autoScan: true,
    });
  }

  const quietBanner =
    checkoutBanner && !isHostNoiseBanner(checkoutBanner) ? checkoutBanner : null;
  const banner =
    quietBanner && (
      <Toast message={quietBanner} onDone={() => setCheckoutBanner(null)} />
    );

  if (route.name === "privacy") {
    return (
      <>
        {banner}
        <Privacy onBack={leaveLegal} />
      </>
    );
  }

  if (route.name === "terms") {
    return (
      <>
        {banner}
        <Terms onBack={leaveLegal} />
      </>
    );
  }

  if (!session || route.name === "landing") {
    return (
      <>
        {banner}
        <Landing
          onSignedIn={(next) => {
            setSession(next);
            setLegalUrl(null);
            setRoute({ name: "library" });
          }}
          onScanStart={() => {
            const next = getSession() ?? startLocalSession();
            openScanWorkspace(next);
          }}
          onOpenPrivacy={() => openLegal("privacy")}
          onOpenTerms={() => openLegal("terms")}
        />
      </>
    );
  }

  if (route.name === "workspace") {
    return (
      <>
        {banner}
        <Workspace
          key={route.bookId}
          session={session}
          bookId={route.bookId}
          initialModule={route.initialModule}
          autoScan={route.autoScan}
          onBack={() => setRoute({ name: "library" })}
          onSignOut={() => {
            setSession(null);
            setLegalUrl(null);
            setRoute({ name: "landing" });
          }}
          onOpenBook={(bookId) => setRoute({ name: "workspace", bookId })}
        />
      </>
    );
  }

  return (
    <>
      {banner}
      <Library
        session={session}
        onOpenBook={(bookId) => setRoute({ name: "workspace", bookId })}
        onSignOut={() => {
          setSession(null);
          setLegalUrl(null);
          setRoute({ name: "landing" });
        }}
        onOpenPrivacy={() => openLegal("privacy")}
        onOpenTerms={() => openLegal("terms")}
      />
    </>
  );
}
