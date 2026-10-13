"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  deleteContentAction,
  moveContentAction,
  publishContentAction,
  saveContentAction,
} from "@/app/admin/actions";
import type { ContentTable, FieldDef, Payload } from "@/lib/admin/fields";
import type { AdminRow } from "@/lib/admin/store";
import { NavIcon } from "./icons";
import {
  Badge,
  Banner,
  Card,
  EmptyState,
  Field,
  PageHeader,
  btnDangerSm,
  btnIconSm,
  btnPrimary,
  btnSecondary,
  btnSecondarySm,
  inputClass,
} from "./ui";

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
  const editorRef = useRef<HTMLDivElement>(null);

  // The editor lives below the list; bring it into view when it opens.
  useEffect(() => {
    if (draft) editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [draft]);

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

  function startAdd() {
    reset();
    setDraft(emptyDraft(fields));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={label}
        description={`${rows.length} baris. Urutan di sini sama dengan urutan tampil di situs.`}
        actions={
          !draft ? (
            <button type="button" className={btnPrimary} onClick={startAdd}>
              + Tambah {singular}
            </button>
          ) : null
        }
      />

      {message ? <Banner tone="error">{message}</Banner> : null}

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={`Belum ada ${singular}`}
            description={`Tambahkan ${singular} pertama untuk mulai mengisi website.`}
            action={
              !draft ? (
                <button type="button" className={btnPrimary} onClick={startAdd}>
                  + Tambah {singular}
                </button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="w-12 px-3 py-3 font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">{fields.find((f) => f.name === titleField)?.label ?? "Judul"}</th>
                  <th className="w-40 px-3 py-3 font-semibold">Status</th>
                  <th className="w-80 px-3 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60">
                    <td className="px-3 py-3 align-middle text-slate-400">{index + 1}</td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        {table === "projects" && row.values.image ? (
                          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200">
                            <Image src={row.values.image} alt="" className="object-cover" fill sizes="64px" />
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">
                            {row.values[titleField] || <span className="text-slate-400">(tanpa judul)</span>}
                          </div>
                          {table === "projects" && (row.values.category || row.values.year) ? (
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                              {row.values.category ? <span>{row.values.category}</span> : null}
                              {row.values.year ? <span>{row.values.year}</span> : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => publishContentAction(table, row.id, !row.published))}
                        className="rounded-full transition disabled:opacity-50"
                        aria-pressed={row.published}
                      >
                        {row.published ? <Badge tone="success">Tayang</Badge> : <Badge tone="neutral">Disembunyikan</Badge>}
                      </button>
                    </td>
                    <td className="px-3 py-3 align-middle text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busy || index === 0}
                          onClick={() => run(() => moveContentAction(table, row.id, -1))}
                          className={btnIconSm}
                          aria-label="Naik"
                        >
                          <NavIcon name="chevronUp" className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === rows.length - 1}
                          onClick={() => run(() => moveContentAction(table, row.id, 1))}
                          className={btnIconSm}
                          aria-label="Turun"
                        >
                          <NavIcon name="chevronDown" className="h-3.5 w-3.5" />
                        </button>
                        {table === "projects" ? (
                          <Link href={`/admin/projects/${row.id}/gallery`} className={btnSecondarySm}>
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
                          className={btnSecondarySm}
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
                          className={btnDangerSm}
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
      </Card>

      {draft ? (
        <div ref={editorRef} className="scroll-mt-24">
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

              <div className="grid gap-5 lg:grid-cols-2">
                {fields.map((field) => {
                  const value = draft.values[field.name] ?? "";
                  const id = `${table}-${field.name}-${draft.id ?? "new"}`;
                  const wide = field.type === "textarea" || field.type === "image";

                  return (
                    <div key={field.name} className={wide ? "lg:col-span-2" : undefined}>
                      <Field label={field.label} help={field.help} error={errors?.[field.name]} htmlFor={id}>
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
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                <button type="submit" disabled={busy} className={btnPrimary}>
                  {busy ? "Menyimpan…" : "Simpan"}
                </button>
                <button type="button" disabled={busy} className={btnSecondary} onClick={() => { reset(); setDraft(null); }}>
                  Batal
                </button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
