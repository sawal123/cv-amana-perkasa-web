import type { ContentTable } from "@/lib/admin/fields";
import type { IconName } from "./icons";

/**
 * Navigation presentation only — route/label values still come from the content
 * registry (lib/admin/fields). This module is intentionally free of any runtime
 * import from that registry so client components (sidebar, topbar) can consume
 * the types and the active-route helper without pulling server code into the
 * browser bundle.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /**
   * Extra path prefixes that should highlight this item. Defaults to [href].
   * Used so the Project item also lights up on /admin/projects/[id]/gallery.
   */
  match?: string[];
};

export type NavGroup = { label: string; items: NavItem[] };

/** Rendering order of the sidebar groups. */
export const NAV_GROUP_ORDER: readonly string[] = ["Main", "Website", "Organization", "Business", "Assets"];

/**
 * Which sidebar group and icon each content table belongs to. Keys not listed here
 * fall back to the Website group, so a table added to the registry later still
 * appears in the sidebar automatically.
 */
const CONTENT_TABLE_PRESENTATION: Partial<Record<ContentTable, { group: string; icon: IconName }>> = {
  services: { group: "Website", icon: "layers" },
  projects: { group: "Website", icon: "briefcase" },
  clients_partners: { group: "Website", icon: "building" },
  why_choose_us: { group: "Website", icon: "star" },
  company_legalities: { group: "Website", icon: "shield" },
  team_members: { group: "Organization", icon: "users" },
  testimonials: { group: "Organization", icon: "quote" },
  workflow_steps: { group: "Organization", icon: "route" },
};

export function tablePresentation(key: ContentTable): { group: string; icon: IconName } {
  return CONTENT_TABLE_PRESENTATION[key] ?? { group: "Website", icon: "layers" };
}

/** Matches the current route to a nav item, including nested routes. */
export function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/admin") return pathname === "/admin";
  const prefixes = item.match ?? [item.href];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
