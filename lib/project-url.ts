import type { Project } from "@/lib/types";

/**
 * Turns a project title into a URL slug.
 *
 * Rule (in order): decompose accents, lowercase, trim, drop every character that
 * is not an ASCII letter/digit/space/hyphen, collapse runs of whitespace into a
 * single "-", collapse repeated "-", then trim leading/trailing "-".
 *
 * The result is always a safe single path segment — no slashes, dots, or
 * punctuation survive — so it can be appended to `/projects/` without escaping.
 */
export function slugifyProjectTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Canonical public path for a project: `/projects/<id>-<slug>`.
 *
 * The numeric id is the stable identifier (a title change never changes it) while
 * the slug is decoration for readability and SEO. When a title has nothing
 * sluggable the path degrades to `/projects/<id>` rather than leaving a dangling
 * hyphen.
 */
export function projectPath(project: Pick<Project, "id" | "title">): string {
  const slug = slugifyProjectTitle(project.title);
  return slug ? `/projects/${project.id}-${slug}` : `/projects/${project.id}`;
}

/**
 * Reads the leading numeric id from a `/projects/[project]` segment.
 *
 * Accepts `12` and `12-any-slug`; the id must be a positive safe integer at the
 * very start of the segment. Anything else (`abc`, `12abc`, `-3`) returns null so
 * the caller can 404 instead of querying.
 */
export function parseProjectParam(value: string): number | null {
  const match = /^(\d+)(?:-|$)/.exec(value);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
