"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addMultipleGalleryImagesAction,
  deleteGalleryImageAction,
  saveContentAction,
} from "@/app/admin/actions";
import type { ContentTable, FieldDef, Payload } from "@/lib/admin/fields";
import AdminImagePreview from "./admin-image-preview";
import { useConfirmDialog } from "./confirm-dialog";
import { NavIcon } from "./icons";
import MediaPicker, { MultiMediaDialog, type MediaOption } from "./media-picker";
import {
  Banner,
  Card,
  Field,
  PageHeader,
  btnDangerSm,
  btnPrimary,
  btnSecondary,
  btnSecondarySm,
  inputClass,
} from "./ui";

type GalleryItem = { id: number; image: string; caption?: string };

type Props = {
  table: ContentTable;
  route: string;
  label: string;
  singular: string;
  titleField: string;
  fields: FieldDef[];
  initialValues: Payload;
  id?: number;
  media: MediaOption[];
  initialGallery?: GalleryItem[];
};

function emptyValues(fields: FieldDef[]): Payload {
  const values: Payload = {};
  for (const field of fields) values[field.name] = "";
  return values;
}

/**
 * Groups a table's fields into form sections.
 */
function sectionsFor(table: ContentTable, fields: FieldDef[]): { title: string; fields: FieldDef[] }[] {
  const byName = new Map(fields.map((field) => [field.name, field]));
  const pick = (names: string[]) => names.map((name) => byName.get(name)).filter((f): f is FieldDef => Boolean(f));

  if (table === "projects") {
    const groups = [
      { title: "Informasi Utama", names: ["title", "category", "year", "client", "location"] },
      { title: "Cover / Thumbnail", names: ["image"] },
      { title: "Deskripsi", names: ["description"] },
      { title: "Scope Pekerjaan", names: ["scope"] },
      { title: "Case Study", names: ["objective", "approach", "outcome"] },
    ];
    return groups
      .map((group) => ({ title: group.title, fields: pick(group.names) }))
      .filter((section) => section.fields.length > 0);
  }

  return [{ title: "Detail", fields }];
}

export default function ContentEditor({
  table,
  route,
  label,
  singular,
  titleField,
  fields,
  initialValues,
  id,
  media,
  initialGallery = [],
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Payload>(() => ({ ...emptyValues(fields), ...initialValues }));
  const [errors, setErrors] = useState<Record<string, string> | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  // Gallery state for projects
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => initialGallery);
  const [pendingGallery, setPendingGallery] = useState<string[]>([]);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);

  const { confirm, dialog } = useConfirmDialog();

  function setValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors(undefined);
    setMessage(undefined);
    setSuccess(undefined);
    try {
      const result = await saveContentAction(
        table,
        values,
        id,
        table === "projects" && !id ? pendingGallery : undefined
      );
      if (result.ok) {
        router.refresh();
        router.push(route);
        return;
      }
      setErrors(result.errors);
      setMessage(result.message ?? "Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddGallery(selectedPaths: string[]) {
    if (selectedPaths.length === 0) return;

    if (id) {
      // Editing existing project: add directly
      setBusy(true);
      setMessage(undefined);
      try {
        const res = await addMultipleGalleryImagesAction(id, selectedPaths);
        if (!res.ok) {
          setMessage(res.message);
        } else {
          setSuccess(`${selectedPaths.length} gambar berhasil ditambahkan ke galeri project.`);
          router.refresh();
          // Also optimistically update or reload
          setGalleryItems((prev) => [
            ...prev,
            ...selectedPaths.map((p, idx) => ({ id: Date.now() + idx, image: p, caption: "" })),
          ]);
        }
      } finally {
        setBusy(false);
      }
    } else {
      // Creating new project: add to pending list
      setPendingGallery((prev) => Array.from(new Set([...prev, ...selectedPaths])));
      setSuccess(`${selectedPaths.length} gambar dipilih untuk galeri.`);
    }
  }

  async function handleRemoveGalleryItem(item: GalleryItem) {
    if (!id) return;
    setBusy(true);
    try {
      const res = await deleteGalleryImageAction(item.id);
      if (!res.ok) {
        setMessage(res.message);
      } else {
        setGalleryItems((prev) => prev.filter((i) => i.id !== item.id));
        setSuccess("Gambar dihapus dari galeri.");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  function handleRemovePendingItem(path: string) {
    setPendingGallery((prev) => prev.filter((p) => p !== path));
  }

  function renderField(field: FieldDef) {
    const value = values[field.name] ?? "";
    const inputId = `field-${table}-${field.name}`;
    const wide = field.type !== "text";
    const labelled = field.type === "text" || field.type === "textarea";

    return (
      <div key={field.name} className={wide ? "lg:col-span-2" : undefined}>
        <Field label={field.label} help={field.help} error={errors?.[field.name]} htmlFor={labelled ? inputId : undefined}>
          {field.type === "image" ? (
            <MediaPicker
              value={value}
              onChange={(next) => setValue(field.name, next)}
              media={media}
              allowClear={!field.required}
              disabled={busy}
              emptyHint="Pilih gambar cover/thumbnail utama. Untuk foto dokumentasi tambahan, gunakan bagian Galeri di bawah."
            />
          ) : field.type === "textarea" ? (
            <textarea
              id={inputId}
              rows={4}
              maxLength={field.maxLength}
              className={inputClass}
              value={value}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          ) : (
            <input
              id={inputId}
              type="text"
              maxLength={field.maxLength}
              className={inputClass}
              value={value}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          )}
        </Field>
      </div>
    );
  }

  const sections = sectionsFor(table, fields);

  return (
    <div className="space-y-6">
      <div>
        <Link href={route} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
          <NavIcon name="arrowRight" className="h-4 w-4 rotate-180" /> Kembali ke daftar {label.toLowerCase()}
        </Link>
        <div className="mt-4">
          <PageHeader
            title={id ? `Ubah ${singular}` : `Tambah ${singular}`}
            description={
              id && values[titleField]
                ? `Mengubah “${values[titleField]}”.`
                : `Lengkapi data ${singular} lalu simpan.`
            }
          />
        </div>
      </div>

      {message ? <Banner tone="error">{message}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}

      {errors && Object.keys(errors).length ? (
        <Banner tone="error">
          <ul className="list-inside list-disc space-y-0.5">
            {fields.filter((field) => errors[field.name]).map((field) => (
              <li key={field.name}>{errors[field.name]}</li>
            ))}
            {errors.form ? <li>{errors.form}</li> : null}
          </ul>
        </Banner>
      ) : null}

      <form onSubmit={submit} className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-6">
            <Card title={section.title}>
              <div className="grid gap-5 lg:grid-cols-2">{section.fields.map(renderField)}</div>
            </Card>

            {/* Special Project Gallery Card: embedded directly in the form */}
            {table === "projects" && section.title === "Cover / Thumbnail" ? (
              <Card
                title="Galeri Dokumentasi Project"
                description="Foto-foto dokumentasi tambahan di luar cover/thumbnail di atas. Pengunjung situs dapat melihat foto-foto ini dalam lightbox interaktif."
                actions={
                  <button
                    type="button"
                    onClick={() => setGalleryDialogOpen(true)}
                    className={btnSecondarySm}
                  >
                    + Tambah Foto Galeri
                  </button>
                }
              >
                {id ? (
                  // Edit mode: show current project_images
                  galleryItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                      <p className="text-sm font-semibold text-slate-700">Belum ada foto tambahan di galeri project ini</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Tambahkan beberapa foto dokumentasi acara untuk memperkaya halaman detail project.
                      </p>
                      <button
                        type="button"
                        onClick={() => setGalleryDialogOpen(true)}
                        className={`mt-3 ${btnPrimary}`}
                      >
                        + Tambah Foto Galeri
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {galleryItems.map((item, idx) => (
                          <div
                            key={item.id}
                            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
                          >
                            <div className="relative aspect-[4/3] bg-slate-100">
                              <AdminImagePreview src={item.image} className="h-full w-full" />
                              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.2 text-[10px] font-bold text-white">
                                {idx + 1}
                              </span>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  confirm({
                                    title: "Hapus foto dari galeri?",
                                    description: "Foto ini akan dihapus dari galeri project (berkas tetap ada di pustaka media).",
                                    confirmLabel: "Hapus",
                                    onConfirm: () => handleRemoveGalleryItem(item),
                                  })
                                }
                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600/90 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-700"
                                title="Hapus foto ini"
                              >
                                ✕
                              </button>
                            </div>
                            {item.caption ? (
                              <div className="truncate p-1.5 text-[11px] text-slate-600" title={item.caption}>
                                {item.caption}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setGalleryDialogOpen(true)}
                          className={btnSecondarySm}
                        >
                          + Tambah Foto Galeri Lainnya
                        </button>
                        <Link
                          href={`/admin/projects/${id}/gallery`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Kelola Urutan & Caption Lengkap di Halaman Galeri →
                        </Link>
                      </div>
                    </div>
                  )
                ) : (
                  // New project mode: show pendingGallery
                  pendingGallery.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                      <p className="text-sm font-semibold text-slate-700">Belum ada foto galeri yang dipilih</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Anda dapat memilih beberapa foto sekaligus dari pustaka media sebelum menyimpan project baru ini.
                      </p>
                      <button
                        type="button"
                        onClick={() => setGalleryDialogOpen(true)}
                        className={`mt-3 ${btnPrimary}`}
                      >
                        + Tambah Foto Galeri
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {pendingGallery.map((path, idx) => (
                          <div
                            key={path}
                            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
                          >
                            <div className="relative aspect-[4/3] bg-slate-100">
                              <AdminImagePreview src={path} className="h-full w-full" />
                              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.2 text-[10px] font-bold text-white">
                                {idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemovePendingItem(path)}
                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600/90 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-700"
                                title="Batal pilih foto ini"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="truncate p-1.5 text-[10px] text-slate-400 font-mono" title={path}>
                              {path}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setGalleryDialogOpen(true)}
                          className={btnSecondarySm}
                        >
                          + Tambah Foto Lainnya
                        </button>
                      </div>
                    </div>
                  )
                )}
              </Card>
            ) : null}
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
          <Link href={route} className={btnSecondary}>
            Batal
          </Link>
        </div>
      </form>

      {/* Multi-Image Picker Dialog */}
      <MultiMediaDialog
        open={galleryDialogOpen}
        media={media}
        onSelectMultiple={handleAddGallery}
        onClose={() => setGalleryDialogOpen(false)}
        title={`Pilih Foto Galeri: ${values.title || singular}`}
        confirmLabel="Tambahkan ke Galeri"
      />

      {dialog}
    </div>
  );
}
