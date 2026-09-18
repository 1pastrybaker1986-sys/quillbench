/**
 * Cloud Save feature flag (Netlify Identity + Blobs path).
 * Default OFF — production / Soft-FAIL builds must never call Identity or Blobs.
 *
 * Local enable (dev only): set VITE_CLOUD_SAVE=on in .env.local, then restart Vite.
 * Do NOT set this on Netlify production until CoS → Sarah Soft-PASS.
 */

export const CLOUD_SAVE_ENV_KEY = "VITE_CLOUD_SAVE" as const;

export function isCloudSaveEnabled(): boolean {
  const raw = (import.meta.env.VITE_CLOUD_SAVE as string | undefined)?.trim().toLowerCase();
  if (!raw) return false;
  return raw === "on" || raw === "1" || raw === "true" || raw === "yes";
}

/** Honest UI line while cloud is off (or not Soft-PASSed Live). */
export function cloudSaveStatusLine(): string {
  if (isCloudSaveEnabled()) {
    return "Cloud Save flag ON (dev) · Identity not Live";
  }
  return "Saved on this device · Cloud Save coming";
}
