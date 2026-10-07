import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clientsPartners,
  media as mediaTable,
  projectImages,
  projects,
  settings as settingsTable,
  teamMembers,
  testimonials,
} from "@/lib/db/schema";
import { SETTING_TABS } from "@/lib/admin/settings-fields";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Real type comes from the file header, never from `file.type` — a browser MIME
 * and a filename extension are both trivially forgeable, and an uploaded .php or
 * .svg sitting under a public path is exactly how shared hosting gets owned.
 */
const SIGNATURES: Array<{ mime: string; ext: string; test: (b: Buffer) => boolean }> = [
  {
    mime: "image/jpeg",
    ext: "jpg",
    test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    ext: "png",
    test: (b) =>
      b.length > 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) =>
      b.length > 12 &&
      b.subarray(0, 4).toString("latin1") === "RIFF" &&
      b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

/**
 * Statically scoped on purpose. Reading the directory from an env var made
 * Turbopack treat this as unbounded filesystem access and trace the entire
 * project into the standalone bundle — 75 MB instead of 50, plus three build
 * warnings. Moving uploads is a one-line change here, which is a fair trade on
 * hosting with inode quotas.
 */
const UPLOADS = join(process.cwd(), "public", "uploads");

export function uploadDir(): string {
  return UPLOADS;
}

export type MediaItem = {
  id: number;
  filename: string;
  path: string;
  mime: string;
  size: number;
  alt: string;
};

export async function listMedia(): Promise<MediaItem[]> {
  const rows = await getDb().select().from(mediaTable).orderBy(desc(mediaTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    path: row.path,
    mime: row.mime,
    size: row.size,
    alt: row.alt,
  }));
}

export type UploadResult = { ok: true; item: MediaItem } | { ok: false; error: string };

export async function saveUpload(file: File, alt: string): Promise<UploadResult> {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, error: "File tidak terbaca." };
  }
  if (file.size === 0) return { ok: false, error: "File kosong." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `Ukuran maksimum ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const signature = SIGNATURES.find((candidate) => candidate.test(buffer));
  if (!signature) {
    return { ok: false, error: "Hanya file JPG, PNG, atau WEBP yang diizinkan." };
  }

  const id = randomUUID();
  const target = join(uploadDir(), `${id}.${signature.ext}`);
  const publicPath = `/uploads/${id}.${signature.ext}`;

  const dir = uploadDir();
  if (!target.startsWith(dir + sep)) {
    return { ok: false, error: "Tujuan upload tidak valid." };
  }

  await mkdir(dir, { recursive: true });
  await writeFile(target, buffer, { flag: "wx" });

  const db = getDb();
  await db.insert(mediaTable).values({
    // Stored for reference only; the path above is derived from a UUID.
    filename: file.name.slice(0, 255),
    path: publicPath,
    mime: signature.mime,
    size: buffer.length,
    alt: alt.trim().slice(0, 255),
  });

  // Read the row back instead of using INSERT ... RETURNING: that syntax is
  // MariaDB-only, and this has to work on MySQL 5.7 and 8 alike. `path` holds a
  // fresh UUID, so it is unique enough to find the row we just wrote.
  const [item] = await db.select().from(mediaTable).where(eq(mediaTable.path, publicPath));
  if (!item) return { ok: false, error: "Gagal menyimpan catatan gambar." };

  return {
    ok: true,
    item: {
      id: item.id,
      filename: item.filename,
      path: item.path,
      mime: item.mime,
      size: item.size,
      alt: item.alt,
    },
  };
}

/**
 * Image-typed Settings fields, taken from the admin registry so a new image
 * setting (e.g. another logo slot) is protected automatically without editing
 * this file.
 */
const IMAGE_SETTING_FIELDS = SETTING_TABS.flatMap((tab) =>
  tab.fields
    .filter((field) => field.type === "image")
    .map((field) => ({ group: tab.group, field: field.name })),
);

/**
 * Count settings references to a media path. Settings are one JSON document per
 * group, so each row is parsed in the application rather than with MySQL JSON
 * functions — that keeps it portable across MySQL/MariaDB on cPanel. A malformed
 * row is skipped rather than thrown, so one bad document cannot disable
 * protection for every other reference.
 */
function settingsUsage(rows: Array<{ key: string; value: string }>, path: string): number {
  let count = 0;
  for (const row of rows) {
    const fields = IMAGE_SETTING_FIELDS.filter((entry) => entry.group === row.key);
    if (fields.length === 0) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;

    const values = parsed as Record<string, unknown>;
    for (const { field } of fields) {
      if (values[field] === path) count += 1;
    }
  }
  return count;
}

/** Content columns and Settings JSON that can point at a media path. */
export async function mediaUsage(path: string): Promise<number> {
  const db = getDb();
  const [usedByProjects, usedByTeam, usedByClients, usedByTestimonials, usedByGallery, settingRows] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(projects).where(eq(projects.image, path)),
    db.select({ n: sql<number>`count(*)` }).from(teamMembers).where(eq(teamMembers.photo, path)),
    db.select({ n: sql<number>`count(*)` }).from(clientsPartners).where(eq(clientsPartners.logo, path)),
    db.select({ n: sql<number>`count(*)` }).from(testimonials).where(eq(testimonials.photo, path)),
    db.select({ n: sql<number>`count(*)` }).from(projectImages).where(eq(projectImages.image, path)),
    db.select().from(settingsTable),
  ]);
  return (
    Number(usedByProjects[0]?.n ?? 0) +
    Number(usedByTeam[0]?.n ?? 0) +
    Number(usedByClients[0]?.n ?? 0) +
    Number(usedByTestimonials[0]?.n ?? 0) +
    Number(usedByGallery[0]?.n ?? 0) +
    settingsUsage(settingRows, path)
  );
}

export type RemoveResult = { ok: true } | { ok: false; error: string };

export async function removeMedia(id: number): Promise<RemoveResult> {
  const db = getDb();
  const [row] = await db.select().from(mediaTable).where(eq(mediaTable.id, id));
  if (!row) return { ok: false, error: "Gambar tidak ditemukan." };

  const inUse = await mediaUsage(row.path);
  if (inUse > 0) {
    return { ok: false, error: `Masih dipakai oleh ${inUse} konten. Ganti gambarnya dulu.` };
  }

  // The file lives under public/uploads and its name is a UUID we generated, so
  // stripping the leading /uploads/ and joining against the dir is safe.
  const relative = row.path.replace(/^\/uploads\//, "");
  const candidate = resolve(uploadDir(), relative);
  if (candidate.startsWith(uploadDir() + sep)) {
    await unlink(candidate).catch(() => undefined);
  }

  await db.delete(mediaTable).where(eq(mediaTable.id, id));
  return { ok: true };
}

export async function setMediaAlt(id: number, alt: string): Promise<void> {
  await getDb().update(mediaTable).set({ alt: alt.trim().slice(0, 255) }).where(eq(mediaTable.id, id));
}
