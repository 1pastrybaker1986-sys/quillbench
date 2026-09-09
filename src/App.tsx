import { useEffect, useMemo, useState } from "react";
import Toast from "./components/Toast";
import { purchase, type PackageId } from "./lib/packages";
import { getSession } from "./lib/store";
import type { Session } from "./lib/types";
import Landing from "./screens/Landing";
import Library from "./screens/Library";
import Privacy from "./screens/Privacy";
import Terms from "./screens/Terms";
import Workspace from "./screens/Workspace";

type LegalPage = "privacy" | "terms";

type Route =
  | { name: "landing" }
  | { name: "library" }
  | { name: "workspace"; bookId: string }
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

export default function App() {
  const boot = useMemo(() => getSession(), []);
  const [session, setSession] = useState<Session | null>(boot);
  const [route, setRoute] = useState<Route>(() => initialRoute(boot));
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);

  useEffect(() => {
    setCheckoutBanner(consumeCheckoutReturn());
  }, []);

  function openLegal(page: LegalPage) {
    setLegalUrl(page);
    setRoute({ name: page });
  }

  function leaveLegal() {
    setLegalUrl(null);
    setRoute(session ? { name: "library" } : { name: "landing" });
  }

  const banner =
    checkoutBanner && (
      <Toast message={checkoutBanner} onDone={() => setCheckoutBanner(null)} />
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
          session={session}
          bookId={route.bookId}
          onBack={() => setRoute({ name: "library" })}
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
