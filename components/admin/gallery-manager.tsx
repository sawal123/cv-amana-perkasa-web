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
import { NavIcon } from "./icons";
import { Banner, Card, EmptyState, Field, PageHeader, btnDangerSm, btnIconSm, btnPrimary, btnSecondarySm, inputClass } from "./ui";

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
        <Link
          href="/admin/content/projects"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <NavIcon name="arrowRight" className="h-4 w-4 rotate-180" /> Kembali ke daftar project
        </Link>
        <div className="mt-4">
          <PageHeader
            title={`Galeri: ${projectTitle}`}
            description="Gambar cover project diatur pada form project. Halaman ini hanya untuk foto tambahan di dalam detail project."
          />
        </div>
      </div>

      {message ? <Banner tone="error">{message}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}

      <Card title="Tambah gambar" description={`${images.length} gambar di galeri project ini.`}>
        {media.length === 0 ? (
          <p className="text-sm text-slate-500">
            Pustaka media masih kosong. Unggah gambar di menu <strong>Media</strong> terlebih dahulu.
          </p>
        ) : (
          <form onSubmit={add} className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-4">
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

              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? "Menyimpan…" : "Tambah ke galeri"}
              </button>
            </div>

            {selected ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <Image src={selected} alt="" className="object-cover" fill sizes="(max-width: 1024px) 100vw, 420px" />
              </div>
            ) : null}
          </form>
        )}
      </Card>

      <Card title="Galeri project">
        {images.length === 0 ? (
          <EmptyState
            icon="image"
            title="Belum ada gambar galeri"
            description="Project tanpa galeri tetap tampil normal di situs."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((item, index) => (
              <li key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image src={item.image} alt="" className="object-cover" fill sizes="(max-width: 640px) 100vw, 33vw" />
                  <span className="absolute left-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-[#041429]/80 px-1.5 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                </div>

                <div className="space-y-3 p-4">
                  <input
                    type="text"
                    maxLength={255}
                    aria-label={`Caption gambar ${index + 1}`}
                    placeholder="Caption (opsional)"
                    className={inputClass}
                    value={drafts[item.id] ?? item.caption}
                    onChange={(e) => setDrafts((current) => ({ ...current, [item.id]: e.target.value }))}
                  />

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      onClick={() => run(() => moveGalleryImageAction(item.id, -1))}
                      className={btnIconSm}
                      aria-label="Naik"
                    >
                      <NavIcon name="chevronUp" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === images.length - 1}
                      onClick={() => run(() => moveGalleryImageAction(item.id, 1))}
                      className={btnIconSm}
                      aria-label="Turun"
                    >
                      <NavIcon name="chevronDown" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy || (drafts[item.id] ?? item.caption) === item.caption}
                      onClick={() => run(() => updateGalleryCaptionAction(item.id, drafts[item.id] ?? item.caption), "Caption disimpan.")}
                      className={btnSecondarySm}
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
                      className={`${btnDangerSm} ml-auto`}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
