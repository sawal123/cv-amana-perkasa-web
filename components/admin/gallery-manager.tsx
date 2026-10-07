"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addGalleryImageAction,
  deleteGalleryImageAction,
  moveGalleryImageAction,
  updateGalleryCaptionAction,
} from "@/app/admin/actions";
import { Banner, Card, Field, btnDanger, btnPrimary, btnSecondary, inputClass } from "./ui";

type GalleryItem = { id: number; image: string; caption: string };

type Props = {
  projectId: number;
  projectTitle: string;
  images: GalleryItem[];
  media: Array<{ path: string; alt: string }>;
};

export default function GalleryManager({ projectId, projectTitle, images, media }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, successText?: string) {
    setBusy(true);
    setMessage(undefined);
    setSuccess(undefined);
    try {
      const result = await action();
      if (!result.ok) {
        setMessage(result.message ?? "Terjadi kesalahan.");
        return false;
      }
      if (successText) setSuccess(successText);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) {
      setMessage("Pilih gambar terlebih dahulu.");
      return;
    }
    const added = await run(() => addGalleryImageAction(projectId, selected, newCaption), "Gambar ditambahkan.");
    if (added) {
      setSelected("");
      setNewCaption("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/content/projects" className="text-sm text-slate-500 hover:text-slate-900">
          ← Kembali ke daftar project
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-900">Galeri: {projectTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gambar cover project diatur pada form project. Halaman ini hanya untuk foto tambahan di dalam
          detail project.
        </p>
      </div>

      {message ? <Banner tone="error">{message}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}

      <Card title="Tambah gambar" description={`${images.length} gambar di galeri project ini.`}>
        {media.length === 0 ? (
          <p className="text-sm text-slate-500">
            Pustaka media masih kosong. Unggah gambar di menu <strong>Media</strong> terlebih dahulu.
          </p>
        ) : (
          <form onSubmit={add} className="space-y-4">
            <Field label="Gambar" htmlFor="gallery-image">
              <select
                id="gallery-image"
                className={inputClass}
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Pilih dari pustaka gambar…</option>
                {media.map((item) => (
                  <option key={item.path} value={item.path}>
                    {item.alt ? `${item.alt} — ${item.path}` : item.path}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Caption" htmlFor="gallery-caption" help="Opsional, tampil di bawah foto saat dibuka.">
              <input
                id="gallery-caption"
                type="text"
                maxLength={255}
                className={inputClass}
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
              />
            </Field>

            {selected ? (
              <div className="relative h-28 w-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <Image src={selected} alt="" className="object-cover" fill sizes="176px" />
              </div>
            ) : null}

            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? "Menyimpan…" : "Tambah ke galeri"}
            </button>
          </form>
        )}
      </Card>

      <Card title="Galeri project">
        {images.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">
            Belum ada gambar galeri. Project tanpa galeri tetap tampil normal di situs.
          </p>
        ) : (
          <ul className="space-y-4">
            {images.map((item, index) => (
              <li key={item.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row">
                <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <Image src={item.image} alt="" className="object-cover" fill sizes="144px" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="truncate font-mono text-[10px] text-slate-400">{item.image}</div>
                  <input
                    type="text"
                    maxLength={255}
                    aria-label={`Caption gambar ${index + 1}`}
                    className={inputClass}
                    value={drafts[item.id] ?? item.caption}
                    onChange={(e) => setDrafts((current) => ({ ...current, [item.id]: e.target.value }))}
                  />
                </div>

                <div className="flex flex-wrap items-start gap-1.5">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => run(() => moveGalleryImageAction(item.id, -1))}
                    className={`${btnSecondary} px-2.5 py-1 text-xs`}
                    aria-label="Naik"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === images.length - 1}
                    onClick={() => run(() => moveGalleryImageAction(item.id, 1))}
                    className={`${btnSecondary} px-2.5 py-1 text-xs`}
                    aria-label="Turun"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={busy || (drafts[item.id] ?? item.caption) === item.caption}
                    onClick={() => run(() => updateGalleryCaptionAction(item.id, drafts[item.id] ?? item.caption), "Caption disimpan.")}
                    className={`${btnSecondary} px-2.5 py-1 text-xs`}
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm("Hapus gambar ini dari galeri? Berkasnya tetap ada di pustaka media.")) return;
                      run(() => deleteGalleryImageAction(item.id));
                    }}
                    className={`${btnDanger} px-2.5 py-1 text-xs`}
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
