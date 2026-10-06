import raw from "./site.json";
import type { SiteContent } from "@/lib/types";

/**
 * Bundled fallback content. Used verbatim when MySQL is unconfigured, unreachable,
 * or holds an empty table — the public site must never 500 because of the database.
 * Edit through the admin panel for real changes; edit site.json only to change
 * what a visitor sees before the first seed.
 */
export const defaultContent = raw as SiteContent;
