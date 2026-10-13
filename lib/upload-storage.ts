import { isAbsolute, join } from "node:path";

/**
 * Physical location of runtime media uploads.
 *
 * Managed Node deployments (e.g. Hostinger hbuilds) replace the application
 * directory on every redeploy, so anything written under `<cwd>/public/uploads`
 * is disposable. Production sets `UPLOAD_STORAGE_DIR` to a persistent writable
 * directory owned by the hosting account, outside the managed deployment tree.
 *
 * The public URL contract never changes: a stored media path is always
 * `/uploads/<uuid>.<ext>`, and `app/uploads/[...file]/route.ts` streams the bytes
 * from whichever directory this module resolves.
 */

let warned = false;

// Next loads config/pages during `next build` with NODE_ENV=production even
// though the runtime env vars are not present yet — don't warn about a
// misconfiguration that only matters at runtime.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

function warnOnce(message: string) {
  if (warned || isBuildPhase) return;
  warned = true;
  console.warn(`[uploads] ${message}`);
}

/**
 * The directory uploads live in.
 *
 * - `UPLOAD_STORAGE_DIR` set to an absolute path → that directory.
 * - set to anything else (relative, empty, malformed) → falls back to the
 *   deployment directory, but flags the misconfiguration once. Health reports it
 *   as degraded so it cannot pass silently.
 * - unset → `<cwd>/public/uploads`, which is correct for local development and
 *   legacy single-directory deployments.
 */
export function resolveUploadStorageDir(): string {
  const configured = (process.env.UPLOAD_STORAGE_DIR ?? "").trim();

  if (configured && isAbsolute(configured)) return configured;

  if (configured) {
    warnOnce(
      `UPLOAD_STORAGE_DIR="${configured}" is not an absolute path; using the deployment directory instead. ` +
        `Set an absolute, persistent, writable path in production.`,
    );
  } else if (process.env.NODE_ENV === "production") {
    warnOnce(
      "UPLOAD_STORAGE_DIR is not set; media is stored under <cwd>/public/uploads, " +
        "which a managed redeploy can replace. Set it to a persistent writable directory.",
    );
  }

  return join(process.cwd(), "public", "uploads");
}

/** Absolute path of one uploaded file inside the storage directory. */
export function uploadPath(filename: string): string {
  return join(resolveUploadStorageDir(), filename);
}

/** True when a persistent directory is configured and usable. */
export function isUploadStorageConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return isAbsolute((env.UPLOAD_STORAGE_DIR ?? "").trim());
}
