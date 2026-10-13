"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/types";
import BrandMark from "./brand-mark";
import { CloseIcon, MenuIcon } from "./icons";

/**
 * Section links are written as `/#...` so the same header is correct on every
 * public page: on `/` the browser scrolls the same document to the anchor, and
 * from `/projects/...` it navigates home and then scrolls. "Project" points at
 * the dedicated archive rather than a landing-page hash.
 */
const nav = [
  ["Tentang", "/#about"],
  ["Layanan", "/#services"],
  ["Project", "/projects"],
  ["Tim", "/#team"],
  ["Kontak", "/#contact"],
];

export default function PublicHeader({ identity }: { identity: SiteSettings["identity"] }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 glass">
        <div className="container-shell flex h-[76px] items-center justify-between">
          <Link href="/" aria-label={identity.company}><BrandMark logo={identity.logo} initials={identity.initials} shortName={identity.shortName} company={identity.company} /></Link>
          <nav className="hidden items-center gap-7 md:flex">
            {nav.map(([label, href]) => <Link key={label} href={href} className="text-sm font-medium text-slate-200 transition hover:text-white">{label}</Link>)}
            <Link href="/#contact" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#071b35] transition hover:bg-blue-100">{identity.navCta}</Link>
          </nav>
          <button onClick={() => setMenuOpen(v => !v)} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white md:hidden" aria-label="Menu">
            {menuOpen ? <CloseIcon className="h-5 w-5"/> : <MenuIcon className="h-5 w-5"/>}
          </button>
        </div>
      </header>

      <AnimatePresence>{menuOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-40 bg-[#041429] pt-28 md:hidden">
        <div className="container-shell flex flex-col gap-4">
          {nav.map(([label, href], i) => <motion.div key={label} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}><Link href={href} onClick={() => setMenuOpen(false)} className="block border-b border-white/10 py-4 text-2xl font-semibold text-white">{label}</Link></motion.div>)}
        </div>
      </motion.div>}</AnimatePresence>
    </>
  );
}
