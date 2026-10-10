import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan — CV AMANA PERKASA",
  robots: { index: false, follow: false },
};

/** Static and content-free on purpose: a 404 must render with the database down. */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#041429] px-6 py-16 text-center text-white">
      <div className="max-w-md">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">404</div>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Halaman tidak ditemukan</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-blue-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-400"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
