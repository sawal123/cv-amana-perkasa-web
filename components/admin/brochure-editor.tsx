"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { updateBrochureAction } from "@/app/admin/actions";
import { NavIcon } from "./icons";
import { formatBrochureSize } from "./brochure-manager";
import { Banner, Card, Field, PageHeader, btnPrimary, btnSecondary, btnSecondarySm, inputClass } from "./ui";

type CurrentBrochure = {
  id: number;
  title: string;
  description: string;
  filename: string;
  size: number;
  published: boolean;
};

/**
 * Add/edit form for one brochure. The PDF itself is picked through a styled
 * drop area (never a bare file input) and only ever validated server-side by
 * its byte signature — the `accept` attribute below is a convenience filter,
 * not a security control. In edit mode the replacement file is optional:
 * saving metadata alone keeps the current PDF.
 */
export default function BrochureEditor({
  maxBytes,
  brochure,
}: {
  maxBytes: number;
  /** Present in edit mode only. */
  brochure?: CurrentBrochure;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(brochure?.title ?? "");
  const [description, setDescription] = useState(brochure?.description ?? "");
  const [picked, setPicked] = useState<{ name: string; size: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setErrors(undefined);
    setMessage(undefined);
    if (!file) {
      setPicked(null);
      return;
    }
    if (file.size > maxBytes) {
      setPicked(null);
      event.target.value = "";
      setMessage(`File terlalu besar. Maksimum ${formatBrochureSize(maxBytes)}.`);
      return;
    }
    setPicked({ name: file.name, size: file.size });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0] ?? null;

    if (!brochure && !file) {
      setErrors({ file: "Pilih file PDF terlebih dahulu." });
      return;
    }

    setBusy(true);
    setErrors(undefined);
    setMessage(undefined);
    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      if (file) formData.set("file", file);

      let result: { ok: boolean; message?: string; errors?: Record<string, string> };

      if (file) {
        // PDF transfer travels through the authenticated route handler, keeping
        // Server Actions bodySizeLimit at 4 MB.
        const url = brochure ? `/api/admin/brochures/${brochure.id}` : "/api/admin/brochures";
        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });
        result = await response.json().catch(() => ({
          ok: false,
          message: "Gagal menyimpan brosur. Coba lagi.",
        }));
      } else if (brochure) {
        // Metadata-only edit uses the existing Server Action
        result = await updateBrochureAction(brochure.id, formData);
      } else {
        setErrors({ file: "Pilih file PDF terlebih dahulu." });
        return;
      }

      if (result.ok) {
        router.refresh();
        router.push("/admin/brochures");
        return;
      }
      setErrors(result.errors);
      setMessage(result.message ?? "Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/brochures"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <NavIcon name="arrowRight" className="h-4 w-4 rotate-180" /> Kembali ke daftar brosur
        </Link>
        <div className="mt-4">
          <PageHeader
            title={brochure ? "Ubah brosur" : "Tambah brosur"}
            description={
              brochure
                ? `Mengubah “${brochure.title || "brosur tanpa judul"}”. PDF boleh diganti, boleh tidak.`
                : "Unggah company profile PDF. Tombol Download di halaman depan otomatis memakai brosur tayang pertama."
            }
          />
        </div>
      </div>

      {message ? <Banner tone="error">{message}</Banner> : null}

      <form onSubmit={submit} className="space-y-6">
        <Card title="Detail">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Judul" htmlFor="brochure-title" error={errors?.title} help="Label internal di admin. Tombol publik tetap bertuliskan “Download Brosur”.">
              <input
                id="brochure-title"
                type="text"
                maxLength={150}
                required
                className={inputClass}
                placeholder="Company Profile CV AMANA PERKASA 2026"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label="Deskripsi" htmlFor="brochure-description" error={errors?.description} help="Opsional. Catatan singkat untuk admin.">
              <textarea
                id="brochure-description"
                rows={2}
                maxLength={500}
                className={inputClass}
                placeholder="Company profile dan portfolio layanan terbaru."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card title={brochure ? "Ganti PDF" : "PDF"} description={`Maksimum ${formatBrochureSize(maxBytes)}. Isi file diverifikasi server-side dari signature PDF.`}>
          <div className="space-y-4">
            {brochure && !picked ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500 ring-1 ring-red-100">
                  <NavIcon name="fileText" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">PDF saat ini</div>
                  <div className="truncate text-sm font-semibold text-slate-800" title={brochure.filename}>{brochure.filename}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{formatBrochureSize(brochure.size)}</div>
                </div>
                {brochure.published ? (
                  <a href={`/brochures/${brochure.id}/download`} className={btnSecondarySm} target="_blank" rel="noopener noreferrer">
                    Lihat
                  </a>
                ) : null}
              </div>
            ) : null}

            {picked ? (
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-red-500 ring-1 ring-slate-200">
                  <NavIcon name="fileText" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">{picked.name}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{formatBrochureSize(picked.size)}</div>
                </div>
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={btnSecondarySm}>
                  Ganti file
                </button>
              </div>
            ) : (
              <label
                htmlFor="brochure-file"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
                  <NavIcon name="fileText" className="h-5 w-5" />
                </span>
                <span className="mt-3 text-sm font-semibold text-slate-700">Pilih berkas PDF</span>
                <span className="mt-1 text-xs text-slate-400">Company profile, brosur layanan, atau portfolio</span>
              </label>
            )}

            <input
              id="brochure-file"
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={onPick}
              className="sr-only"
            />
            {errors?.file ? <p className="text-xs font-medium text-red-600">{errors.file}</p> : null}
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
          <Link href="/admin/brochures" className={btnSecondary}>
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
