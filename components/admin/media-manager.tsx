"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteMediaAction, uploadMediaAction } from "@/app/admin/actions";
import { Banner, Card, EmptyState, btnDangerSm, btnPrimary, inputClass } from "./ui";

type Props = {
  items: Array<{ id: number; filename: string; path: string; mime: string; size: number; alt: string }>;
  /** Passed in because lib/media pulls in node:fs and cannot be imported here. */
  maxBytes: number;
  /** Absolute URL prefix of the site, used only for the hint text. */
  uploadDirHint: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaManager({ items, maxBytes, uploadDirHint }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [message, setMessage] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setMessage("Pilih file terlebih dahulu.");
      return;
    }
    if (file.size > maxBytes) {
      setMessage(`File terlalu besar. Maksimum ${formatSize(maxBytes)}.`);
      return;
    }

    setBusy(true);
    setMessage(undefined);
    setSuccess(undefined);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("alt", alt);
      const result = await uploadMediaAction(formData);
      if (result.ok) {
        setSuccess(result.message ?? "Gambar terunggah.");
        setAlt("");
        if (input) input.value = "";
        router.refresh();
      } else {
        setMessage(result.message ?? "Gagal mengunggah.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number, name: string) {
    if (!window.confirm(`Hapus ${name}?`)) return;
    setBusy(true);
    setMessage(undefined);
    setSuccess(undefined);
    try {
      const result = await deleteMediaAction(id);
      if (!result.ok) setMessage(result.message ?? "Gagal menghapus.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Unggah gambar"
        description={`JPG, PNG, atau WEBP sampai ${formatSize(maxBytes)}. Disimpan di ${uploadDirHint}.`}
      >
        {message ? <Banner tone="error">{message}</Banner> : null}
        {success ? <Banner tone="success">{success}</Banner> : null}

        <form onSubmit={submit} className="space-y-4">
          <label
            htmlFor="media-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M12 16V5" />
                <path d="m8 9 4-4 4 4" />
                <path d="M5 19h14" />
              </svg>
            </span>
            <span className="mt-3 text-sm font-semibold text-slate-700">Pilih berkas gambar</span>
            <span className="mt-1 text-xs text-slate-400">atau seret berkas ke area ini</span>
            <input
              id="media-file"
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
            />
          </label>

          <input
            type="text"
            className={inputClass}
            placeholder="Alt text (opsional, untuk aksesibilitas)"
            maxLength={255}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />

          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Mengunggah…" : "Unggah"}
          </button>
        </form>
      </Card>

      <Card title="Pustaka gambar" description={`${items.length} berkas.`}>
        {items.length === 0 ? (
          <EmptyState
            icon="image"
            title="Belum ada gambar"
            description="Unggah gambar pertama, lalu pilih dari pustaka ini pada form Project, Tim, Galeri, Client, atau Settings."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image src={item.path} alt={item.alt || item.filename} className="object-cover" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
                </div>
                <figcaption className="space-y-2 p-4">
                  <div className="truncate text-sm font-semibold text-slate-800" title={item.filename}>
                    {item.filename}
                  </div>
                  <div className="truncate font-mono text-[10px] text-slate-400" title={item.path}>
                    {item.path}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{formatSize(item.size)}</span>
                    <button type="button" disabled={busy} onClick={() => remove(item.id, item.filename)} className={btnDangerSm}>
                      Hapus
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <p className="mt-5 text-xs text-slate-400">
          Gambar yang masih dipakai project atau anggota tim tidak bisa dihapus. Gambar yang dirujuk dari
          Settings (hero, OG image) harus diganti di sana lebih dulu.
        </p>
      </Card>
    </div>
  );
}
