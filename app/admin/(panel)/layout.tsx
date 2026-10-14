import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { TABLES, type ContentTable } from "@/lib/admin/fields";
import AdminShell from "@/components/admin/admin-shell";
import { NAV_GROUP_ORDER, tablePresentation, type NavGroup, type NavItem } from "@/components/admin/nav";

export const dynamic = "force-dynamic";

// Without this the panel inherits the public site's title and, worse, stays
// indexable by search engines.
export const metadata: Metadata = {
  title: {
    default: "Admin — CV AMANA PERKASA",
    template: "%s — Admin CV AMANA PERKASA",
  },
  robots: { index: false, follow: false },
};

/**
 * Builds the sidebar from the content registry, so a table added to TABLES shows
 * up automatically. Only the group/icon presentation comes from
 * components/admin/nav — the routes and labels stay the registry's.
 */
function buildNavGroups(): NavGroup[] {
  const buckets = new Map<string, NavItem[]>();
  const add = (group: string, item: NavItem) => {
    const list = buckets.get(group) ?? [];
    list.push(item);
    buckets.set(group, list);
  };

  add("Main", { href: "/admin", label: "Ringkasan", icon: "dashboard" });
  add("Website", { href: "/admin/settings", label: "Settings", icon: "settings" });

  for (const key of Object.keys(TABLES) as ContentTable[]) {
    const table = TABLES[key];
    const { group, icon } = tablePresentation(key);
    add(group, {
      href: table.route,
      label: table.label,
      icon,
      // The project gallery lives at /admin/projects/[id]/gallery, so the Project
      // item should stay highlighted there too.
      match: key === "projects" ? [table.route, "/admin/projects"] : [table.route],
    });
  }

  add("Business", { href: "/admin/quotation-requests", label: "Permintaan Penawaran", icon: "inbox" });
  add("Assets", { href: "/admin/media", label: "Media", icon: "image" });
  // Dedicated module, deliberately not part of the TABLES registry: brochures
  // carry binary-upload semantics (PDF validation, file replacement) that the
  // generic content CRUD does not model.
  add("Assets", { href: "/admin/brochures", label: "Brosur PDF", icon: "fileText" });

  const ordered = NAV_GROUP_ORDER.filter((label) => buckets.has(label));
  const extra = [...buckets.keys()].filter((label) => !NAV_GROUP_ORDER.includes(label));
  return [...ordered, ...extra].map((label) => ({ label, items: buckets.get(label) ?? [] }));
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <AdminShell username={session.username} groups={buildNavGroups()}>
      {children}
    </AdminShell>
  );
}
