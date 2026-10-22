"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  batchUpdateMediaGroupAction,
  deleteMediaAction,
  updateMediaGroupAction,
  uploadMediaAction,
} from "@/app/admin/actions";
import AdminImagePreview from "./admin-image-preview";
import { useConfirmDialog } from "./confirm-dialog";
import { Banner, Card, EmptyState, btnDangerSm, btnPrimary, btnSecondarySm, inputClass } from "./ui";

type MediaItem = {
  id: number;
  filename: string;
  path: string;
  mime: string;
  size: number;
  alt: string;
  groupName?: string;
};

type Props = {
  items: MediaItem[];
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
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [targetGroup, setTargetGroup] = useState("Umum");
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [viewMode, setViewMode] = useState<"grid" | "folders">("grid");
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchTargetGroup, setBatchTargetGroup] = useState("");
  const [batchCustomGroup, setBatchCustomGroup] = useState("");

  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [singleTargetGroup, setSingleTargetGroup] = useState("");

  const [message, setMessage] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  // Distinct groups in existing library
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.groupName) set.add(item.groupName);
      else set.add("Umum");
    }
    const list = Array.from(set);
    return list.sort((a, b) => (a === "Umum" ? -1 : b === "Umum" ? 1 : a.localeCompare(b)));
  }, [items]);

  // Release the object URLs whenever the picked files change or component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setMessage(undefined);
    setSuccess(undefined);

    // Revoke old previews
    previewUrls.forEach((url) => URL.revokeObjectURL(url));

    setPickedFiles(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
  }

  function resetPicker() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setPickedFiles([]);
    setAlt("");
    setIsNewGroup(false);
    setNewGroupName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pickedFiles.length === 0) {
      setMessage("Pilih file terlebih dahulu.");
      return;
    }

    for (const f of pickedFiles) {
      if (f.size > maxBytes) {
        setMessage(`Berkas "${f.name}" terlalu besar. Maksimum ${formatSize(maxBytes)}.`);
        return;
      }
    }

    const finalGroup = isNewGroup ? newGroupName.trim() || "Umum" : targetGroup || "Umum";

    setBusy(true);
    setMessage(undefined);
    setSuccess(undefined);

    try {
      const formData = new FormData();
      for (const file of pickedFiles) {
        formData.append("files", file);
      }
      formData.set("alt", alt);
      formData.set("groupName", finalGroup);

      const result = await uploadMediaAction(formData);
      if (result.ok) {
        setSuccess(result.message ?? "Gambar terunggah.");
        resetPicker();
        router.refresh();
      } else {
        setMessage(result.message ?? "Gagal mengunggah.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    setMessage(undefined);
    setSuccess(undefined);
    try {
      const result = await deleteMediaAction(id);
      if (!result.ok) setMessage(result.message ?? "Gagal menghapus.");
      else {
        setSelectedIds((prev) => prev.filter((i) => i !== id));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveSingleGroupChange(id: number) {
    if (!singleTargetGroup.trim()) {
      setEditingGroupId(null);
      return;
    }
    setBusy(true);
    try {
      const res = await updateMediaGroupAction(id, singleTargetGroup.trim());
      if (!res.ok) setMessage(res.message);
      else {
        setSuccess("Grup gambar berhasil diperbarui.");
        setEditingGroupId(null);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function applyBatchGroup() {
    if (selectedIds.length === 0) return;
    const finalGroup = batchTargetGroup === "__new__" ? batchCustomGroup.trim() : batchTargetGroup.trim();
    if (!finalGroup) {
      setMessage("Pilih atau masukkan nama grup tujuan.");
      return;
    }

    setBusy(true);
    try {
      const res = await batchUpdateMediaGroupAction(selectedIds, finalGroup);
      if (!res.ok) setMessage(res.message);
      else {
        setSuccess(res.message ?? "Grup gambar berhasil diperbarui.");
        setSelectedIds([]);
        setBatchTargetGroup("");
        setBatchCustomGroup("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const itemGroup = item.groupName || "Umum";
      if (activeTab !== "Semua" && itemGroup !== activeTab) return false;
      if (!q) return true;
      return `${item.filename} ${item.alt} ${item.path} ${itemGroup}`.toLowerCase().includes(q);
    });
  }, [items, search, activeTab]);

  function selectAllFiltered() {
    const ids = filteredItems.map((item) => item.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  // Grouped items representation
  const itemsByGroup = useMemo(() => {
    const map = new Map<string, MediaItem[]>();
    for (const item of items) {
      const g = item.groupName || "Umum";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    }
    return map;
  }, [items]);

  // Items for currently opened folder (filtered by search if any)
  const currentFolderItems = useMemo(() => {
    if (!openFolder) return [];
    const groupItems = itemsByGroup.get(openFolder) ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return groupItems;
    return groupItems.filter((item) =>
      `${item.filename} ${item.alt} ${item.path} ${item.groupName}`.toLowerCase().includes(q)
    );
  }, [openFolder, itemsByGroup, search]);

  return (
    <div className="space-y-6">
      {/* Upload Form Card */}
      <Card
        title="Unggah Gambar"
        description={`JPG, PNG, atau WEBP sampai ${formatSize(maxBytes)} per berkas. Disimpan di ${uploadDirHint}.`}
      >
        {message ? <Banner tone="error">{message}</Banner> : null}
        {success ? <Banner tone="success">{success}</Banner> : null}

        <form onSubmit={submit} className="space-y-4">
          <div className={previewUrls.length > 0 ? "grid gap-4 sm:grid-cols-[220px_1fr] sm:items-start" : undefined}>
            <label
              htmlFor="media-file"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-9 text-center transition hover:border-blue-400 hover:bg-blue-50/40"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-500 shadow-xs ring-1 ring-slate-200">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 16V5" />
                  <path d="m8 9 4-4 4 4" />
                  <path d="M5 19h14" />
                </svg>
              </span>
              <span className="mt-3 text-sm font-semibold text-slate-800">Pilih gambar (bisa banyak)</span>
              <span className="mt-1 text-xs text-slate-400">atau seret berkas ke sini</span>
              <input
                id="media-file"
                ref={fileRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={onPick}
                className="sr-only"
              />
            </label>

            {previewUrls.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>{pickedFiles.length} berkas dipilih</span>
                  <span className="text-slate-400">
                    Total: {formatSize(pickedFiles.reduce((acc, f) => acc + f.size, 0))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 overflow-x-auto max-h-[160px] p-1">
                  {previewUrls.slice(0, 8).map((url, i) => (
                    <div
                      key={url}
                      className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs"
                      title={pickedFiles[i]?.name}
                    >
                      <AdminImagePreview src={url} fit="contain" className="h-full w-full" />
                    </div>
                  ))}
                  {previewUrls.length > 8 ? (
                    <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 text-xs font-bold text-slate-600">
                      +{previewUrls.length - 8} lagi
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* Group assignment during upload */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Grup / Folder Media
              </label>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {availableGroups.map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => {
                        setIsNewGroup(false);
                        setTargetGroup(grp);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                        !isNewGroup && targetGroup === grp
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      📁 {grp}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsNewGroup(true)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      isNewGroup
                        ? "bg-blue-600 text-white shadow-xs"
                        : "border border-dashed border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    + Buat Grup Baru
                  </button>
                </div>

                {isNewGroup ? (
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Ketik nama grup baru (misal: Event KNPI, Nobar Piala Dunia)…"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    maxLength={100}
                    autoFocus
                  />
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Alt Text (Opsional)
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Deskripsi untuk aksesibilitas dan SEO"
                maxLength={255}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button type="submit" disabled={busy || pickedFiles.length === 0} className={btnPrimary}>
              {busy
                ? "Mengunggah…"
                : pickedFiles.length > 1
                ? `Unggah ${pickedFiles.length} Gambar ke "${isNewGroup ? newGroupName || "Umum" : targetGroup}"`
                : `Unggah ke "${isNewGroup ? newGroupName || "Umum" : targetGroup}"`}
            </button>
            {pickedFiles.length > 0 ? (
              <button type="button" disabled={busy} onClick={resetPicker} className={btnDangerSm}>
                Batalkan Pilihan
              </button>
            ) : null}
          </div>
        </form>
      </Card>

      {/* Library Card */}
      <Card
        title="Pustaka Gambar"
        description={`${items.length} berkas tersimpan. Buka folder untuk melihat isi gambar di dalamnya, atau gunakan tab Grid Semua.`}
      >
        {/* Controls Bar: Search, View Mode, Group Tabs */}
        <div className="space-y-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] max-w-md">
              <input
                type="text"
                placeholder={
                  viewMode === "folders" && openFolder
                    ? `Cari gambar dalam folder "${openFolder}"…`
                    : "Cari gambar berdasarkan nama, alt, atau grup…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("grid");
                  }}
                  className={`rounded-md px-3 py-1.5 transition ${
                    viewMode === "grid"
                      ? "bg-white font-semibold text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Grid Semua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("folders");
                    if (activeTab !== "Semua") {
                      setOpenFolder(activeTab);
                    }
                  }}
                  className={`rounded-md px-3 py-1.5 transition ${
                    viewMode === "folders"
                      ? "bg-white font-semibold text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sistem Folder
                </button>
              </div>

              {viewMode === "grid" && filteredItems.length > 0 ? (
                <button
                  type="button"
                  onClick={selectedIds.length === filteredItems.length ? clearSelection : selectAllFiltered}
                  className={btnSecondarySm}
                >
                  {selectedIds.length === filteredItems.length ? "Batal Pilih Semua" : "Pilih Semua"}
                </button>
              ) : null}
            </div>
          </div>

          {/* Group Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="font-semibold text-slate-500 mr-1">Filter Grup:</span>
            {["Semua", ...availableGroups].map((grp) => {
              const count = grp === "Semua" ? items.length : items.filter((i) => (i.groupName || "Umum") === grp).length;
              const active = activeTab === grp;
              return (
                <button
                  key={grp}
                  type="button"
                  onClick={() => {
                    setActiveTab(grp);
                    if (viewMode === "folders") {
                      if (grp === "Semua") setOpenFolder(null);
                      else setOpenFolder(grp);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition ${
                    active ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>📁 {grp}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      active ? "bg-blue-700 text-blue-100" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Batch Actions Bar (visible when items selected) */}
          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-sm text-blue-900 shadow-xs">
              <div className="flex items-center gap-2 font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                  ✓
                </span>
                <span>{selectedIds.length} gambar dipilih</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-blue-800">Pindahkan ke:</span>
                <select
                  value={batchTargetGroup}
                  onChange={(e) => setBatchTargetGroup(e.target.value)}
                  className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Pilih Grup --</option>
                  {availableGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="__new__">+ Grup Baru…</option>
                </select>

                {batchTargetGroup === "__new__" ? (
                  <input
                    type="text"
                    placeholder="Nama grup baru"
                    value={batchCustomGroup}
                    onChange={(e) => setBatchCustomGroup(e.target.value)}
                    className="w-36 rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs text-slate-800 shadow-2xs"
                  />
                ) : null}

                <button
                  type="button"
                  disabled={busy || !batchTargetGroup || (batchTargetGroup === "__new__" && !batchCustomGroup.trim())}
                  onClick={applyBatchGroup}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50"
                >
                  Terapkan
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Content View */}
        {items.length === 0 ? (
          <EmptyState
            icon="image"
            title="Belum ada gambar"
            description="Unggah gambar pertama, lalu pilih dari pustaka ini pada form Project, Galeri, Tim, atau Settings."
          />
        ) : viewMode === "grid" ? (
          /* Grid View (Semua Gambar) */
          filteredItems.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm font-semibold text-slate-700">Tidak ada gambar yang cocok dengan pencarian.</p>
              <p className="mt-1 text-xs text-slate-400">Coba ubah kata kunci pencarian atau pilih tab grup lain.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.includes(item.id)}
                  onToggleSelect={() => toggleSelect(item.id)}
                  isEditingGroup={editingGroupId === item.id}
                  onStartEditGroup={() => {
                    setEditingGroupId(item.id);
                    setSingleTargetGroup(item.groupName || "Umum");
                  }}
                  onCancelEditGroup={() => setEditingGroupId(null)}
                  singleTargetGroup={singleTargetGroup}
                  onChangeSingleTargetGroup={setSingleTargetGroup}
                  onSaveSingleGroup={() => saveSingleGroupChange(item.id)}
                  availableGroups={availableGroups}
                  onDelete={() =>
                    confirm({
                      title: "Hapus gambar?",
                      description: `Berkas "${item.filename}" hanya dapat dihapus bila tidak sedang digunakan oleh project atau konten lain.`,
                      confirmLabel: "Hapus",
                      onConfirm: () => remove(item.id),
                    })
                  }
                  busy={busy}
                />
              ))}
            </div>
          )
        ) : (
          /* Sistem Folder Mode */
          openFolder === null ? (
            /* Daftar Folder / Directory Grid */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Pilih folder untuk membuka dan melihat isi gambar di dalamnya ({availableGroups.length} folder):</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {availableGroups.map((grp) => {
                  const groupItems = itemsByGroup.get(grp) ?? [];
                  const folderSize = groupItems.reduce((acc, i) => acc + i.size, 0);

                  return (
                    <div
                      key={grp}
                      onClick={() => {
                        setOpenFolder(grp);
                        setActiveTab(grp);
                      }}
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition group-hover:scale-105 group-hover:bg-amber-500/20">
                            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-1.5V9a3 3 0 0 0-3-3h-3.379a3 3 0 0 1-2.121-.879L8.379 3.999A3 3 0 0 0 6.257 3.12H4.5A3 3 0 0 0 1.5 6.12v11.88a3 3 0 0 0 3 3h15Z" />
                            </svg>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                            {groupItems.length} berkas
                          </span>
                        </div>

                        <div className="mt-4">
                          <h3
                            className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition truncate"
                            title={grp}
                          >
                            📁 {grp}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-400">Total {formatSize(folderSize)}</p>
                        </div>
                      </div>

                      {/* Mini preview stack */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex -space-x-2 overflow-hidden">
                          {groupItems.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="relative inline-block h-8 w-8 rounded-md bg-slate-100 ring-2 ring-white overflow-hidden shadow-2xs"
                            >
                              <AdminImagePreview src={item.path} className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-blue-600 transition group-hover:translate-x-0.5">
                          Buka Folder →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Isi Folder yang Sedang Dibuka */
            <div className="space-y-5">
              {/* Folder Breadcrumb & Action Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/90 bg-blue-50/70 p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenFolder(null);
                      setActiveTab("Semua");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    ← Kembali ke Semua Folder
                  </button>

                  <span className="text-slate-300">/</span>

                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📂</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900">{openFolder}</span>
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow-2xs">
                          {currentFolderItems.length} berkas
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Total {formatSize(currentFolderItems.reduce((acc, i) => acc + i.size, 0))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {currentFolderItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const ids = currentFolderItems.map((i) => i.id);
                        setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                    >
                      Pilih Semua di Folder Ini
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setTargetGroup(openFolder);
                      setIsNewGroup(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white shadow-2xs hover:bg-blue-700 transition"
                  >
                    + Unggah ke Folder Ini
                  </button>
                </div>
              </div>

              {/* Grid Images in Opened Folder */}
              {currentFolderItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-1.5V9a3 3 0 0 0-3-3h-3.379a3 3 0 0 1-2.121-.879L8.379 3.999A3 3 0 0 0 6.257 3.12H4.5A3 3 0 0 0 1.5 6.12v11.88a3 3 0 0 0 3 3h15Z" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-800">Folder "{openFolder}" masih kosong</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Gunakan form di atas untuk mengunggah gambar ke folder ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetGroup(openFolder);
                      setIsNewGroup(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mt-3.5 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                  >
                    Unggah Gambar Sekarang
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {currentFolderItems.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.includes(item.id)}
                      onToggleSelect={() => toggleSelect(item.id)}
                      isEditingGroup={editingGroupId === item.id}
                      onStartEditGroup={() => {
                        setEditingGroupId(item.id);
                        setSingleTargetGroup(item.groupName || "Umum");
                      }}
                      onCancelEditGroup={() => setEditingGroupId(null)}
                      singleTargetGroup={singleTargetGroup}
                      onChangeSingleTargetGroup={setSingleTargetGroup}
                      onSaveSingleGroup={() => saveSingleGroupChange(item.id)}
                      availableGroups={availableGroups}
                      onDelete={() =>
                        confirm({
                          title: "Hapus gambar?",
                          description: `Berkas "${item.filename}" hanya dapat dihapus bila tidak sedang digunakan oleh project atau konten lain.`,
                          confirmLabel: "Hapus",
                          onConfirm: () => remove(item.id),
                        })
                      }
                      busy={busy}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        )}

        <p className="mt-6 text-xs text-slate-400">
          Gambar yang masih dipakai project, galeri, atau anggota tim tidak bisa dihapus. Gambar yang dirujuk dari
          Settings harus diganti di sana lebih dulu.
        </p>
      </Card>

      {dialog}
    </div>
  );
}

function MediaCard({
  item,
  isSelected,
  onToggleSelect,
  isEditingGroup,
  onStartEditGroup,
  onCancelEditGroup,
  singleTargetGroup,
  onChangeSingleTargetGroup,
  onSaveSingleGroup,
  availableGroups,
  onDelete,
  busy,
}: {
  item: MediaItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  isEditingGroup: boolean;
  onStartEditGroup: () => void;
  onCancelEditGroup: () => void;
  singleTargetGroup: string;
  onChangeSingleTargetGroup: (v: string) => void;
  onSaveSingleGroup: () => void;
  availableGroups: string[];
  onDelete: () => void;
  busy: boolean;
}) {
  const [customNewGroup, setCustomNewGroup] = useState(false);

  return (
    <figure
      className={`relative overflow-hidden rounded-xl border bg-white shadow-2xs transition hover:shadow-md ${
        isSelected ? "border-blue-500 ring-2 ring-blue-500/30" : "border-slate-200"
      }`}
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        <AdminImagePreview src={item.path} alt={item.alt || item.filename} className="h-full w-full" />

        {/* Checkbox select */}
        <label
          className="absolute left-2.5 top-2.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border bg-white/90 shadow-xs transition hover:bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </label>

        {/* Group Badge / Edit Trigger */}
        <div className="absolute right-2.5 top-2.5">
          <button
            type="button"
            onClick={onStartEditGroup}
            title="Klik untuk mengubah grup"
            className="inline-flex items-center gap-1 rounded-full bg-[#041429]/80 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs backdrop-blur-xs transition hover:bg-[#041429]"
          >
            <span>📁 {item.groupName || "Umum"}</span>
            <span className="text-[10px] text-blue-200">✎</span>
          </button>
        </div>
      </div>

      <figcaption className="space-y-2 p-3.5">
        {/* Inline Group Edit Modal / Bar */}
        {isEditingGroup ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-xs space-y-2">
            <span className="font-semibold text-blue-950">Ganti grup:</span>
            {!customNewGroup ? (
              <select
                value={singleTargetGroup}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setCustomNewGroup(true);
                    onChangeSingleTargetGroup("");
                  } else {
                    onChangeSingleTargetGroup(e.target.value);
                  }
                }}
                className="w-full rounded border border-blue-300 bg-white p-1 text-xs"
              >
                {availableGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="__new__">+ Buat grup baru…</option>
              </select>
            ) : (
              <input
                type="text"
                placeholder="Nama grup baru…"
                value={singleTargetGroup}
                onChange={(e) => onChangeSingleTargetGroup(e.target.value)}
                className="w-full rounded border border-blue-300 bg-white p-1 text-xs"
                autoFocus
              />
            )}
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={onCancelEditGroup}
                className="rounded px-2 py-0.5 text-slate-600 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy || !singleTargetGroup.trim()}
                onClick={onSaveSingleGroup}
                className="rounded bg-blue-600 px-2 py-0.5 font-semibold text-white hover:bg-blue-700"
              >
                Simpan
              </button>
            </div>
          </div>
        ) : null}

        <div className="truncate text-sm font-semibold text-slate-800" title={item.filename}>
          {item.filename}
        </div>
        <div className="truncate font-mono text-[10px] text-slate-400" title={item.path}>
          {item.path}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {formatSize(item.size)}
          </span>
          <button type="button" disabled={busy} onClick={onDelete} className={btnDangerSm}>
            Hapus
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
