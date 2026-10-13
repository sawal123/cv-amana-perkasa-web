"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./icons";
import { isItemActive, type NavGroup } from "./nav";

/**
 * Dark navigation rail. Rendered once — it is the persistent sidebar on desktop
 * and the off-canvas drawer on mobile (positioning lives in AdminShell).
 */
export default function Sidebar({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-sm font-black tracking-tight text-white">
          AP
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight text-white">CV AMANA PERKASA</div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-blue-300/80">Admin Console</div>
        </div>
      </div>

      <nav aria-label="Navigasi admin" className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{group.label}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-[#0b2a52] text-white shadow-[inset_0_0_0_1px_rgba(74,168,255,0.28)]"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className={active ? "text-blue-300" : "text-slate-500 group-hover:text-slate-300"}>
                        <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="truncate">{item.label}</span>
                      {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" aria-hidden="true" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-[11px] leading-5 text-slate-500">
        Konten publik &amp; panel dikelola dari MySQL yang sama.
      </div>
    </>
  );
}
