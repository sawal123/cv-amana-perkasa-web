"use client";

/**
 * Route-level error boundary. Never renders the error message or stack — the
 * details go to the console/server log, the visitor sees a branded fallback with
 * a way back. It renders inside the root layout, so globals.css is available, and
 * it deliberately depends on no database content.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#041429] px-6 py-16 text-center text-white">
      <div className="max-w-md">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Terjadi kesalahan</div>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Ada yang tidak berjalan semestinya</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Silakan coba lagi. Bila masalah berlanjut, hubungi kami melalui WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex rounded-full bg-blue-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-400"
          >
            Coba lagi
          </button>
          <a
            href="/"
            className="inline-flex rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    </main>
  );
}
