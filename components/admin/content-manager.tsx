"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteContentAction, moveContentAction, publishContentAction } from "@/app/admin/actions";
import type { ContentTable, FieldDef } from "@/lib/admin/fields";
import type { AdminRow } from "@/lib/admin/store";
import AdminImagePreview from "./admin-image-preview";
import { NavIcon } from "./icons";
import { useConfirmDialog } from "./confirm-dialog";
import { Badge, Banner, Card, EmptyState, PageHeader, btnDangerSm, btnIconSm, btnPrimary, btnSecondarySm } from "./ui";

type Props = {
  table: ContentTable;
  route: string;
  label: string;
  singular: string;
  titleField: string;
  fields: FieldDef[];
  rows: AdminRow[];
};

/**
 * Content list. Add/edit live on dedicated pages (/new, /{id}/edit) so the list
 * stays focused and a long form (Project) is no longer appended below the table.
 */
export default function ContentManager({ table, route, label, singular, titleField, fields, rows }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  // The first image field is the row's thumbnail (project cover, team photo, …).
  const imageField = fields.find((field) => field.type === "image");

  /** Runs an action and shows a transient error instead of silently failing. */
  async function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await action();
      if (!result.ok) setMessage(result.message ?? "Terjadi kesalahan.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const addButton = (
    <Link href={`${route}/new`} className={btnPrimary}>
      + Tambah {singular}
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={label}
        description={`${rows.length} baris. Urutan di sini sama dengan urutan tampil di situs.`}
        actions={addButton}
      />

      {message ? <Banner tone="error">{message}</Banner> : null}

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={`Belum ada ${singular}`}
            description={`Tambahkan ${singular} pertama untuk mulai mengisi website.`}
            action={addButton}
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
                        {imageField && row.values[imageField.name] ? (
                          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200">
                            <AdminImagePreview src={row.values[imageField.name]} className="h-full w-full" />
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
                        <Link href={`${route}/${row.id}/edit`} className={btnSecondarySm}>
                          Ubah
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            confirm({
                              title: `Hapus ${singular}?`,
                              description: `"${row.values[titleField] || row.id}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
                              confirmLabel: "Hapus",
                              onConfirm: () => run(() => deleteContentAction(table, row.id)),
                            })
                          }
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

      {dialog}
    </div>
  );
}
