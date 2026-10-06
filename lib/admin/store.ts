import { asc, desc, eq, sql } from "drizzle-orm";
import type { MySqlTable } from "drizzle-orm/mysql-core";
import { getDb } from "@/lib/db";
import { companyLegalities, projects, services, teamMembers, workflowSteps } from "@/lib/db/schema";
import { TABLES, type ContentTable, type Payload } from "./fields";

/**
 * Every content table shares id / position / published, so the union below keeps
 * those three columns concretely typed while the payload columns stay driven by
 * the registry in ./fields.
 */
const HANDLES = {
  services,
  projects,
  team_members: teamMembers,
  workflow_steps: workflowSteps,
  company_legalities: companyLegalities,
} as const;

export type AdminRow = {
  id: number;
  position: number;
  published: boolean;
  values: Payload;
};

type RawRow = Record<string, unknown>;

const asString = (value: unknown) => (value == null ? "" : String(value));
const asNumber = (value: unknown) => (typeof value === "number" ? value : Number(value ?? 0));
// mysql2 hands back tinyint(1) as 0/1 rather than true/false.
const asBoolean = (value: unknown) => value === true || value === 1 || value === "1";

function toAdminRow(key: ContentTable, row: RawRow): AdminRow {
  const values: Payload = {};
  for (const field of TABLES[key].fields) values[field.name] = asString(row[field.name]);
  return {
    id: asNumber(row.id),
    position: asNumber(row.position),
    published: asBoolean(row.published),
    values,
  };
}

/** Ordered exactly as the public site renders them, so the admin matches reality. */
export async function listRows(key: ContentTable): Promise<AdminRow[]> {
  const table = HANDLES[key];
  const rows = (await getDb()
    .select()
    .from(table as MySqlTable)
    .orderBy(asc(table.position), asc(table.id))) as unknown as RawRow[];
  return rows.map((row) => toAdminRow(key, row));
}

/** Single row by id, for pages that operate on one record (project gallery). */
export async function findRow(key: ContentTable, id: number): Promise<AdminRow | null> {
  const table = HANDLES[key];
  const rows = (await getDb()
    .select()
    .from(table as MySqlTable)
    .where(eq(table.id, id))
    .limit(1)) as unknown as RawRow[];
  return rows[0] ? toAdminRow(key, rows[0]) : null;
}

async function nextPosition(key: ContentTable): Promise<number> {
  const table = HANDLES[key];
  const result = (await getDb()
    .select({ value: sql<number>`coalesce(max(${table.position}), 0)` })
    .from(table as MySqlTable)) as unknown as Array<{ value: number }>;
  return asNumber(result[0]?.value) + 1;
}

export async function saveRow(key: ContentTable, values: Payload, id?: number): Promise<void> {
  const table = HANDLES[key];
  const parsed = TABLES[key].schema.parse(values);

  if (id == null) {
    await getDb()
      .insert(table as MySqlTable)
      .values({ ...parsed, position: await nextPosition(key), published: true } as never);
    return;
  }

  await getDb()
    .update(table as MySqlTable)
    .set(parsed as never)
    .where(eq(table.id, id));
}

export async function deleteRow(key: ContentTable, id: number): Promise<void> {
  await getDb()
    .delete(HANDLES[key] as MySqlTable)
    .where(eq(HANDLES[key].id, id));
}

export async function setPublished(key: ContentTable, id: number, published: boolean): Promise<void> {
  const table = HANDLES[key];
  await getDb().update(table as MySqlTable).set({ published } as never).where(eq(table.id, id));
}

/**
 * Swap a row with its neighbour. Positions are renumbered from scratch rather
 * than shifted, which keeps them dense (1..n) and stops them drifting after
 * repeated deletes.
 */
export async function moveRow(key: ContentTable, id: number, delta: -1 | 1): Promise<void> {
  const table = HANDLES[key];
  const rows = await listRows(key);
  const index = rows.findIndex((row) => row.id === id);
  const swapWith = index === -1 ? -1 : index + delta;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) return;

  const order = [...rows];
  [order[index], order[swapWith]] = [order[swapWith], order[index]];

  const db = getDb();
  for (const [position, row] of order.entries()) {
    if (row.position === position + 1) continue;
    await db
      .update(table as MySqlTable)
      .set({ position: position + 1 } as never)
      .where(eq(table.id, row.id));
  }
}

export async function countRows(key: ContentTable): Promise<{ total: number; published: number }> {
  const rows = await listRows(key);
  return { total: rows.length, published: rows.filter((row) => row.published).length };
}

/** Newest first — used by the dashboard. */
export async function recentRows(key: ContentTable, limit = 5): Promise<AdminRow[]> {
  const table = HANDLES[key];
  const rows = (await getDb()
    .select()
    .from(table as MySqlTable)
    .orderBy(desc(table.updatedAt))) as unknown as RawRow[];
  return rows.slice(0, limit).map((row) => toAdminRow(key, row));
}
