"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteContentAction,
  moveContentAction,
  publishContentAction,
  saveContentAction,
} from "@/app/admin/actions";
import type { ContentTable, FieldDef, Payload } from "@/lib/admin/fields";
import type { AdminRow } from "@/lib/admin/store";
import { Banner, Card, Field, btnDanger, btnPrimary, btnSecondary, inputClass } from "./ui";

type Props = {
  table: ContentTable;
  label: string;
  singular: string;
  titleField: string;
  fields: FieldDef[];
  rows: AdminRow[];
  media: Array<{ path: string; alt: string }>;
};

type Draft = { id?: number; values: Payload };

function emptyDraft(fields: FieldDef[]): Draft {
  const values: Payload = {};
  for (const field of fields) values[field.name] = "";
  return { values };
}

export default function ContentManager({ table, label, singular, titleField, fields, rows, media }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function reset() {
    setErrors(undefined);
    setMessage(undefined);
  }

  function setResult(result: { ok: boolean; message?: string; errors?: Record<string, string> }) {
    if (result.ok) {
      setDraft(null);
      reset();
      router.refresh();
      return;
    }
    setErrors(result.errors);
    setMessage(result.message ?? "Gagal menyimpan. Coba lagi.");
  }

  /** Runs an action and shows a transient error instead of silently failing. */
  async function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(true);
    reset();
    try {
      const result = await action();
      if (!result.ok) {
        setMessage(result.message ?? "Terjadi kesalahan.");
        router.refresh();
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    reset();
    try {
      setResult(await saveContentAction(table, draft.values, draft.id));
    } finally {
      setBusy(false);
    }
  }

  function setValue(name: string, value: string) {
    setDraft((current) => (current ? { ...current, values: { ...current.values, [name]: value } } : current));
  }

  return (
    <div className="space-y-6">
      {message ? <Banner tone="error">{message}</Banner> : null}

      <Card
        title={label}
        description={`${rows.length} baris. Urutan di sini sama dengan urutan tampil di situs.`}
      >
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">Belum ada {singular}. Gunakan tombol di bawah untuk menambah.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="w-12 py-2.5 pr-3 font-semibold">#</th>
                  <th className="py-2.5 pr-3 font-semibold">{fields.find((f) => f.name === titleField)?.label ?? "Judul"}</th>
                  <th className="w-24 py-2.5 pr-3 font-semibold">Status</th>
                  <th className="w-56 py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-3 align-top text-slate-400">{index + 1}</td>
                    <td className="py-3 pr-3 align-top">
                      <div className="font-medium text-slate-900">
                        {row.values[titleField] || <span className="text-slate-400">(tanpa judul)</span>}
                      </div>
                      {table === "projects" && row.values.image ? (
                        <div className="relative mt-2 h-14 w-24 overflow-hidden rounded-md bg-slate-100">
                          <Image src={row.values.image} alt="" className="object-cover" fill sizes="96px" />
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => publishContentAction(table, row.id, !row.published))}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                          row.published ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {row.published ? "Tayang" : "Sembunyi"}
                      </button>
                    </td>
                    <td className="py-3 text-right align-top">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busy || index === 0}
                          onClick={() => run(() => moveContentAction(table, row.id, -1))}
                          className={`${btnSecondary} px-2.5 py-1 text-xs`}
                          aria-label="Naik"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === rows.length - 1}
                          onClick={() => run(() => moveContentAction(table, row.id, 1))}
                          className={`${btnSecondary} px-2.5 py-1 text-xs`}
                          aria-label="Turun"
                        >
                          ↓
                        </button>
                        {table === "projects" ? (
                          <Link
                            href={`/admin/projects/${row.id}/gallery`}
                            className={`${btnSecondary} px-2.5 py-1 text-xs`}
                          >
                            Galeri
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            reset();
                            setDraft({ id: row.id, values: { ...emptyDraft(fields).values, ...row.values } });
                          }}
                          className={`${btnSecondary} px-2.5 py-1 text-xs`}
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`Hapus ${singular} "${row.values[titleField] || row.id}"?`)) return;
                            run(() => deleteContentAction(table, row.id));
                          }}
                          className={`${btnDanger} px-2.5 py-1 text-xs`}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!draft ? (
          <button type="button" className={`${btnPrimary} mt-5`} onClick={() => { reset(); setDraft(emptyDraft(fields)); }}>
            + Tambah {singular}
          </button>
        ) : null}
      </Card>

      {draft ? (
        <Card title={draft.id ? `Ubah ${singular}` : `Tambah ${singular}`}>
          <form onSubmit={submit} className="space-y-5">
            {errors && Object.keys(errors).length ? (
              <Banner tone="error">
                <ul className="list-inside list-disc space-y-0.5">
                  {fields.filter((f) => errors[f.name]).map((f) => <li key={f.name}>{errors[f.name]}</li>)}
                  {errors.form ? <li>{errors.form}</li> : null}
                </ul>
              </Banner>
            ) : null}

            {fields.map((field) => {
              const value = draft.values[field.name] ?? "";
              const id = `${table}-${field.name}-${draft.id ?? "new"}`;

              return (
                <Field key={field.name} label={field.label} help={field.help} error={errors?.[field.name]} htmlFor={id}>
                  {field.type === "textarea" ? (
                    <textarea
                      id={id}
                      rows={4}
                      maxLength={field.maxLength}
                      className={inputClass}
                      value={value}
                      onChange={(e) => setValue(field.name, e.target.value)}
                    />
                  ) : (
                    <input
                      id={id}
                      type="text"
                      maxLength={field.maxLength}
                      className={inputClass}
                      value={value}
                      onChange={(e) => setValue(field.name, e.target.value)}
                    />
                  )}

                  {field.type === "image" ? (
                    <div className="mt-2 space-y-2">
                      {value ? (
                        <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          <Image src={value} alt="" className="object-cover" fill sizes="160px" />
                        </div>
                      ) : null}
                      {media.length ? (
                        <select
                          className={inputClass}
                          value=""
                          onChange={(e) => e.target.value && setValue(field.name, e.target.value)}
                        >
                          <option value="">Pilih dari pustaka gambar…</option>
                          {media.map((item) => (
                            <option key={item.path} value={item.path}>
                              {item.path}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Belum ada gambar di pustaka. Unggah lewat menu Media, atau tulis path manual di atas.
                        </p>
                      )}
                    </div>
                  ) : null}
                </Field>
              );
            })}

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? "Menyimpan…" : "Simpan"}
              </button>
              <button type="button" disabled={busy} className={btnSecondary} onClick={() => { reset(); setDraft(null); }}>
                Batal
              </button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
