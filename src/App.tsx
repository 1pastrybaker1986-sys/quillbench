import { useMemo, useState } from "react";
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

  function openLegal(page: LegalPage) {
    setLegalUrl(page);
    setRoute({ name: page });
  }

  function leaveLegal() {
    setLegalUrl(null);
    setRoute(session ? { name: "library" } : { name: "landing" });
  }

  if (route.name === "privacy") {
    return <Privacy onBack={leaveLegal} />;
  }

  if (route.name === "terms") {
    return <Terms onBack={leaveLegal} />;
  }

  if (!session || route.name === "landing") {
    return (
      <Landing
        onSignedIn={(next) => {
          setSession(next);
          setLegalUrl(null);
          setRoute({ name: "library" });
        }}
        onOpenPrivacy={() => openLegal("privacy")}
        onOpenTerms={() => openLegal("terms")}
      />
    );
  }

  if (route.name === "workspace") {
    return (
      <Workspace
        session={session}
        bookId={route.bookId}
        onBack={() => setRoute({ name: "library" })}
      />
    );
  }

  return (
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
  );
}
