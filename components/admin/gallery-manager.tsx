"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addGalleryImageAction,
  addMultipleGalleryImagesAction,
  deleteGalleryImageAction,
  moveGalleryImageAction,
  updateGalleryCaptionAction,
} from "@/app/admin/actions";
import AdminImagePreview from "./admin-image-preview";
import { useConfirmDialog } from "./confirm-dialog";
import { NavIcon } from "./icons";
import MediaPicker, { MultiMediaDialog, type MediaOption } from "./media-picker";
import { Banner, Card, EmptyState, Field, PageHeader, btnDangerSm, btnIconSm, btnPrimary, btnSecondarySm, inputClass } from "./ui";

type GalleryItem = { id: number; image: string; caption: string };

type Props = {
  projectId: number;
  projectTitle: string;
  images: GalleryItem[];
  media: MediaOption[];
};

export default function GalleryManager({ projectId, projectTitle, images, media }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [multiOpen, setMultiOpen] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

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

  async function handleBatchAdd(paths: string[]) {
    if (paths.length === 0) return;
    await run(
      () => addMultipleGalleryImagesAction(projectId, paths),
      `${paths.length} gambar berhasil ditambahkan ke galeri.`
    );
  }

  const batchAddButton = (
    <button
      type="button"
      onClick={() => setMultiOpen(true)}
      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-blue-700"
    >
      + Tambah Banyak Foto Sekaligus
    </button>
  );

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
            description="Gambar cover project diatur pada form project. Halaman ini untuk foto tambahan dokumentasi di dalam detail project."
            actions={batchAddButton}
          />
        </div>
      </div>

      {message ? <Banner tone="error">{message}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}

      <Card title="Tambah Satu Foto dengan Caption" description="Atau gunakan tombol di atas untuk memilih banyak foto sekaligus.">
        {media.length === 0 ? (
          <p className="text-sm text-slate-500">
            Pustaka media masih kosong. Unggah gambar di menu{" "}
            <Link href="/admin/media" className="font-semibold text-blue-600 hover:text-blue-700">
              Media
            </Link>{" "}
            terlebih dahulu.
          </p>
        ) : (
          <form onSubmit={add} className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-4">
              <Field label="Gambar">
                <MediaPicker value={selected} onChange={setSelected} media={media} disabled={busy} />
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

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={busy} className={btnPrimary}>
                  {busy ? "Menyimpan…" : "Tambah ke galeri"}
                </button>
                <button
                  type="button"
                  onClick={() => setMultiOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Pilih banyak foto sekaligus →
                </button>
              </div>
            </div>

            {selected ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <AdminImagePreview src={selected} className="h-full w-full" />
              </div>
            ) : null}
          </form>
        )}
      </Card>

      <Card title="Foto Galeri Project" description={`${images.length} foto terpasang di galeri project ini.`}>
        {images.length === 0 ? (
          <EmptyState
            icon="image"
            title="Belum ada gambar galeri"
            description="Klik tombol 'Tambah Banyak Foto Sekaligus' di atas untuk melengkapi dokumentasi project ini."
            action={batchAddButton}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((item, index) => (
              <li key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <AdminImagePreview src={item.image} className="h-full w-full" />
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
                      onClick={() =>
                        confirm({
                          title: "Hapus gambar dari galeri?",
                          description: "Berkas tetap tersedia di pustaka media.",
                          confirmLabel: "Hapus",
                          onConfirm: () => run(() => deleteGalleryImageAction(item.id)),
                        })
                      }
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

      <MultiMediaDialog
        open={multiOpen}
        media={media}
        onSelectMultiple={handleBatchAdd}
        onClose={() => setMultiOpen(false)}
        title={`Pilih Foto Galeri: ${projectTitle}`}
        confirmLabel="Tambahkan ke Galeri"
      />

      {dialog}
    </div>
  );
}
