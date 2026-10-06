/**
 * Applies every drizzle/*.sql migration to DATABASE_URL, oldest file first.
 *
 *   npm run db:migrate
 *
 * Re-runnable: a statement that fails with ER_TABLE_EXISTS_ERROR (1050) or
 * ER_DUP_ENTRY (1061) is reported and skipped rather than aborting the run.
 * On the production host import drizzle/import-all.sql through phpMyAdmin
 * instead — that file has the drizzle-kit separators stripped and is plain SQL.
 */
import { readdirSync, readFileSync } from "node:fs";
import mysql from "mysql2/promise";
import { stripDrizzleBreakpoints } from "./sql-utils";

const BENIGN = new Set(["ER_TABLE_EXISTS_ERROR", "ER_DUP_ENTRY", "ER_CANT_CREATE_DB"]);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL tidak diset.");
    process.exit(1);
  }

  const dir = new URL("../drizzle/", import.meta.url);
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql") && name !== "import-all.sql")
    .sort();

  if (files.length === 0) {
    console.error("Tidak ada file SQL di ./drizzle. Jalankan `npm run db:generate` dulu.");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: url,
    // Send each file as one multi-statement query so we never have to split SQL
    // client-side — string literals in the seed data may legally contain ";".
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    for (const file of files) {
      const sqlText = stripDrizzleBreakpoints(readFileSync(new URL(file, dir), "utf8"));
      try {
        await connection.query(sqlText);
        console.log(`  ok      ${file}`);
      } catch (error) {
        const code = (error as { code?: string }).code ?? "";
        if (BENIGN.has(code)) {
          console.log(`  exists  ${file} (${code})`);
        } else {
          throw error;
        }
      }
    }
    console.log("\nMigrasi selesai.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("\nMigrasi gagal:", (error as Error).message);
  process.exit(1);
});
