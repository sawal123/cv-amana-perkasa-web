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

/**
 * Strict origin parser for deployment configuration (SITE_URL) and the canonical.
 *
 * Same rules as parseHttpUrl plus one: the pathname must be exactly "/". Origin
 * config is not a URL with a sub-path, so `https://example.com/app` is rejected
 * rather than silently reduced to `https://example.com`. Failing closed here means
 * a mistyped SITE_URL surfaces in health/preflight instead of quietly producing
 * different canonical / robots / sitemap / JSON-LD URLs than the operator wrote.
 */
export function parseSiteOrigin(value: unknown): URL | null {
  const url = parseHttpUrl(value);
  if (!url) return null;
  if (url.pathname !== "/") return null;
  return url;
}

/** `https://example.com/` → `https://example.com` (drops the trailing slash). */
function normalizeOrigin(url: URL): string {
  return url.origin;
}

/**
 * The deployment origin from SITE_URL, or null when it is unset, malformed, or
 * carries a path/query/hash/credentials. A path-bearing value is NOT stripped.
 */
export function getSiteOrigin(): string | null {
  const url = parseSiteOrigin(process.env.SITE_URL ?? "");
  return url ? normalizeOrigin(url) : null;
}

/**
 * Canonical resolution order: a valid CMS canonical origin wins, then a valid
 * SITE_URL origin, otherwise nothing. This site has exactly one public canonical
 * route (`/`), so a path-bearing canonical is treated as malformed and ignored —
 * the homepage never 500s and simply falls back or omits the tag.
 */
export function resolveCanonical(cmsCanonical: unknown): string | null {
  const url = parseSiteOrigin(cmsCanonical);
  return url ? normalizeOrigin(url) : getSiteOrigin();
}

/**
 * Resolves a (usually site-relative) asset path against the canonical origin.
 * Returns null when it cannot produce a safe absolute URL, so a caller never emits
 * a half-qualified or off-host Open Graph image.
 *
 * An absolute value must be plain http(s). A relative value must be a single-host
 * site-relative path starting with exactly one "/" — protocol-relative values
 * (`//evil.example.com`) and bare relatives (`uploads/a.png`) are refused rather
 * than being resolved against the production origin.
 */
export function absoluteUrl(value: unknown, origin: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const absolute = parseHttpUrl(trimmed);
  if (absolute) return absolute.toString();

  if (!origin) return null;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;

  try {
    return new URL(trimmed, origin).toString();
  } catch {
    return null;
  }
}
