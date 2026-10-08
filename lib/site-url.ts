/**
 * Central URL normalization for the deployment origin.
 *
 * `SITE_URL` is the absolute deployment origin (e.g. https://amanaperkasa.co.id)
 * — infrastructure configuration, not a content field. The CMS canonical
 * (Settings → SEO & Meta) is the fallback. Both go through the same parser here
 * so a malformed value stored in the database can never reach `new URL` and
 * 500 the homepage: it resolves to null and the caller simply omits the tag.
 */

/**
 * Parses a value only when it is a plain absolute http(s) URL.
 *
 * Rejects everything a URL tag must never carry: a non-http scheme
 * (`javascript:`, `ftp:`), a protocol-relative value (`//example.com`, which has
 * no scheme and throws), credentials (`https://user:pass@…`, which would leak
 * into metadata), and any query or hash.
 */
export function parseHttpUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname) return null;
  if (url.username || url.password) return null;
  if (url.search || url.hash) return null;

  return url;
}

/** `https://example.com/` → `https://example.com` (drops path, trailing slash). */
function normalizeOrigin(url: URL): string {
  return url.origin;
}

/** The deployment origin from SITE_URL, or null when it is unset or malformed. */
export function getSiteOrigin(): string | null {
  const url = parseHttpUrl(process.env.SITE_URL ?? "");
  return url ? normalizeOrigin(url) : null;
}

/**
 * Canonical resolution order: a valid CMS canonical wins, then a valid SITE_URL,
 * otherwise nothing. The returned value is always an origin so it can safely back
 * both `metadataBase` and the OG image base.
 */
export function resolveCanonical(cmsCanonical: unknown): string | null {
  const url = parseHttpUrl(cmsCanonical);
  return url ? normalizeOrigin(url) : getSiteOrigin();
}

/**
 * Resolves a (usually site-relative) asset path against the canonical origin.
 * Returns null when it cannot produce an absolute URL, so a caller never emits a
 * half-qualified Open Graph image.
 */
export function absoluteUrl(value: unknown, origin: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const absolute = parseHttpUrl(trimmed);
  if (absolute) return absolute.toString();
  if (!origin) return null;

  try {
    return new URL(trimmed, origin).toString();
  } catch {
    return null;
  }
}
