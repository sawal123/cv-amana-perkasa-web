"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteBrochureAction,
  moveBrochureAction,
  publishBrochureAction,
} from "@/app/admin/actions";
import { NavIcon } from "./icons";
import { useConfirmDialog } from "./confirm-dialog";
import { Badge, Banner, Card, EmptyState, PageHeader, btnDangerSm, btnIconSm, btnPrimary, btnSecondarySm } from "./ui";

/** Plain-data row handed down by the server page — no stored names, no paths. */
export type BrochureListRow = {
  id: number;
  title: string;
  filename: string;
  size: number;
  published: boolean;
  /** Pre-formatted on the server so client rendering stays deterministic. */
  updatedAt: string;
};

export function formatBrochureSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Brochure list. Same interaction contract as ContentManager — order here is
 * the order the site uses, and the first published row is the document the
 * landing "Download Brosur" CTA serves. Add/edit live on dedicated pages.
 */
export default function BrochureManager({ rows }: { rows: BrochureListRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

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
    <Link href="/admin/brochures/new" className={btnPrimary}>
      + Tambah brosur
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brosur PDF"
        description={`${rows.length} dokumen. Brosur tayang pertama di urutan ini yang dipakai tombol Download di halaman depan.`}
        actions={addButton}
      />

      {message ? <Banner tone="error">{message}</Banner> : null}

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="fileText"
            title="Belum ada brosur"
            description="Unggah company profile PDF pertama. Selama belum ada brosur tayang, tombol Download di halaman depan tidak ditampilkan."
            action={addButton}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="w-12 px-3 py-3 font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">Judul</th>
                  <th className="px-3 py-3 font-semibold">Berkas</th>
                  <th className="w-36 px-3 py-3 font-semibold">Diperbarui</th>
                  <th className="w-40 px-3 py-3 font-semibold">Status</th>
                  <th className="w-96 px-3 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60">
                    <td className="px-3 py-3 align-middle text-slate-400">{index + 1}</td>
                    <td className="px-3 py-3 align-middle">
                      <div className="font-semibold text-slate-900">{row.title}</div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500 ring-1 ring-red-100">
                          <NavIcon name="fileText" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm text-slate-700" title={row.filename}>{row.filename}</div>
                          <div className="text-xs text-slate-400">{formatBrochureSize(row.size)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle text-xs text-slate-500">{row.updatedAt}</td>
                    <td className="px-3 py-3 align-middle">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => publishBrochureAction(row.id, !row.published))}
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
                          onClick={() => run(() => moveBrochureAction(row.id, -1))}
                          className={btnIconSm}
                          aria-label="Naik"
                        >
                          <NavIcon name="chevronUp" className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === rows.length - 1}
                          onClick={() => run(() => moveBrochureAction(row.id, 1))}
                          className={btnIconSm}
                          aria-label="Turun"
                        >
                          <NavIcon name="chevronDown" className="h-3.5 w-3.5" />
                        </button>
                        {row.published ? (
                          <a href={`/brochures/${row.id}/download`} className={btnSecondarySm}>
                            Download
                          </a>
                        ) : null}
                        <Link href={`/admin/brochures/${row.id}/edit`} className={btnSecondarySm}>
                          Ubah
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            confirm({
                              title: "Hapus brosur?",
                              description: `"${row.title}" dan file PDF terkait akan dihapus permanen.`,
                              confirmLabel: "Hapus",
                              onConfirm: () => run(() => deleteBrochureAction(row.id)),
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
