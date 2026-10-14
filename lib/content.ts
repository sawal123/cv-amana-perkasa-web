import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import { defaultContent } from "@/data/site";
import { loadLandingBrochure } from "@/lib/brochures";
import { getDb } from "@/lib/db";
import {
  clientsPartners as clientsTable,
  companyLegalities as legalitiesTable,
  projectImages as projectImagesTable,
  projects as projectsTable,
  services as servicesTable,
  settings as settingsTable,
  teamMembers as teamTable,
  testimonials as testimonialsTable,
  whyChooseUs as whyUsTable,
  workflowSteps as workflowTable,
  type ProjectImageRow,
  type ProjectRow,
} from "@/lib/db/schema";
import { SETTINGS_GROUPS, type GalleryImage, type Project, type SiteContent, type SiteSettings } from "@/lib/types";

type SettingsMap = Partial<Record<keyof SiteSettings, unknown>>;

let warned = false;
function warnOnce(label: string, error: unknown) {
  if (warned) return;
  warned = true;
  console.warn(
    `[content] ${label}; falling back to bundled data/site.json. ` +
      `Further occurrences are suppressed. ${(error as Error)?.message ?? error}`,
  );
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Layer stored groups over the bundled defaults one key at a time. Keys that are
 * absent from the database keep their default, so adding a field to SiteSettings
 * later needs no migration. Keys that are present but empty are respected as-is —
 * clearing a field in the admin must actually clear it on the site.
 */
function mergeValue<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(override) ? (override as T) : base);
  }
  if (base !== null && typeof base === "object") {
    const out = { ...(base as Record<string, unknown>) };
    const source = (override ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(out)) {
      if (key in source) out[key] = mergeValue(out[key], source[key]);
    }
    return out as T;
  }
  return (override === undefined ? base : (override as T));
}

function mergeSettings(stored: SettingsMap): SiteSettings {
  const base = defaultContent.settings;
  const out = {} as SiteSettings;
  for (const group of SETTINGS_GROUPS) {
    (out as Record<string, unknown>)[group] = mergeValue(base[group], stored[group]);
  }
  return out;
}

async function readStoredSettings(): Promise<{ map: SettingsMap; ok: boolean }> {
  try {
    const rows = await getDb().select().from(settingsTable);
    const map: SettingsMap = {};
    for (const row of rows) {
      const value = parseJson(row.value);
      if (value !== undefined) (map as Record<string, unknown>)[row.key] = value;
    }
    return { map, ok: true };
  } catch (error) {
    warnOnce("settings unreadable", error);
    return { map: {}, ok: false };
  }
}

/**
 * True only once the database is reachable AND holds at least one settings row.
 * The single source of the "seeded" decision shared by loadContent and the
 * project loaders, so an unseeded database renders bundled content everywhere.
 */
async function isSeeded(): Promise<boolean> {
  const { map, ok } = await readStoredSettings();
  return ok && Object.keys(map).length > 0;
}

/** Nests gallery rows under their project id, preserving the SQL order. */
function groupGallery(rows: ProjectImageRow[]): Map<number, GalleryImage[]> {
  const byProject = new Map<number, GalleryImage[]>();
  for (const row of rows) {
    const list = byProject.get(row.projectId) ?? [];
    list.push({ id: row.id, image: row.image, caption: row.caption });
    byProject.set(row.projectId, list);
  }
  return byProject;
}

/** Maps one `projects` row plus its gallery into the public Project shape. */
function toProject(row: ProjectRow, gallery: GalleryImage[]): Project {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    image: row.image,
    description: row.description,
    client: row.client,
    location: row.location,
    year: row.year,
    scope: row.scope,
    objective: row.objective,
    approach: row.approach,
    outcome: row.outcome,
    gallery,
  };
}

/**
 * True only once the database is reachable AND has been seeded. An unseeded or
 * broken database therefore renders the bundled content, while a seeded one is
 * honoured exactly — deleting every project in the admin really does empty the
 * portfolio instead of resurrecting the template rows.
 */
export async function loadContent(): Promise<SiteContent> {
  const { map, ok } = await readStoredSettings();
  if (!ok || Object.keys(map).length === 0) return defaultContent;

  const settings = mergeSettings(map);

  // Loaded before — and independently of — the content tables below: a broken
  // or unmigrated brochures table blanks the download CTA (brochure = null) but
  // must never take the rest of the landing page with it.
  const brochure = await loadLandingBrochure();

  try {
    const db = getDb();
    const [
      serviceRows,
      projectRows,
      whyUsRows,
      clientRows,
      teamRows,
      workflowRows,
      galleryRows,
      testimonialRows,
      legalityRows,
    ] = await Promise.all([
      db.select().from(servicesTable).where(eq(servicesTable.published, true)).orderBy(asc(servicesTable.position), asc(servicesTable.id)),
      db.select().from(projectsTable).where(eq(projectsTable.published, true)).orderBy(asc(projectsTable.position), asc(projectsTable.id)),
      db.select().from(whyUsTable).where(eq(whyUsTable.published, true)).orderBy(asc(whyUsTable.position), asc(whyUsTable.id)),
      db.select().from(clientsTable).where(eq(clientsTable.published, true)).orderBy(asc(clientsTable.position), asc(clientsTable.id)),
      db.select().from(teamTable).where(eq(teamTable.published, true)).orderBy(asc(teamTable.position), asc(teamTable.id)),
      db.select().from(workflowTable).where(eq(workflowTable.published, true)).orderBy(asc(workflowTable.position), asc(workflowTable.id)),
      db.select().from(projectImagesTable).orderBy(asc(projectImagesTable.position), asc(projectImagesTable.id)),
      db.select().from(testimonialsTable).where(eq(testimonialsTable.published, true)).orderBy(asc(testimonialsTable.position), asc(testimonialsTable.id)),
      db.select().from(legalitiesTable).where(eq(legalitiesTable.published, true)).orderBy(asc(legalitiesTable.position), asc(legalitiesTable.id)),
    ]);

    // Group gallery rows per project. A project with no gallery simply has no
    // entry, which maps to [] below — that is the "no gallery" case, not an error.
    const galleryByProject = groupGallery(galleryRows);

    return {
      settings,
      brochure,
      services: serviceRows.map((r) => ({ id: r.id, no: r.no, title: r.title, description: r.description })),
      projects: projectRows.map((r) => toProject(r, galleryByProject.get(r.id) ?? [])),
      whyChooseUs: whyUsRows.map((r) => ({ id: r.id, title: r.title, description: r.description })),
      clientsPartners: clientRows.map((r) => ({ id: r.id, name: r.name, logo: r.logo })),
      team: teamRows.map((r) => ({ id: r.id, role: r.role, name: r.name, description: r.description, photo: r.photo })),
      workflow: workflowRows.map((r) => ({ id: r.id, no: r.no, title: r.title, description: r.description })),
      testimonials: testimonialRows.map((r) => ({
        id: r.id,
        quote: r.quote,
        name: r.name,
        role: r.role,
        company: r.company,
        project: r.project,
        photo: r.photo,
      })),
      legalities: legalityRows.map((r) => ({ id: r.id, title: r.title, value: r.value, description: r.description })),
    };
  } catch (error) {
    warnOnce("content tables unreadable", error);
    return { settings, brochure, ...emptyLists() };
  }
}

function emptyLists() {
  return {
    services: [],
    projects: [],
    whyChooseUs: [],
    clientsPartners: [],
    team: [],
    workflow: [],
    testimonials: [],
    legalities: [],
  };
}

/**
 * Every published project in CMS order (position, then id), each carrying its
 * ordered gallery. Used by the `/projects` archive and the sitemap.
 *
 * Follows the same contract as loadContent: an unreachable or never-seeded
 * database serves the bundled projects, while a seeded one is honoured exactly —
 * a portfolio the operator emptied really does render empty. Wrapped in cache so
 * metadata and the page body share one round-trip per request.
 */
export const loadPublishedProjects = cache(async (): Promise<Project[]> => {
  if (!(await isSeeded())) return defaultContent.projects;

  try {
    const db = getDb();
    const [projectRows, galleryRows] = await Promise.all([
      db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.published, true))
        .orderBy(asc(projectsTable.position), asc(projectsTable.id)),
      db
        .select()
        .from(projectImagesTable)
        .orderBy(asc(projectImagesTable.position), asc(projectImagesTable.id)),
    ]);
    const galleryByProject = groupGallery(galleryRows);
    return projectRows.map((row) => toProject(row, galleryByProject.get(row.id) ?? []));
  } catch (error) {
    warnOnce("project tables unreadable", error);
    return [];
  }
});

/**
 * One published project with its ordered gallery, or null when the id is missing
 * or unpublished. A single gallery query for the one project — no per-row loop.
 * The detail route resolves its own 404/redirect from this.
 */
export const loadPublishedProjectById = cache(async (id: number): Promise<Project | null> => {
  if (!(await isSeeded())) {
    return defaultContent.projects.find((project) => project.id === id) ?? null;
  }

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.published, true)))
      .limit(1);
    if (!row) return null;

    const galleryRows = await db
      .select()
      .from(projectImagesTable)
      .where(eq(projectImagesTable.projectId, id))
      .orderBy(asc(projectImagesTable.position), asc(projectImagesTable.id));

    return toProject(
      row,
      galleryRows.map((g) => ({ id: g.id, image: g.image, caption: g.caption })),
    );
  } catch (error) {
    warnOnce("project table unreadable", error);
    return null;
  }
});

export async function loadSettings(): Promise<SiteSettings> {
  const { map, ok } = await readStoredSettings();
  return ok ? mergeSettings(map) : defaultContent.settings;
}
