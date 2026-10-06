import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

type Db = MySql2Database<typeof schema>;

const globalForDb = globalThis as unknown as { __amanaDb?: Db };

/**
 * Lazy on purpose. Next collects page data at build time, and a pool created on
 * import would try to reach MySQL before it exists. Callers in lib/content.ts
 * wrap this in try/catch and fall back to data/site.json, so an unconfigured or
 * dead database degrades the page instead of 500-ing it.
 */
export function getDb(): Db {
  if (globalForDb.__amanaDb) return globalForDb.__amanaDb;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — serving bundled content");

  const pool = mysql.createPool({
    uri: url,
    // Shared hosting caps connections per MySQL user, and Passenger may run
    // several app processes at once. Keep this small; raise only if logs show
    // ER_CON_COUNT_ERROR rather than "too many connections" from the server.
    connectionLimit: 3,
    queueLimit: 0,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
  });

  globalForDb.__amanaDb = drizzle(pool, { schema, mode: "default" });
  return globalForDb.__amanaDb;
}

export { schema };
export type { Db };
