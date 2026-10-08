import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { parseHttpUrl } from "@/lib/site-url";

/**
 * Readiness probe logic, kept out of the route handler so each piece can be
 * exercised directly (including negative cases) without booting a server.
 *
 * Nothing here returns a secret value: the caller only ever sees booleans.
 */

export type HealthCheck = { name: string; ok: boolean };
export type HealthResult = { status: "ok" | "degraded"; checks: Record<string, boolean> };

/** Release-critical tables. A missing one means the deployment is not migrated. */
export const REQUIRED_TABLES = [
  "settings",
  "services",
  "projects",
  "project_images",
  "why_choose_us",
  "clients_partners",
  "testimonials",
  "company_legalities",
  "quotation_requests",
  "media",
  "admin_users",
] as const;

/** Columns added by the latest release; health fails if they are absent. */
export const REQUIRED_COLUMNS = [
  { table: "projects", column: "objective" },
  { table: "projects", column: "approach" },
  { table: "projects", column: "outcome" },
] as const;

/** Production requires HTTPS, so a plain-http SITE_URL is not "ready". */
export function isProductionSiteOrigin(value: unknown): boolean {
  const url = parseHttpUrl(value);
  return url !== null && url.protocol === "https:";
}

/** Config-only checks with no I/O, so they are unit-testable in isolation. */
export function checkConfig(env: Record<string, string | undefined> = process.env): HealthCheck[] {
  const secret = env.AUTH_SECRET ?? "";
  return [
    { name: "auth_secret", ok: secret.length >= 32 },
    { name: "site_url", ok: isProductionSiteOrigin(env.SITE_URL) },
  ];
}

/**
 * An access check only — health must never create a real upload. Reports false
 * for both a missing directory and an unwritable one.
 */
export async function checkUploadsWritable(
  dir: string = join(process.cwd(), "public", "uploads"),
): Promise<boolean> {
  try {
    await access(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * drizzle's mysql2 driver returns `[rows, fields]` from `execute`; tolerate both
 * that tuple and a `{ rows }` shape so this keeps working if the driver changes.
 */
async function rawRows<T>(query: SQL): Promise<T[]> {
  const result = (await getDb().execute(query)) as unknown;
  if (Array.isArray(result)) {
    const first = result[0];
    return (Array.isArray(first) ? first : result) as T[];
  }
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

/** Read-only information_schema probe, portable across MySQL 8 and MariaDB 10.6+. */
export async function checkSchema(): Promise<boolean> {
  const [tables, columns] = await Promise.all([
    rawRows<{ TABLE_NAME: string }>(
      sql`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`,
    ),
    rawRows<{ TABLE_NAME: string; COLUMN_NAME: string }>(
      sql`SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`,
    ),
  ]);

  const presentTables = new Set(tables.map((row) => row.TABLE_NAME));
  if (!REQUIRED_TABLES.every((name) => presentTables.has(name))) return false;

  const presentColumns = new Set(columns.map((row) => `${row.TABLE_NAME}.${row.COLUMN_NAME}`));
  return REQUIRED_COLUMNS.every(({ table, column }) => presentColumns.has(`${table}.${column}`));
}

export async function checkDatabaseReachable(): Promise<boolean> {
  try {
    await getDb().execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

export async function runHealthChecks(
  env: Record<string, string | undefined> = process.env,
): Promise<HealthResult> {
  const database = await checkDatabaseReachable();
  const schema = database ? await checkSchema().catch(() => false) : false;
  const uploads = await checkUploadsWritable();

  const checks: HealthCheck[] = [
    ...checkConfig(env),
    { name: "database", ok: database },
    { name: "schema", ok: schema },
    { name: "uploads", ok: uploads },
  ];

  const record: Record<string, boolean> = {};
  for (const check of checks) record[check.name] = check.ok;

  return { status: checks.every((check) => check.ok) ? "ok" : "degraded", checks: record };
}
