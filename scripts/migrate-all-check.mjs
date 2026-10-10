/**
 * Regression test for the migration-only deployment artifact.
 *
 *   node --env-file=.env scripts/migrate-all-check.mjs
 *
 * Proves drizzle/migrate-all.sql updates an existing production database without
 * re-inserting starter content, is safe to re-run, repairs a partially migrated
 * database, and — critically — leaves edited, deleted, and custom production rows
 * exactly as they were. Also asserts the file carries no seed content and no admin
 * credential.
 *
 * Statements are executed one at a time, split the way phpMyAdmin splits them.
 */
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

let failures = 0;
function check(name, condition, detail = "") {
  console.log(`${condition ? "  ok  " : "  FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures += 1;
}

function splitSql(sql) {
  const statements = [];
  let current = "";
  let inString = false;
  let inBacktick = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (inString) {
      if (char === "\\") {
        current += char + (sql[i + 1] ?? "");
        i += 1;
      } else if (char === "'") {
        if (sql[i + 1] === "'") {
          current += "''";
          i += 1;
        } else {
          inString = false;
          current += char;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (inBacktick) {
      current += char;
      if (char === "`") inBacktick = false;
      continue;
    }
    if (char === "'") {
      inString = true;
      current += char;
      continue;
    }
    if (char === "`") {
      inBacktick = true;
      current += char;
      continue;
    }
    if (char === "-" && sql[i + 1] === "-") {
      const newline = sql.indexOf("\n", i);
      current += sql.slice(i, newline === -1 ? sql.length : newline);
      i = (newline === -1 ? sql.length : newline) - 1;
      continue;
    }
    if (char === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function runScript(connection, sql, label) {
  const statements = splitSql(sql);
  let executed = 0;
  for (const statement of statements) {
    try {
      await connection.query(statement);
      executed += 1;
    } catch (error) {
      console.log(`\n  ${label} GAGAL pada pernyataan ${executed + 1}:`);
      console.log(`  ${statement.slice(0, 130).replace(/\s+/g, " ")}`);
      throw error;
    }
  }
  return executed;
}

async function connect(name) {
  return mysql.createConnection({ uri: process.env.DATABASE_URL, database: name, multipleStatements: false });
}

async function adminConnection() {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = "/";
  return mysql.createConnection({ uri: url.toString(), multipleStatements: false });
}

async function exists(connection, table, column) {
  const [rows] = await connection.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  );
  return rows[0].n === 1;
}

async function hasTable(connection, table) {
  const [rows] = await connection.query(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [table],
  );
  return rows[0].n === 1;
}

async function hasForeignKey(connection) {
  const [rows] = await connection.query(
    "SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_images' AND CONSTRAINT_NAME = 'project_images_project_fk' AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
  );
  return rows[0].n === 1;
}

async function count(connection, table) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return rows[0].n;
}

async function verifySchema(connection, label) {
  check(`${label}: projects.client ada`, await exists(connection, "projects", "client"));
  check(`${label}: projects.scope ada`, await exists(connection, "projects", "scope"));
  check(`${label}: projects.objective ada`, await exists(connection, "projects", "objective"));
  check(`${label}: projects.approach ada`, await exists(connection, "projects", "approach"));
  check(`${label}: projects.outcome ada`, await exists(connection, "projects", "outcome"));
  check(`${label}: project_images ada`, await hasTable(connection, "project_images"));
  check(`${label}: FK project_images -> projects ada`, await hasForeignKey(connection));
  check(`${label}: company_legalities ada`, await hasTable(connection, "company_legalities"));
  check(`${label}: why_choose_us ada`, await hasTable(connection, "why_choose_us"));
  check(`${label}: quotation_requests ada`, await hasTable(connection, "quotation_requests"));
  check(`${label}: clients_partners ada`, await hasTable(connection, "clients_partners"));
  check(`${label}: testimonials ada`, await hasTable(connection, "testimonials"));
  check(`${label}: media.width sudah tidak ada`, !(await exists(connection, "media", "width")));
}

async function freshDatabase(admin, name) {
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}

const migrateAll = readFileSync(new URL("../drizzle/migrate-all.sql", import.meta.url), "utf8");
const importAll = readFileSync(new URL("../drizzle/import-all.sql", import.meta.url), "utf8");
const migration0000 = readFileSync(new URL("../drizzle/0000_init.sql", import.meta.url), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\s*-->\s*statement-breakpoint\s*/g, "\n");

// ------------------------------------------------------------- static checks
// migrate-all.sql is migration-only: it must not carry starter content.
for (const marker of ["Corporate Conference", "Wedding Reception", "Nama Direktur", "email@perusahaan.com"]) {
  check(`migrate-all.sql tidak memuat konten awal "${marker}"`, !migrateAll.includes(marker));
}
check("migrate-all.sql tidak memuat hash kredensial (scrypt:)", !migrateAll.includes("scrypt:"));
check("migrate-all.sql tidak memuat ADMIN_PASSWORD", !migrateAll.includes("ADMIN_PASSWORD"));
check("migrate-all.sql tidak memuat INSERT admin", !/INSERT\s+INTO\s+`admin_users`/i.test(migrateAll));
check("migrate-all.sql tidak memuat INSERT IGNORE konten", !/INSERT\s+IGNORE\s+INTO/i.test(migrateAll));
check("migrate-all.sql memuat seluruh migrasi 0000..0003", ["0000_", "0001_", "0002_", "0003_"].every((m) => migrateAll.includes(m)));

const admin = await adminConnection();

// -------------------------------------------------------- Test A: fresh + re-run
const FRESH_DB = "amana_migrate_fresh";
await freshDatabase(admin, FRESH_DB);

let connection = await connect(FRESH_DB);
try {
  const first = await runScript(connection, migrateAll, "migrate-all fresh");
  check("Test A: migrate-all pada database baru berhasil", first > 0, `${first} pernyataan`);
  await verifySchema(connection, "Test A");
  check("Test A: tanpa konten awal — projects kosong", (await count(connection, "projects")) === 0);
  check("Test A: tanpa konten awal — services kosong", (await count(connection, "services")) === 0);
  check("Test A: tanpa konten awal — settings kosong", (await count(connection, "settings")) === 0);
  check("Test A: tanpa admin dari file", (await count(connection, "admin_users")) === 0);

  const second = await runScript(connection, migrateAll, "migrate-all ulang");
  check("Test B: migrate-all kedua kali berhasil", second > 0, `${second} pernyataan`);
  await verifySchema(connection, "Test B");
  check("Test B: schema tetap benar setelah re-run", (await count(connection, "projects")) === 0);
} finally {
  await connection.end();
}

// ------------------------------------------------- Test C: repair partial schema
const PARTIAL_DB = "amana_migrate_partial";
await freshDatabase(admin, PARTIAL_DB);

connection = await connect(PARTIAL_DB);
try {
  await runScript(connection, migration0000, "0000 saja");
  check("Test C: prasyarat (client belum ada)", !(await exists(connection, "projects", "client")));
  check("Test C: prasyarat (width masih ada)", await exists(connection, "media", "width"));

  await runScript(connection, migrateAll, "migrate-all di atas database separuh");
  await verifySchema(connection, "Test C");
} finally {
  await connection.end();
}

// ------------------------------------------- Test D: production content preserved
const CONTENT_DB = "amana_migrate_content";
await freshDatabase(admin, CONTENT_DB);

connection = await connect(CONTENT_DB);
try {
  // A running production database: schema + content, then real operator edits.
  await runScript(connection, importAll, "import-all (basis produksi)");
  check("Test D: basis produksi ter-seed", (await count(connection, "projects")) === 10, `projects=${await count(connection, "projects")}`);

  await connection.query("UPDATE services SET title = 'EDITED SERVICE TITLE' WHERE id = 1");
  await connection.query("DELETE FROM projects WHERE id = 1");
  await connection.query(
    "INSERT INTO quotation_requests (name, phone, event_type, message, status) VALUES ('PROD LEAD', '081234567890', 'Corporate Event', 'Brief produksi', 'contacted')",
  );
  await connection.query("INSERT INTO clients_partners (name, logo, position, published) VALUES ('PROD CLIENT', '', 1, 1)");
  await connection.query(
    "INSERT INTO testimonials (quote, name, position, published) VALUES ('PROD QUOTE', 'PROD PERSON', 1, 1)",
  );
  await connection.query("UPDATE settings SET `value` = JSON_SET(`value`, '$.title', 'PROD HERO TITLE') WHERE `key` = 'hero'");

  const projectsBefore = await count(connection, "projects");
  const servicesBefore = await count(connection, "services");

  // The update that must not disturb a single row above.
  await runScript(connection, migrateAll, "migrate-all (update produksi)");

  await verifySchema(connection, "Test D");
  const [[edited]] = await connection.query("SELECT title FROM services WHERE id = 1");
  check("Test D: layanan yang diedit tidak berubah", edited?.title === "EDITED SERVICE TITLE", `title=${edited?.title}`);
  check("Test D: project default yang dihapus tetap terhapus", (await count(connection, "projects")) === projectsBefore, `projects=${await count(connection, "projects")}`);
  const [[deleted]] = await connection.query("SELECT COUNT(*) AS n FROM projects WHERE id = 1");
  check("Test D: id=1 tidak dihidupkan kembali oleh INSERT IGNORE", deleted.n === 0);
  check("Test D: jumlah layanan tidak bertambah", (await count(connection, "services")) === servicesBefore);
  const [[lead]] = await connection.query("SELECT status FROM quotation_requests WHERE name = 'PROD LEAD'");
  check("Test D: quotation produksi tidak tersentuh", lead?.status === "contacted");
  check("Test D: client produksi tetap ada", (await count(connection, "clients_partners")) === 1);
  check("Test D: testimonial produksi tetap ada", (await count(connection, "testimonials")) === 1);
  const [heroRow] = (await connection.query("SELECT `value` FROM settings WHERE `key` = 'hero'"))[0];
  check("Test D: settings produksi tidak ditimpa", JSON.parse(heroRow.value).title === "PROD HERO TITLE");
} finally {
  await connection.end();
}

for (const name of [FRESH_DB, PARTIAL_DB, CONTENT_DB]) {
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
}
await admin.end();

console.log(failures === 0 ? "\nSEMUA TES LOLOS" : `\n${failures} TES GAGAL`);
process.exit(failures === 0 ? 0 : 1);
