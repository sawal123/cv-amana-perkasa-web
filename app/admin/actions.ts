"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminUsers, settings as settingsTable } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { authSecretReady, createSession, destroySession, requireAdmin, verifyPassword } from "@/lib/auth";
import { TABLES, type ContentTable, type Payload } from "@/lib/admin/fields";
import {
  SETTINGS_SCHEMA_BY_GROUP,
  isSettingsGroup,
  tabFor,
} from "@/lib/admin/settings-fields";
import * as store from "@/lib/admin/store";
import { MAX_UPLOAD_BYTES, removeMedia, saveUpload, setMediaAlt } from "@/lib/media";

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
