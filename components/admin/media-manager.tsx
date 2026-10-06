"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteMediaAction, uploadMediaAction } from "@/app/admin/actions";
import { Banner, Card, btnDanger, btnPrimary, inputClass } from "./ui";

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
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
          />
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
          <p className="py-6 text-sm text-slate-500">Belum ada gambar.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="relative aspect-[16/10] bg-slate-100">
                  <Image src={item.path} alt={item.alt || item.filename} className="object-cover" fill sizes="(max-width: 640px) 100vw, 25vw" />
                </div>
                <figcaption className="space-y-1.5 p-3">
                  <div className="truncate text-xs font-medium text-slate-700" title={item.filename}>
                    {item.filename}
                  </div>
                  <div className="truncate font-mono text-[10px] text-slate-400" title={item.path}>
                    {item.path}
                  </div>
                  <div className="text-[10px] text-slate-400">{formatSize(item.size)}</div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(item.id, item.filename)}
                    className={`${btnDanger} px-2.5 py-1 text-xs`}
                  >
                    Hapus
                  </button>
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
