"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { GalleryImage } from "@/lib/types";
import { CloseIcon } from "./icons";

/**
 * Project gallery grid with a lightbox (keyboard: ESC closes, ←/→ navigate).
 *
 * Extracted from the old landing-page modal so the grid/lightbox behaviour lives
 * in exactly one place and the project detail page can stay a Server Component.
 * Renders nothing when there are no images, so callers can mount it unconditionally.
 */
export default function ProjectGallery({ title, images }: { title: string; images: GalleryImage[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const step = useCallback(
    (delta: number) => {
      setLightbox((current) => {
        if (current === null || images.length === 0) return current;
        return (current + delta + images.length) % images.length;
      });
    },
    [images.length],
  );

  useEffect(() => {
    if (lightbox === null) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setLightbox(null);
      } else if (event.key === "ArrowRight") {
        step(1);
      } else if (event.key === "ArrowLeft") {
        step(-1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [lightbox, step]);

  if (images.length === 0) return null;

  const active = lightbox === null ? null : images[lightbox];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setLightbox(index)}
            aria-label={image.caption ? `Buka gambar: ${image.caption}` : `Buka gambar ${index + 1}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#071b35]"
          >
            <Image
              src={image.image}
              alt={image.caption || `${title} — gambar ${index + 1}`}
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
            <span className="absolute inset-0 bg-[#041429]/0 transition group-hover:bg-[#041429]/20" />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center bg-[#010c1a]/95 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              aria-label="Tutup galeri"
              onClick={(event) => {
                event.stopPropagation();
                setLightbox(null);
              }}
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
            >
              <CloseIcon className="h-5 w-5" />
            </button>

            {images.length > 1 ? (
              <>
                <button
                  aria-label="Sebelumnya"
                  onClick={(event) => {
                    event.stopPropagation();
                    step(-1);
                  }}
                  className="absolute left-3 grid h-12 w-12 place-items-center rounded-full border border-white/20 text-2xl text-white transition hover:bg-white/10 md:left-8"
                >
                  ‹
                </button>
                <button
                  aria-label="Berikutnya"
                  onClick={(event) => {
                    event.stopPropagation();
                    step(1);
                  }}
                  className="absolute right-3 grid h-12 w-12 place-items-center rounded-full border border-white/20 text-2xl text-white transition hover:bg-white/10 md:right-8"
                >
                  ›
                </button>
              </>
            ) : null}

            <motion.figure
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-h-full w-full max-w-4xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#041429]">
                <Image src={active.image} alt={active.caption || title} fill className="object-contain" sizes="90vw" />
              </div>
              {active.caption ? <figcaption className="mt-4 text-center text-sm text-slate-300">{active.caption}</figcaption> : null}
              <div className="mt-2 text-center text-xs text-slate-500">
                {(lightbox ?? 0) + 1} / {images.length}
              </div>
            </motion.figure>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
