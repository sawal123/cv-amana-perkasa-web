"use client";

/**
 * Last-resort boundary for an error thrown in the root layout itself. It replaces
 * the root layout, so it must supply its own <html>/<body>. Styling is inline for
 * the same reason — no dependency on the layout's stylesheet or any database
 * content, and no error detail is ever rendered.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#041429",
          color: "#ffffff",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          textAlign: "center",
          padding: "4rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#93c5fd" }}>
            Terjadi kesalahan
          </div>
          <h1 style={{ marginTop: 16, fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em" }}>
            Situs sedang tidak dapat dimuat
          </h1>
          <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.75, color: "#cbd5e1" }}>
            Silakan muat ulang halaman. Bila masalah berlanjut, hubungi kami kembali beberapa saat lagi.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 32,
              borderRadius: 9999,
              border: "none",
              background: "#3b82f6",
              color: "#ffffff",
              padding: "0.875rem 1.5rem",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}
