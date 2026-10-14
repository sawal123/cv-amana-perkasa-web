import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { sep } from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { brochures as brochuresTable, type BrochureRow } from "@/lib/db/schema";
import { brochureStoragePath, resolveBrochureStorageDir } from "@/lib/upload-storage";
import type { Brochure } from "@/lib/types";

export function revalidateBrochures(): void {
  try {
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/brochures");
  } catch {
    // Safe when invoked in environments without Next request context
  }
}

/**
 * PDF brochure storage + data layer.
 *
 * The bytes live on the persistent filesystem under
 * `<UPLOAD_STORAGE_DIR>/brochures/<uuid>.pdf`; MySQL only ever holds metadata
 * (title, description, original filename, stored name, mime, size, ordering,
 * publish state). This is deliberately separate from lib/media.ts, which stays
 * image-only — a PDF must never be accepted by the image Media manager.
 */

export const MAX_BROCHURE_BYTES = 15 * 1024 * 1024;
export const BROCHURE_MIME = "application/pdf";

/**
 * Stored names are always server-generated UUIDs, so anything else is not ours
 * to serve. This is the traversal guard for the download route: no client value
 * ever reaches the filesystem without passing it.
 */
const SAFE_STORED_NAME = /^[a-f0-9-]{36}\.pdf$/i;

/**
 * The real type comes from the file header, never from `file.name`, `file.type`
 * or the extension — all three are trivially forgeable. A renamed .exe, .php,
 * PNG or HTML document is refused here.
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

export type BrochureResult = { ok: true } | { ok: false; error: string };

/** Row shape consumed by the admin components — no stored_name, no paths. */
export type BrochureAdminItem = {
  id: number;
  title: string;
  description: string;
  filename: string;
  size: number;
  position: number;
  published: boolean;
  updatedAt: Date;
};

function toAdminItem(row: BrochureRow): BrochureAdminItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    filename: row.filename,
    size: row.size,
    position: row.position,
    published: row.published,
    updatedAt: row.updatedAt,
  };
}

/**
 * Reduces an upload name to a display-safe label: no directory parts (some
 * clients send full paths), no control characters, and always guaranteed to
 * terminate with ".pdf". Used for the stored `filename` column and the download
 * label — never to build a filesystem path. A valid PDF uploaded as
 * "company.exe" is sanitized to "company.pdf", never ".exe".
 */
export function sanitizeOriginalFilename(name: string): string {
  const base = (name ?? "").replace(/\\/g, "/").split("/").pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!cleaned) return "brochure.pdf";

  let stem = cleaned;
  if (/\.pdf$/i.test(stem)) {
    stem = stem.slice(0, -4);
  } else {
    const lastDot = stem.lastIndexOf(".");
    if (lastDot >= 0) {
      stem = stem.slice(0, lastDot);
    }
  }
  if (/\.pdf$/i.test(stem)) {
    stem = stem.slice(0, -4);
  }

  const safeStem = stem.replace(/^[\s.]+|[\s.]+$/g, "");
  if (!safeStem) return "brochure.pdf";

  const finalName = `${safeStem}.pdf`;
  return finalName.length > 200 ? `${safeStem.slice(0, 196)}.pdf` : finalName;
}

/**
 * Content-Disposition value for a download. The original name may be UTF-8, so
 * an ASCII fallback and an RFC 5987 `filename*` are both emitted — browsers
 * prefer the latter. Quotes, backslashes and non-ASCII bytes can never break out
 * of the header because the fallback strips them and the extended form is
 * percent-encoded.
 */
export function brochureContentDisposition(filename: string): string {
  const safe = sanitizeOriginalFilename(filename);
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "brochure.pdf";
  const utf8 = encodeURIComponent(safe).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

/** Absolute path of a stored brochure, or null when the name is not ours. */
export function resolveBrochureFilePath(storedName: string): string | null {
  if (!SAFE_STORED_NAME.test(storedName)) return null;
  const dir = resolveBrochureStorageDir();
  const target = brochureStoragePath(storedName);
  return target.startsWith(dir + sep) ? target : null;
}

// ------------------------------------------------------------ file validation

export type BrochureFileCheck = { ok: true; buffer: Buffer } | { ok: false; error: string };

/**
 * Server-side validation of an uploaded brochure. Size is checked against the
 * declared File size AND the actual buffer length, and the PDF signature is read
 * from the bytes — browser-side checks are convenience only.
 */
export async function readBrochureFile(file: File): Promise<BrochureFileCheck> {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, error: "File tidak terbaca." };
  }
  if (file.size === 0) return { ok: false, error: "File kosong." };
  if (file.size > MAX_BROCHURE_BYTES) {
    return { ok: false, error: `Ukuran maksimum ${Math.floor(MAX_BROCHURE_BYTES / 1024 / 1024)} MB.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) return { ok: false, error: "File kosong." };
  if (buffer.length > MAX_BROCHURE_BYTES) {
    return { ok: false, error: `Ukuran maksimum ${Math.floor(MAX_BROCHURE_BYTES / 1024 / 1024)} MB.` };
  }
  if (!isPdfBuffer(buffer)) {
    return { ok: false, error: "Hanya file PDF yang diizinkan." };
  }
  return { ok: true, buffer };
}

/** Writes validated bytes under a fresh UUID name; returns the generated name. */
async function writeBrochureFile(buffer: Buffer): Promise<string> {
  const storedName = `${randomUUID()}.pdf`;
  const dir = resolveBrochureStorageDir();
  const target = brochureStoragePath(storedName);
  if (!target.startsWith(dir + sep)) throw new Error("Tujuan upload tidak valid.");

  await mkdir(dir, { recursive: true });
  await writeFile(target, buffer, { flag: "wx" });
  return storedName;
}

// ------------------------------------------------------------------ data layer

/** Admin order = site order: position, then id. */
export async function listBrochures(): Promise<BrochureAdminItem[]> {
  const rows = await getDb()
    .select()
    .from(brochuresTable)
    .orderBy(asc(brochuresTable.position), asc(brochuresTable.id));
  return rows.map(toAdminItem);
}

export async function getBrochureById(id: number): Promise<BrochureRow | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const [row] = await getDb().select().from(brochuresTable).where(eq(brochuresTable.id, id)).limit(1);
  return row ?? null;
}

/**
 * The active landing brochure: the first published row in CMS order. Publish
 * state + ordering alone decide which document the public CTA serves.
 */
export async function getPublishedBrochure(): Promise<BrochureRow | null> {
  const [row] = await getDb()
    .select()
    .from(brochuresTable)
    .where(eq(brochuresTable.published, true))
    .orderBy(asc(brochuresTable.position), asc(brochuresTable.id))
    .limit(1);
  return row ?? null;
}

/**
 * Public projection for the landing page. Never throws: a broken or unmigrated
 * brochures table must blank the CTA, not the rest of the site. Exposes only
 * what the browser needs — no stored name, no filesystem path.
 */
export async function loadLandingBrochure(): Promise<Brochure | null> {
  try {
    const row = await getPublishedBrochure();
    return row ? { id: row.id, title: row.title, description: row.description } : null;
  } catch {
    return null;
  }
}

async function nextPosition(): Promise<number> {
  const result = await getDb()
    .select({ value: sql<number>`coalesce(max(${brochuresTable.position}), 0)` })
    .from(brochuresTable);
  return Number(result[0]?.value ?? 0) + 1;
}

/**
 * Validate → write file → insert row. If the insert fails the just-written file
 * is removed again, so a failed create never leaves an orphan on disk.
 */
export async function createBrochure(input: {
  title: string;
  description: string;
  file: File;
}): Promise<BrochureResult> {
  const trimmedTitle = (input.title ?? "").trim();
  if (trimmedTitle.length === 0 || trimmedTitle.length > 150) {
    return { ok: false, error: "Judul wajib diisi (maksimal 150 karakter)." };
  }
  const trimmedDesc = (input.description ?? "").trim();
  if (trimmedDesc.length > 500) {
    return { ok: false, error: "Deskripsi maksimal 500 karakter." };
  }

  const check = await readBrochureFile(input.file);
  if (!check.ok) return check;

  const storedName = await writeBrochureFile(check.buffer);
  const filename = sanitizeOriginalFilename(input.file.name);

  const db = getDb();
  try {
    await db.insert(brochuresTable).values({
      title: trimmedTitle.slice(0, 150),
      description: trimmedDesc.slice(0, 500),
      filename,
      storedName,
      mime: BROCHURE_MIME,
      size: check.buffer.length,
      position: await nextPosition(),
      published: true,
    });
  } catch (error) {
    await unlink(brochureStoragePath(storedName)).catch(() => undefined);
    throw error;
  }

  // Read the row back rather than INSERT ... RETURNING: that syntax is
  // MariaDB-only, and stored_name is a fresh UUID — unique enough to find it.
  const [row] = await db.select().from(brochuresTable).where(eq(brochuresTable.storedName, storedName)).limit(1);
  if (!row) {
    await unlink(brochureStoragePath(storedName)).catch(() => undefined);
    return { ok: false, error: "Gagal menyimpan catatan brosur." };
  }
  return { ok: true };
}

export type UpdateBrochureInput = {
  title?: string;
  description?: string;
  file?: File | null;
};

/**
 * Single transactional service operation for brochure update / replacement:
 * 1. Validate metadata first (title, description).
 * 2. Validate PDF file (if provided).
 * 3. Write new UUID PDF to disk (if provided).
 * 4. Update title + description + filename + stored_name + mime + size together in DB.
 * 5. If DB update fails: delete new UUID PDF and preserve old DB row and file.
 * 6. Only after DB success: delete old PDF file.
 */
export async function updateBrochureWithFile(
  id: number,
  input: UpdateBrochureInput,
  dbOverride?: any,
): Promise<BrochureResult> {
  const db = dbOverride ?? getDb();

  let row: BrochureRow | null = null;
  if (dbOverride && typeof dbOverride.select === "function") {
    const [overrideRow] = await dbOverride.select().from(brochuresTable).where(eq(brochuresTable.id, id)).limit(1);
    row = overrideRow ?? null;
  } else {
    row = await getBrochureById(id);
  }

  if (!row) return { ok: false, error: "Brosur tidak ditemukan." };

  // 1. Validate metadata first
  let newTitle: string | undefined;
  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (trimmed.length === 0 || trimmed.length > 150) {
      return { ok: false, error: "Judul wajib diisi (maksimal 150 karakter)." };
    }
    newTitle = trimmed.slice(0, 150);
  }

  let newDescription: string | undefined;
  if (input.description !== undefined) {
    const trimmed = input.description.trim();
    if (trimmed.length > 500) {
      return { ok: false, error: "Deskripsi maksimal 500 karakter." };
    }
    newDescription = trimmed.slice(0, 500);
  }

  // 2. Validate PDF (if provided)
  let check: BrochureFileCheck | null = null;
  if (input.file) {
    check = await readBrochureFile(input.file);
    if (!check.ok) return check;
  }

  // 3. Write new UUID PDF (if provided)
  let newStoredName: string | null = null;
  let newFilename: string | null = null;
  if (check && check.ok && input.file) {
    newStoredName = await writeBrochureFile(check.buffer);
    newFilename = sanitizeOriginalFilename(input.file.name);
  }

  // 4. Update title + description + filename + stored_name + mime + size together
  const updateValues: Record<string, unknown> = {};
  if (newTitle !== undefined) {
    updateValues.title = newTitle;
  }
  if (newDescription !== undefined) {
    updateValues.description = newDescription;
  }
  if (newStoredName && newFilename && check && check.ok) {
    updateValues.filename = newFilename;
    updateValues.storedName = newStoredName;
    updateValues.mime = BROCHURE_MIME;
    updateValues.size = check.buffer.length;
  }

  if (Object.keys(updateValues).length > 0) {
    try {
      await db
        .update(brochuresTable)
        .set(updateValues)
        .where(eq(brochuresTable.id, id));
    } catch (error) {
      // 5. If DB update fails: delete new PDF and preserve old DB/file
      if (newStoredName) {
        await unlink(brochureStoragePath(newStoredName)).catch(() => undefined);
      }
      throw error;
    }
  }

  // 6. Only after DB success: delete old PDF
  if (newStoredName) {
    const oldPath = resolveBrochureFilePath(row.storedName);
    if (oldPath) await unlink(oldPath).catch(() => undefined);
  }

  return { ok: true };
}

/** Metadata only — delegates to updateBrochureWithFile. */
export async function updateBrochure(
  id: number,
  input: { title: string; description: string },
  dbOverride?: any,
): Promise<BrochureResult> {
  return updateBrochureWithFile(id, input, dbOverride);
}

/**
 * Validate new PDF → write new file → point the row at it → delete the old file.
 * Delegates to updateBrochureWithFile for atomic transactional update.
 */
export async function replaceBrochureFile(
  id: number,
  file: File,
  dbOverride?: any,
): Promise<BrochureResult> {
  return updateBrochureWithFile(id, { file }, dbOverride);
}

export async function setBrochurePublished(id: number, published: boolean): Promise<BrochureResult> {
  const row = await getBrochureById(id);
  if (!row) return { ok: false, error: "Brosur tidak ditemukan." };
  await getDb().update(brochuresTable).set({ published }).where(eq(brochuresTable.id, id));
  return { ok: true };
}

/**
 * Swap with the neighbour, then renumber positions densely (1..n) — the same
 * contract as lib/admin/store.moveRow, so ordering never drifts.
 */
export async function moveBrochure(id: number, delta: -1 | 1): Promise<BrochureResult> {
  const rows = await listBrochures();
  const index = rows.findIndex((row) => row.id === id);
  const swapWith = index === -1 ? -1 : index + delta;
  if (index === -1) return { ok: false, error: "Brosur tidak ditemukan." };
  if (swapWith < 0 || swapWith >= rows.length) return { ok: true };

  const order = [...rows];
  [order[index], order[swapWith]] = [order[swapWith], order[index]];

  const db = getDb();
  for (const [position, row] of order.entries()) {
    if (row.position === position + 1) continue;
    await db.update(brochuresTable).set({ position: position + 1 }).where(eq(brochuresTable.id, row.id));
  }
  return { ok: true };
}

/**
 * Delete the row first, then the physical PDF. A file that is already gone must
 * not fail the operation — the database cleanup is what matters.
 */
export async function deleteBrochure(id: number): Promise<BrochureResult> {
  const row = await getBrochureById(id);
  if (!row) return { ok: false, error: "Brosur tidak ditemukan." };

  await getDb().delete(brochuresTable).where(eq(brochuresTable.id, id));

  const target = resolveBrochureFilePath(row.storedName);
  if (target) await unlink(target).catch(() => undefined);
  return { ok: true };
}
