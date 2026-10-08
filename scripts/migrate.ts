/**
 * Applies every numbered drizzle migration (000X_*.sql) to DATABASE_URL, oldest
 * file first. The generated combined artifacts and seed SQL are never applied —
 * this command is migration-only.
 *
 *   npm run db:migrate
 *
 * Re-runnable: a statement that fails with ER_TABLE_EXISTS_ERROR (1050) or
 * ER_DUP_ENTRY (1061) is reported and skipped rather than aborting the run.
 * When there is no direct MySQL access, import drizzle/migrate-all.sql through
 * phpMyAdmin instead — same migrations, no seed content.
 */
import { readdirSync, readFileSync } from "node:fs";
import mysql from "mysql2/promise";
import { splitStatements } from "./sql-utils";

/**
 * Errors that mean "this part was already applied", which is exactly what a
 * re-run looks like. Anything else aborts, so a genuine mistake is never hidden.
 */
const ALREADY_APPLIED = new Set([
  "ER_TABLE_EXISTS_ERROR", // 1050 CREATE TABLE twice
  "ER_DUP_FIELDNAME", // 1060 ADD COLUMN twice
  "ER_DUP_KEYNAME", // 1061 ADD INDEX twice
  "ER_CANT_CREATE_DB", // 1007
  "ER_CANT_DROP_FIELD_OR_KEY", // 1091 DROP COLUMN twice
  "ER_FK_DUP_NAME", // 1826 ADD CONSTRAINT twice
]);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL tidak diset.");
    process.exit(1);
  }

  const dir = new URL("../drizzle/", import.meta.url);
  // Only the numbered drizzle migrations. The generated artifacts (import-all.sql,
  // migrate-all.sql) and the seed rows (seed-data.sql) are excluded on purpose, so
  // `db:migrate` is migration-only and never re-inserts starter content into a
  // database whose operator deliberately removed it.
  const files = readdirSync(dir)
    .filter((name) => /^\d{4}_.*\.sql$/.test(name))
    .sort();

  if (files.length === 0) {
    console.error("Tidak ada file SQL di ./drizzle. Jalankan `npm run db:generate` dulu.");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: url,
    // The seed file arrives as one chunk of many statements, so multi-statement
    // support is still needed even though migrations run statement by statement.
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    for (const file of files) {
      const statements = splitStatements(readFileSync(new URL(file, dir), "utf8"));
      let applied = 0;
      let skipped = 0;

      for (const statement of statements) {
        try {
          await connection.query(statement);
          applied += 1;
        } catch (error) {
          const code = (error as { code?: string }).code ?? "";
          if (ALREADY_APPLIED.has(code)) {
            skipped += 1;
            continue;
          }
          console.error(`\n  GAGAL di ${file}:`);
          console.error(`  ${statement.slice(0, 120).replace(/\s+/g, " ")}...`);
          throw error;
        }
      }

      console.log(
        `  ok      ${file} (${applied} diterapkan${skipped ? `, ${skipped} sudah ada` : ""})`,
      );
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
