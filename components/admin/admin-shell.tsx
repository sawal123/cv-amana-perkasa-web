"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import type { NavGroup } from "./nav";

/**
 * Admin chrome: a persistent dark sidebar on desktop, an off-canvas drawer on
 * mobile, and a sticky topbar. Only this shell is a Client Component — the page
 * content is passed through as server-rendered children.
 */
export default function AdminShell({
  username,
  groups,
  children,
}: {
  username: string;
  groups: NavGroup[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on navigation (link click and browser back/forward alike).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.body.style.overflow = open ? "hidden" : "";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <aside
        aria-label="Navigasi utama"
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[85vw] flex-col bg-[#041429] transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar groups={groups} onNavigate={() => setOpen(false)} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      ) : null}

      <div className="lg:pl-[272px]">
        <Topbar username={username} groups={groups} onMenu={() => setOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
