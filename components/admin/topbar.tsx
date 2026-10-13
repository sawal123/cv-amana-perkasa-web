"use client";

import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import { NavIcon } from "./icons";
import { isItemActive, type NavGroup } from "./nav";

/** First alphanumeric character of the username, for the initials avatar. */
function initialOf(username: string): string {
  const match = /[a-z0-9]/i.exec(username);
  return (match?.[0] ?? "A").toUpperCase();
}

function activeContext(groups: NavGroup[], pathname: string): { group: string; label: string } | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (isItemActive(pathname, item)) return { group: group.label, label: item.label };
    }
  }
  return null;
}

export default function Topbar({ username, groups, onMenu }: { username: string; groups: NavGroup[]; onMenu: () => void }) {
  const pathname = usePathname();
  const context = activeContext(groups, pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
          aria-label="Buka navigasi"
        >
          <NavIcon name="menu" className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          {context ? (
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline">{context.group}</span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <span className="truncate font-semibold text-slate-900">{context.label}</span>
            </div>
          ) : null}
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:inline-flex"
        >
          Lihat Situs <NavIcon name="external" className="h-4 w-4" />
        </a>

        <div className="flex items-center gap-3 sm:border-l sm:border-slate-200 sm:pl-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#071b35] text-sm font-bold text-white" aria-hidden="true">
            {initialOf(username)}
          </span>
          <span className="hidden max-w-[180px] truncate text-sm font-medium text-slate-700 sm:block">{username}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <NavIcon name="logout" className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
