"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminImagePreview from "./admin-image-preview";
import { btnDangerSm, btnSecondary, btnSecondarySm, inputClass } from "./ui";

/** Presentation-only shape passed from the server pages. */
export type MediaOption = { path: string; alt: string; filename: string };

/**
 * Image-field control: shows the current image and opens a thumbnail dialog to
 * pick a replacement. Replaces the native `<select>` of raw paths (which cannot
 * render thumbnails) and the plain text path input.
 *
 * The stored value stays a `/uploads/...` string — this is UI only.
 */
export default function MediaPicker({
  value,
  onChange,
  media,
  allowClear = false,
  disabled = false,
  emptyHint,
}: {
  value: string;
  onChange: (value: string) => void;
  media: MediaOption[];
  allowClear?: boolean;
  disabled?: boolean;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = media.find((item) => item.path === value);
  const label = selected ? selected.alt.trim() || selected.filename || selected.path : value;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return media;
    return media.filter((item) => `${item.alt} ${item.filename} ${item.path}`.toLowerCase().includes(q));
  }, [media, query]);

  function choose(path: string) {
    onChange(path);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      {value ? (
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <AdminImagePreview src={value} className="h-full w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">{label}</div>
            <div className="truncate font-mono text-[10px] text-slate-400">{value}</div>
            {!selected ? (
              <div className="mt-0.5 text-[10px] font-medium text-amber-600">Gambar saat ini — tidak ada di pustaka</div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-1.5">
            <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={btnSecondarySm}>
              {selected ? "Ganti gambar" : "Pilih gambar"}
            </button>
            {allowClear ? (
              <button type="button" disabled={disabled} onClick={() => onChange("")} className={btnDangerSm}>
                Hapus pilihan
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-slate-500">Belum ada gambar</span>
          <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={btnSecondarySm}>
            Pilih gambar
          </button>
        </div>
      )}

      {emptyHint && !value ? <p className="mt-2 text-xs text-slate-400">{emptyHint}</p> : null}

      <MediaDialog
        open={open}
        items={filtered}
        query={query}
        onQuery={setQuery}
        current={value}
        onSelect={choose}
        onClose={() => {
          setOpen(false);
          setQuery("");
        }}
        libraryEmpty={media.length === 0}
      />
    </div>
  );
}

function MediaDialog({
  open,
  items,
  query,
  onQuery,
  current,
  onSelect,
  onClose,
  libraryEmpty,
}: {
  open: boolean;
  items: MediaOption[];
  query: string;
  onQuery: (value: string) => void;
  current: string;
  onSelect: (path: string) => void;
  onClose: () => void;
  libraryEmpty: boolean;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    searchRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih gambar"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-base font-bold tracking-tight text-slate-900">Pilih Gambar</h2>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Cari media…"
            aria-label="Cari media"
            className={`${inputClass} mt-3`}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {libraryEmpty ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">Belum ada gambar di pustaka</p>
              <p className="mt-1 text-sm text-slate-500">
                Unggah gambar lewat menu <strong>Media</strong> terlebih dahulu.
              </p>
              <Link href="/admin/media" className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">
                Buka menu Media →
              </Link>
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Tidak ada media yang cocok dengan pencarian.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => {
                const active = item.path === current;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => onSelect(item.path)}
                    aria-pressed={active}
                    className={`overflow-hidden rounded-xl border bg-white text-left transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                      active ? "border-blue-500 ring-2 ring-blue-500/30" : "border-slate-200"
                    }`}
                  >
                    <span className="relative block aspect-[4/3] bg-slate-100">
                      <AdminImagePreview src={item.path} className="h-full w-full" />
                    </span>
                    <span className="block p-2.5">
                      <span className="block truncate text-xs font-semibold text-slate-700" title={item.alt || item.filename}>
                        {item.alt || item.filename || "Tanpa nama"}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400" title={item.path}>
                        {item.path}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
