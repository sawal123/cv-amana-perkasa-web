"use client";

import { useEffect, useState } from "react";

/**
 * Renders an admin image with a graceful failure state.
 *
 * A media row can outlive its physical file (an upload from a previous
 * deployment, a moved storage directory), so a plain `<img>` would show the
 * browser's broken-image glyph. This shows a neutral placeholder instead.
 *
 * A plain `<img>` is used on purpose: admin previews point at runtime
 * `/uploads/*` paths, where Next's image optimizer adds nothing (it is disabled
 * in this project anyway) and only introduces framework coupling.
 */
export default function AdminImagePreview({
  src,
  alt = "",
  className = "h-full w-full",
  fit = "cover",
}: {
  src?: string;
  alt?: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);

  // A new source deserves a fresh attempt.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span
        className={`grid place-items-center bg-slate-100 px-1 text-center text-[10px] font-medium leading-tight text-slate-400 ${className}`}
      >
        Gambar tidak tersedia
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} ${fit === "contain" ? "object-contain" : "object-cover"}`}
    />
  );
}
