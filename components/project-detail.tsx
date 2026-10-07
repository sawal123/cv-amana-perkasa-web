"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { Project } from "@/lib/types";
import { CloseIcon } from "./icons";

/** Splits the newline-separated scope field into display items. */
function scopeItems(scope: string): string[] {
  return scope
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[#071b35]">{value}</dd>
    </div>
  );
}

export default function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const gallery = project.gallery;
  const scope = scopeItems(project.scope);
  const hasMeta = Boolean(project.client || project.location || project.year);

  const step = useCallback(
    (delta: number) => {
      setLightbox((current) => {
        if (current === null || gallery.length === 0) return current;
        return (current + delta + gallery.length) % gallery.length;
      });
    },
    [gallery.length],
  );

  useEffect(() => {
    if (lightbox === null) return;

    // Preserve whatever was there before: the detail modal also locks scrolling,
    // so restoring "" here would let the page scroll behind an open modal.
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

  const active = lightbox === null ? null : gallery[lightbox];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#021020]/90 p-4 backdrop-blur-lg"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.3 }}
        onClick={(event) => event.stopPropagation()}
        className="relative my-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-white"
      >
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-[#041429]/85 text-white backdrop-blur"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="relative aspect-[16/9]">
          <Image src={project.image} alt={project.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 1024px" />
        </div>

        <div className="p-7 md:p-9">
          {project.category ? (
            <div className="text-xs font-black uppercase tracking-[.18em] text-blue-600">{project.category}</div>
          ) : null}
          <h3 className="mt-2 text-3xl font-black text-[#071b35] md:text-4xl">{project.title}</h3>

          {hasMeta ? (
            <dl className="mt-6 grid grid-cols-2 gap-5 border-y border-slate-200 py-5 md:grid-cols-3">
              {project.client ? <Meta label="Client" value={project.client} /> : null}
              {project.location ? <Meta label="Lokasi" value={project.location} /> : null}
              {project.year ? <Meta label="Tahun" value={project.year} /> : null}
            </dl>
          ) : null}

          {project.description ? (
            <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-600">{project.description}</p>
          ) : null}

          {scope.length > 0 ? (
            <div className="mt-7">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Scope Pekerjaan</div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {scope.map((item) => (
                  <li key={item} className="rounded-full bg-[#f3f8fd] px-3.5 py-1.5 text-xs font-semibold text-[#071b35]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {gallery.length > 0 ? (
            <div className="mt-8">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Galeri</div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {gallery.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setLightbox(index)}
                    aria-label={`Buka gambar ${index + 1}`}
                    className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#071b35]"
                  >
                    <Image
                      src={image.image}
                      alt={image.caption || `${project.title} ${index + 1}`}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                    <span className="absolute inset-0 bg-[#041429]/0 transition group-hover:bg-[#041429]/20" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>

      <AnimatePresence>
        {active ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center bg-[#010c1a]/95 p-4"
            onClick={(event) => {
              event.stopPropagation();
              setLightbox(null);
            }}
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

            {gallery.length > 1 ? (
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
                <Image src={active.image} alt={active.caption || project.title} fill className="object-contain" sizes="90vw" />
              </div>
              {active.caption ? (
                <figcaption className="mt-4 text-center text-sm text-slate-300">{active.caption}</figcaption>
              ) : null}
              <div className="mt-2 text-center text-xs text-slate-500">
                {(lightbox ?? 0) + 1} / {gallery.length}
              </div>
            </motion.figure>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
