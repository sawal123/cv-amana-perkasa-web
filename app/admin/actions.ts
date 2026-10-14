"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminUsers, settings as settingsTable } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { authSecretReady, createSession, destroySession, requireAdmin, verifyPassword } from "@/lib/auth";
import { SAFE_UPLOAD_PATH, TABLES, type ContentTable, type Payload } from "@/lib/admin/fields";
import {
  SETTINGS_SCHEMA_BY_GROUP,
  isSettingsGroup,
  tabFor,
} from "@/lib/admin/settings-fields";
import * as gallery from "@/lib/admin/gallery";
import { MAX_CAPTION } from "@/lib/admin/gallery";
import * as store from "@/lib/admin/store";
import { MAX_UPLOAD_BYTES, removeMedia, saveUpload, setMediaAlt } from "@/lib/media";
import {
  deleteBrochure,
  moveBrochure,
  setBrochurePublished,
  updateBrochure,
} from "@/lib/brochures";
import { submitQuotation, updateQuotationStatus } from "@/lib/quotation";

export type ActionState = { ok: boolean; message?: string; errors?: Record<string, string> };

const OK: ActionState = { ok: true };

/** Turns a zod issue list into per-field Indonesian messages keyed by column name. */
function toErrors(
  issues: Array<{ path: PropertyKey[]; code: string }>,
  labelOf: (name: string) => string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const name = String(issue.path[0] ?? "");
    if (!name || errors[name]) continue;
    const label = labelOf(name);
    errors[name] =
      issue.code === "too_small" ? `${label} wajib diisi`
      : issue.code === "too_big" ? `${label} terlalu panjang`
      : `${label} tidak valid`;
  }
  return errors;
}

function fieldLabels(table: ContentTable) {
  return (name: string) => TABLES[table].fields.find((f) => f.name === name)?.label ?? name;
}

function isContentTable(value: string): value is ContentTable {
  return value in TABLES;
}

/**
 * The public page is force-dynamic, but revalidatePath is still what clears the
 * in-memory router cache for a visitor who already has the site open.
 */
function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/media");
  for (const key of Object.keys(TABLES) as ContentTable[]) revalidatePath(TABLES[key].route);
}

function databaseUnavailable(): ActionState {
  return { ok: false, message: "Database belum bisa dihubungi. Periksa DATABASE_URL, migrasi, dan seed." };
}

// ---------------------------------------------------------------- auth

export async function loginAction(username: string, password: string): Promise<ActionState> {
  if (!authSecretReady()) {
    return {
      ok: false,
      message: "AUTH_SECRET belum dikonfigurasi (minimal 32 karakter). Set di Environment Variables cPanel.",
    };
  }

  const name = username.trim();
  if (!name || !password) return { ok: false, message: "Isi username dan password." };

  let user: { id: number; username: string; passwordHash: string } | undefined;
  try {
    const rows = await getDb()
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, name))
      .limit(1);
    user = rows[0];
  } catch {
    return databaseUnavailable();
  }

  // One message for both unknown user and bad password — no user enumeration.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, message: "Username atau password salah." };
  }

  await createSession({ userId: user.id, username: user.username });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

// ---------------------------------------------------------- content rows

export async function saveContentAction(
  table: ContentTable,
  values: Payload,
  id?: number,
): Promise<ActionState> {
  await requireAdmin();
  if (!isContentTable(table)) return { ok: false, message: "Tabel tidak dikenal." };

  const parsed = TABLES[table].schema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, errors: toErrors(parsed.error.issues, fieldLabels(table)) };
  }

  try {
    await store.saveRow(table, parsed.data, id);
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

export async function deleteContentAction(table: ContentTable, id: number): Promise<ActionState> {
  await requireAdmin();
  if (!isContentTable(table)) return { ok: false, message: "Tabel tidak dikenal." };

  try {
    await store.deleteRow(table, id);
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

export async function moveContentAction(
  table: ContentTable,
  id: number,
  delta: -1 | 1,
): Promise<ActionState> {
  await requireAdmin();
  if (!isContentTable(table)) return { ok: false, message: "Tabel tidak dikenal." };

  try {
    await store.moveRow(table, id, delta);
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

export async function publishContentAction(
  table: ContentTable,
  id: number,
  published: boolean,
): Promise<ActionState> {
  await requireAdmin();
  if (!isContentTable(table)) return { ok: false, message: "Tabel tidak dikenal." };

  try {
    await store.setPublished(table, id, published);
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

// -------------------------------------------------------------- settings

export async function saveSettingsAction(
  group: string,
  values: Record<string, unknown>,
): Promise<ActionState> {
  await requireAdmin();
  if (!isSettingsGroup(group)) return { ok: false, message: "Grup pengaturan tidak dikenal." };

  const tab = tabFor(group);
  const labelOf = (name: string) => tab?.fields.find((f) => f.name === name)?.label ?? name;

  const parsed = SETTINGS_SCHEMA_BY_GROUP[group].safeParse(values);
  if (!parsed.success) {
    return { ok: false, errors: toErrors(parsed.error.issues, labelOf) };
  }

  const payload = JSON.stringify(parsed.data);
  try {
    await getDb()
      .insert(settingsTable)
      .values({ key: group, value: payload })
      .onDuplicateKeyUpdate({ set: { value: payload } });
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

// ----------------------------------------------------------------- media

export async function uploadMediaAction(formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Pilih file terlebih dahulu." };

  const alt = typeof formData.get("alt") === "string" ? String(formData.get("alt")) : "";

  try {
    const result = await saveUpload(file, alt);
    if (!result.ok) return { ok: false, message: result.error };
    revalidateAll();
    return { ok: true, message: `${result.item.filename} terunggah.` };
  } catch {
    return { ok: false, message: `Gagal menyimpan. Maksimum ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` };
  }
}

export async function deleteMediaAction(id: number): Promise<ActionState> {
  await requireAdmin();
  try {
    const result = await removeMedia(id);
    if (!result.ok) return { ok: false, message: result.error };
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

export async function updateMediaAltAction(id: number, alt: string): Promise<ActionState> {
  await requireAdmin();
  try {
    await setMediaAlt(id, alt);
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

// --------------------------------------------------------------- gallery

/**
 * Gallery mutations all run through requireAdmin() like every other admin write,
 * and every id is validated as a positive integer before it reaches SQL, so a
 * request cannot address an arbitrary project or gallery row.
 */
const positiveId = z.number().int().positive();
const captionSchema = z.string().trim().max(MAX_CAPTION).default("");
// Uploads only: the data layer then confirms the path exists in the media table.
const imagePathSchema = z.string().trim().regex(SAFE_UPLOAD_PATH);

function notFoundResult(what: string): ActionState {
  return { ok: false, message: `${what} tidak ditemukan.` };
}

export async function addGalleryImageAction(
  projectId: number,
  image: string,
  caption: string,
): Promise<ActionState> {
  await requireAdmin();

  const id = positiveId.safeParse(projectId);
  if (!id.success) return notFoundResult("Project");

  const path = imagePathSchema.safeParse(image);
  if (!path.success) return { ok: false, message: "Pilih gambar dari pustaka media." };

  const text = captionSchema.safeParse(caption);
  if (!text.success) return { ok: false, message: `Caption maksimal ${MAX_CAPTION} karakter.` };

  try {
    const result = await gallery.addGalleryImage(id.data, path.data, text.data);
    if (!result.ok) return { ok: false, message: result.error };
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

export async function updateGalleryCaptionAction(id: number, caption: string): Promise<ActionState> {
  await requireAdmin();

  const parsedId = positiveId.safeParse(id);
  if (!parsedId.success) return notFoundResult("Gambar");

  const text = captionSchema.safeParse(caption);
  if (!text.success) return { ok: false, message: `Caption maksimal ${MAX_CAPTION} karakter.` };

  try {
    const result = await gallery.setGalleryCaption(parsedId.data, text.data);
    if (!result.ok) return { ok: false, message: result.error };
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

export async function deleteGalleryImageAction(id: number): Promise<ActionState> {
  await requireAdmin();

  const parsedId = positiveId.safeParse(id);
  if (!parsedId.success) return notFoundResult("Gambar");

  try {
    const result = await gallery.deleteGalleryImage(parsedId.data);
    if (!result.ok) return { ok: false, message: result.error };
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

export async function moveGalleryImageAction(id: number, delta: -1 | 1): Promise<ActionState> {
  await requireAdmin();

  const parsedId = positiveId.safeParse(id);
  if (!parsedId.success) return notFoundResult("Gambar");
  if (delta !== -1 && delta !== 1) return { ok: false, message: "Arah tidak valid." };

  try {
    const result = await gallery.moveGalleryImage(parsedId.data, delta);
    if (!result.ok) return { ok: false, message: result.error };
    revalidateAll();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

// -------------------------------------------------------------- brochures

/**
 * Brochure mutations are a dedicated module rather than TABLES-registry CRUD:
 * a PDF upload needs binary validation and file-replacement semantics the
 * generic content store does not model. Every action runs through
 * requireAdmin(), ids are validated as positive integers before reaching SQL,
 * and the PDF itself is judged by its byte signature in lib/brochures.ts —
 * never by file.name or file.type.
 */
const brochureTitleSchema = z.string().trim().min(1).max(150);
const brochureDescriptionSchema = z.string().trim().max(500);

/**
 * The landing CTA and the admin list must both refresh: publishing, reordering
 * or deleting a brochure changes which document `/` offers for download.
 */
function revalidateBrochures() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/brochures");
}

function parseBrochureMeta(
  formData: FormData,
): { ok: true; title: string; description: string } | { ok: false; state: ActionState } {
  const title = brochureTitleSchema.safeParse(formData.get("title"));
  if (!title.success) {
    return {
      ok: false,
      state: { ok: false, errors: { title: "Judul wajib diisi (maksimal 150 karakter)." } },
    };
  }

  const rawDescription = formData.get("description");
  const description = brochureDescriptionSchema.safeParse(typeof rawDescription === "string" ? rawDescription : "");
  if (!description.success) {
    return { ok: false, state: { ok: false, errors: { description: "Deskripsi maksimal 500 karakter." } } };
  }

  return { ok: true, title: title.data, description: description.data };
}

export async function updateBrochureAction(id: number, formData: FormData): Promise<ActionState> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    return {
      ok: false,
      message: "Penggantian file PDF tidak didukung melalui Server Action. Gunakan endpoint upload.",
      errors: { file: "Penggantian file PDF tidak didukung melalui Server Action." },
    };
  }

  await requireAdmin();

  const parsedId = positiveId.safeParse(id);
  if (!parsedId.success) return notFoundResult("Brosur");

  const meta = parseBrochureMeta(formData);
  if (!meta.ok) return meta.state;

  try {
    const updated = await updateBrochure(parsedId.data, { title: meta.title, description: meta.description });
    if (!updated.ok) return { ok: false, message: updated.error };
    revalidateBrochures();
    return { ok: true, message: "Brosur diperbarui." };
  } catch {
    return databaseUnavailable();
  }
}

export async function deleteBrochureAction(id: number): Promise<ActionState> {
  await requireAdmin();

  const parsedId = positiveId.safeParse(id);
  if (!parsedId.success) return notFoundResult("Brosur");

  try {
    const result = await deleteBrochure(parsedId.data);
    if (!result.ok) return { ok: false, message: result.error };
    revalidateBrochures();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

export async function moveBrochureAction(id: number, delta: -1 | 1): Promise<ActionState> {
  await requireAdmin();

  const parsedId = positiveId.safeParse(id);
  if (!parsedId.success) return notFoundResult("Brosur");
  if (delta !== -1 && delta !== 1) return { ok: false, message: "Arah tidak valid." };

  try {
    const result = await moveBrochure(parsedId.data, delta);
    if (!result.ok) return { ok: false, message: result.error };
    revalidateBrochures();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

export async function publishBrochureAction(id: number, published: boolean): Promise<ActionState> {
  await requireAdmin();

  const parsedId = positiveId.safeParse(id);
  if (!parsedId.success) return notFoundResult("Brosur");

  try {
    const result = await setBrochurePublished(parsedId.data, published);
    if (!result.ok) return { ok: false, message: result.error };
    revalidateBrochures();
    return OK;
  } catch {
    return databaseUnavailable();
  }
}

// ------------------------------------------------------ quotation requests

/**
 * Public endpoint — no requireAdmin(), it is reachable by anyone.
 *
 * Nothing about the request is trusted: honeypot, zod validation, trimming and
 * the insert (with a server-set status of "new") all live in lib/quotation.ts,
 * keyed only by known columns. A database failure returns a fixed message so no
 * SQL, host name, or stack trace can leak to the visitor.
 */
export async function submitQuotationAction(values: Record<string, unknown>): Promise<ActionState> {
  try {
    const result = await submitQuotation(values);
    if (!result.ok) return { ok: false, errors: result.errors };
    return OK;
  } catch {
    return {
      ok: false,
      message:
        "Permintaan belum dapat dikirim. Silakan coba kembali atau hubungi kami melalui WhatsApp.",
    };
  }
}

export async function updateQuotationStatusAction(id: number, status: string): Promise<ActionState> {
  await requireAdmin();

  const parsedId = z.number().int().positive().safeParse(id);
  if (!parsedId.success) return notFoundResult("Permintaan");

  try {
    const result = await updateQuotationStatus(parsedId.data, status);
    if (!result.ok) return { ok: false, message: result.error };
    revalidatePath("/admin/quotation-requests");
    revalidatePath(`/admin/quotation-requests/${parsedId.data}`);
    return OK;
  } catch {
    return databaseUnavailable();
  }
}
