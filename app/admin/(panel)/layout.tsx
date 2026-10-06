import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { TABLES, type ContentTable } from "@/lib/admin/fields";
import Nav, { type NavItem } from "@/components/admin/nav";

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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  // Built from the registry, so a new content table appears here automatically.
  const items: NavItem[] = [
    { href: "/admin", label: "Ringkasan" },
    { href: "/admin/settings", label: "Settings" },
    ...(Object.keys(TABLES) as ContentTable[]).map((key) => ({
      href: TABLES[key].route,
      label: TABLES[key].label,
    })),
    { href: "/admin/media", label: "Media" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-tight">CV Amana Perkasa</span>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden text-sm text-slate-500 hover:text-slate-900 sm:block">
              Lihat situs
            </a>
            <span className="hidden text-sm text-slate-400 sm:block">{session.username}</span>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-2">
            <Nav items={items} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
