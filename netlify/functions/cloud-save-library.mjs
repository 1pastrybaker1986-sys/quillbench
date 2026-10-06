/**
 * Quillbench Cloud Save v0 — Netlify Blobs pull/push for library JSON.
 *
 * Soft-FAIL sketch: only invoked when the client has VITE_CLOUD_SAVE=on and a
 * Netlify Identity JWT. Do NOT enable Identity in production until Soft-PASS.
 *
 * Env (Netlify site / `netlify dev`):
 * - Identity: enable on the site (dashboard → Identity). JWT via Authorization
 *   Bearer or Netlify Identity gateway → context.clientContext.user
 * - QUILLBENCH_BLOB_STORE — Blobs store name (default: quillbench-cloud-save)
 * - Optional API-mode fallback when not on Netlify runtime:
 *   NETLIFY_BLOBS_SITE_ID + NETLIFY_BLOBS_TOKEN (or NETLIFY_API_TOKEN)
 *
 * Key: owners/{identity.sub}/library.v0.json
 * Body (PUT): { payload: CloudSyncPayloadV0 }
 * Response (GET): { payload: CloudSyncPayloadV0 | null }
 */

import { connectLambda, getStore } from "@netlify/blobs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
};

const KIND = "quillbench.cloud.v0";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function storeName() {
  return process.env.QUILLBENCH_BLOB_STORE?.trim() || "quillbench-cloud-save";
}

function ownerKey(sub) {
  return `owners/${sub}/library.v0.json`;
}

function resolveUser(event, context) {
  const fromContext = context?.clientContext?.user;
  if (fromContext?.sub) {
    return {
      sub: fromContext.sub,
      email: fromContext.email || fromContext?.user_metadata?.email || "",
    };
  }
  // Only trust the user Netlify Identity verified (signature checked by the gateway).
  // Never decode an unverified Bearer token here.
  return null;
}

function openStore(event) {
  try {
    connectLambda(event);
  } catch {
    /* connectLambda only needed in Lambda compatibility mode */
  }

  const name = storeName();
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID?.trim() || process.env.SITE_ID?.trim();
  const token =
    process.env.NETLIFY_BLOBS_TOKEN?.trim() ||
    process.env.NETLIFY_API_TOKEN?.trim() ||
    process.env.BLOBS_TOKEN?.trim();

  if (siteID && token) {
    return getStore({ name, siteID, token });
  }
  return getStore(name);
}

function isValidPayload(payload) {
  return (
    payload &&
    typeof payload === "object" &&
    payload.version === 0 &&
    payload.kind === KIND &&
    Array.isArray(payload.books)
  );
}

export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const user = resolveUser(event, context);
  if (!user?.sub) {
    return json(401, {
      error: "Sign-in required.",
    });
  }

  let store;
  try {
    store = openStore(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(503, {
      error: `Blobs store unavailable (${storeName()}). Set QUILLBENCH_BLOB_STORE / NETLIFY_BLOBS_SITE_ID + token. ${message}`,
    });
  }

  const key = ownerKey(user.sub);

  if (event.httpMethod === "GET") {
    try {
      const payload = await store.get(key, { type: "json" });
      return json(200, {
        payload: payload ?? null,
        message: payload ? "Library loaded from Blobs." : "No cloud library yet for this owner.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json(502, { error: `Blobs GET failed: ${message}` });
    }
  }

  if (event.httpMethod === "PUT") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON body." });
    }
    const payload = body.payload ?? body;
    if (!isValidPayload(payload)) {
      return json(400, {
        error: `Body must be { payload: CloudSyncPayloadV0 } with kind ${KIND}.`,
      });
    }
    // Bind owner to Identity sub
    payload.session = {
      ...(payload.session || {}),
      userId: user.sub,
      email: payload.session?.email || user.email,
    };
    try {
      await store.setJSON(key, payload);
      return json(200, {
        message: `Copied ${payload.books.length} book(s) to your Quillbench account.`,
        payload,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json(502, { error: `Blobs PUT failed: ${message}` });
    }
  }

  return json(405, { error: "Method not allowed. Use GET or PUT." });
}
