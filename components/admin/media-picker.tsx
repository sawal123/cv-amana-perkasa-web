"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminImagePreview from "./admin-image-preview";
import { btnDangerSm, btnPrimary, btnSecondary, btnSecondarySm, inputClass } from "./ui";

/** Presentation-only shape passed from the server pages. */
export type MediaOption = {
  path: string;
  alt: string;
  filename: string;
  groupName?: string;
};

/**
 * Image-field control: shows the current image and opens a thumbnail dialog to
 * pick a replacement.
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

  const selected = media.find((item) => item.path === value);
  const label = selected ? selected.alt.trim() || selected.filename || selected.path : value;

  function choose(path: string) {
    onChange(path);
    setOpen(false);
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
            {selected?.groupName ? (
              <span className="mt-1 inline-flex items-center rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                📁 {selected.groupName}
              </span>
            ) : null}
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
        media={media}
        current={value}
        onSelect={choose}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

export function MediaDialog({
  open,
  media,
  current,
  onSelect,
  onClose,
}: {
  open: boolean;
  media: MediaOption[];
  current?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("Semua");

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const item of media) {
      if (item.groupName) set.add(item.groupName);
      else set.add("Umum");
    }
    return ["Semua", ...Array.from(set).sort((a, b) => (a === "Umum" ? -1 : b === "Umum" ? 1 : a.localeCompare(b)))];
  }, [media]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return media.filter((item) => {
      const itemGroup = item.groupName || "Umum";
      if (selectedGroup !== "Semua" && itemGroup !== selectedGroup) return false;
      if (!q) return true;
      return `${item.alt} ${item.filename} ${item.path} ${itemGroup}`.toLowerCase().includes(q);
    });
  }, [media, query, selectedGroup]);

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
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih gambar"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
      >
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold tracking-tight text-slate-900">Pilih Gambar</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>

          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari gambar berdasarkan nama, alt, atau grup…"
            aria-label="Cari media"
            className={`${inputClass} mt-3`}
          />

          {groups.length > 2 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="font-semibold text-slate-500 mr-1">Grup:</span>
              {groups.map((group) => {
                const count = group === "Semua" ? media.length : media.filter((m) => (m.groupName || "Umum") === group).length;
                const active = selectedGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium transition ${
                      active
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span>{group}</span>
                    <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${active ? "bg-blue-700 text-blue-100" : "bg-slate-200 text-slate-500"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {media.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">Belum ada gambar di pustaka</p>
              <p className="mt-1 text-sm text-slate-500">
                Unggah gambar lewat menu <strong>Media</strong> terlebih dahulu.
              </p>
              <Link href="/admin/media" className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">
                Buka menu Media →
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Tidak ada gambar yang cocok dengan filter atau pencarian.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => {
                const active = item.path === current;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => onSelect(item.path)}
                    aria-pressed={active}
                    className={`group relative overflow-hidden rounded-xl border bg-white text-left transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                      active ? "border-blue-500 ring-2 ring-blue-500/30" : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <span className="relative block aspect-[4/3] bg-slate-100">
                      <AdminImagePreview src={item.path} className="h-full w-full" />
                      {item.groupName ? (
                        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                          {item.groupName}
                        </span>
                      ) : null}
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

/** Multi-image picker dialog: permits choosing multiple photos at once (useful for project galleries). */
export function MultiMediaDialog({
  open,
  media,
  onSelectMultiple,
  onClose,
  title = "Pilih Gambar untuk Galeri",
  confirmLabel = "Tambahkan ke Galeri",
}: {
  open: boolean;
  media: MediaOption[];
  onSelectMultiple: (paths: string[]) => void;
  onClose: () => void;
  title?: string;
  confirmLabel?: string;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("Semua");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  // Reset selection when opening dialog
  useEffect(() => {
    if (open) {
      setSelectedPaths([]);
      setQuery("");
      setSelectedGroup("Semua");
    }
  }, [open]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const item of media) {
      if (item.groupName) set.add(item.groupName);
      else set.add("Umum");
    }
    return ["Semua", ...Array.from(set).sort((a, b) => (a === "Umum" ? -1 : b === "Umum" ? 1 : a.localeCompare(b)))];
  }, [media]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return media.filter((item) => {
      const itemGroup = item.groupName || "Umum";
      if (selectedGroup !== "Semua" && itemGroup !== selectedGroup) return false;
      if (!q) return true;
      return `${item.alt} ${item.filename} ${item.path} ${itemGroup}`.toLowerCase().includes(q);
    });
  }, [media, query, selectedGroup]);

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

  function toggle(path: string) {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  }

  function selectAllVisible() {
    const visiblePaths = filtered.map((f) => f.path);
    setSelectedPaths((prev) => {
      const combined = new Set([...prev, ...visiblePaths]);
      return Array.from(combined);
    });
  }

  function clearSelection() {
    setSelectedPaths([]);
  }

  function confirm() {
    if (selectedPaths.length === 0) return;
    onSelectMultiple(selectedPaths);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
      >
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih satu atau beberapa gambar sekaligus untuk ditambahkan ke galeri.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[200px]">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari gambar berdasarkan nama, alt, atau grup…"
                aria-label="Cari media"
                className={inputClass}
              />
            </div>
            {filtered.length > 0 ? (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Pilih Semua yang Tampil ({filtered.length})
                </button>
                {selectedPaths.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-red-600 hover:bg-red-50"
                  >
                    Batal Pilih ({selectedPaths.length})
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {groups.length > 2 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="font-semibold text-slate-500 mr-1">Grup:</span>
              {groups.map((group) => {
                const count = group === "Semua" ? media.length : media.filter((m) => (m.groupName || "Umum") === group).length;
                const active = selectedGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium transition ${
                      active
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span>{group}</span>
                    <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${active ? "bg-blue-700 text-blue-100" : "bg-slate-200 text-slate-500"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {media.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">Belum ada gambar di pustaka</p>
              <p className="mt-1 text-sm text-slate-500">
                Unggah gambar lewat menu <strong>Media</strong> terlebih dahulu.
              </p>
              <Link href="/admin/media" className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">
                Buka menu Media →
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Tidak ada gambar yang cocok dengan filter atau pencarian.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => {
                const isSelected = selectedPaths.includes(item.path);
                return (
                  <div
                    key={item.path}
                    onClick={() => toggle(item.path)}
                    className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-white text-left transition select-none hover:shadow-md ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/20"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-slate-100">
                      <AdminImagePreview src={item.path} className="h-full w-full" />
                      
                      {/* Checkbox indicator */}
                      <div
                        className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md border text-white transition ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 shadow-sm"
                            : "bg-white/90 border-slate-300 text-transparent hover:border-blue-400"
                        }`}
                      >
                        ✓
                      </div>

                      {item.groupName ? (
                        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                          {item.groupName}
                        </span>
                      ) : null}
                    </div>

                    <div className="p-2.5">
                      <span className="block truncate text-xs font-semibold text-slate-700" title={item.alt || item.filename}>
                        {item.alt || item.filename || "Tanpa nama"}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400" title={item.path}>
                        {item.path}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="text-sm font-medium text-slate-700">
            {selectedPaths.length > 0 ? (
              <span className="text-blue-700 font-semibold">{selectedPaths.length} gambar dipilih</span>
            ) : (
              <span className="text-slate-400">Pilih gambar di atas</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Batal
            </button>
            <button
              type="button"
              disabled={selectedPaths.length === 0}
              onClick={confirm}
              className={`${btnPrimary} disabled:opacity-50 disabled:pointer-events-none`}
            >
              {selectedPaths.length > 0 ? `${confirmLabel} (${selectedPaths.length})` : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
