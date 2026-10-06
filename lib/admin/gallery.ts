import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { media as mediaTable, projectImages, projects } from "@/lib/db/schema";
import { SAFE_UPLOAD_PATH } from "./fields";

export type GalleryRow = {
  id: number;
  projectId: number;
  image: string;
  caption: string;
  position: number;
};

export const MAX_CAPTION = 255;

export type GalleryResult = { ok: true } | { ok: false; error: string };

/** Ordered exactly as the public lightbox walks them. */
export async function listGallery(projectId: number): Promise<GalleryRow[]> {
  const rows = await getDb()
    .select()
    .from(projectImages)
    .where(eq(projectImages.projectId, projectId))
    .orderBy(asc(projectImages.position), asc(projectImages.id));

  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    image: row.image,
    caption: row.caption,
    position: row.position,
  }));
}

export async function projectExists(projectId: number): Promise<boolean> {
  const rows = await getDb().select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
  return rows.length > 0;
}

/** True only when the media library actually holds a row for this path. */
async function mediaExists(path: string): Promise<boolean> {
  const rows = await getDb()
    .select({ n: sql<number>`count(*)` })
    .from(mediaTable)
    .where(eq(mediaTable.path, path));
  return Number(rows[0]?.n ?? 0) > 0;
}

function normaliseCaption(caption: string): string {
  return caption.trim().slice(0, MAX_CAPTION);
}

async function nextPosition(projectId: number): Promise<number> {
  const result = await getDb()
    .select({ value: sql<number>`coalesce(max(${projectImages.position}), 0)` })
    .from(projectImages)
    .where(eq(projectImages.projectId, projectId));
  return Number(result[0]?.value ?? 0) + 1;
}

export async function addGalleryImage(
  projectId: number,
  image: string,
  caption: string,
): Promise<GalleryResult> {
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return { ok: false, error: "Project tidak valid." };
  }

  const path = image.trim();

  // Media library only. A well-formed path is not enough — /projects/* is bundled
  // artwork and must not become a gallery entry.
  if (!SAFE_UPLOAD_PATH.test(path)) {
    return { ok: false, error: "Path gambar tidak valid. Pilih dari pustaka media." };
  }

  // Ownership check: the target project has to exist before anything is attached.
  if (!(await projectExists(projectId))) {
    return { ok: false, error: "Project tidak ditemukan." };
  }

  // Never trust the client just because the format looks right: the path has to
  // correspond to a real media row, or the site would render a broken image.
  if (!(await mediaExists(path))) {
    return { ok: false, error: "Gambar tidak ada di pustaka media." };
  }

  await getDb()
    .insert(projectImages)
    .values({ projectId, image: path, caption: normaliseCaption(caption), position: await nextPosition(projectId) });

  return { ok: true };
}

export async function setGalleryCaption(id: number, caption: string): Promise<GalleryResult> {
  const updated = await getDb()
    .update(projectImages)
    .set({ caption: normaliseCaption(caption) })
    .where(eq(projectImages.id, id));

  return (updated as unknown as { affectedRows?: number }).affectedRows === 0
    ? { ok: false, error: "Gambar tidak ditemukan." }
    : { ok: true };
}

export async function deleteGalleryImage(id: number): Promise<GalleryResult> {
  // Only the gallery row is removed. The media file itself is deliberately left
  // alone — it may still be referenced as another project's cover.
  const deleted = await getDb().delete(projectImages).where(eq(projectImages.id, id));
  return (deleted as unknown as { affectedRows?: number }).affectedRows === 0
    ? { ok: false, error: "Gambar tidak ditemukan." }
    : { ok: true };
}

/**
 * Swaps a gallery image with its neighbour. Positions are renumbered from 1..n
 * for that project only, which keeps them dense within the gallery.
 */
export async function moveGalleryImage(id: number, delta: -1 | 1): Promise<GalleryResult> {
  const db = getDb();
  const [row] = await db.select().from(projectImages).where(eq(projectImages.id, id));
  if (!row) return { ok: false, error: "Gambar tidak ditemukan." };

  const rows = await listGallery(row.projectId);
  const index = rows.findIndex((item) => item.id === id);
  const target = index + delta;
  if (index === -1 || target < 0 || target >= rows.length) return { ok: true };

  const order = [...rows];
  [order[index], order[target]] = [order[target], order[index]];

  for (const [position, item] of order.entries()) {
    if (item.position === position + 1) continue;
    await db.update(projectImages).set({ position: position + 1 }).where(eq(projectImages.id, item.id));
  }

  return { ok: true };
}
