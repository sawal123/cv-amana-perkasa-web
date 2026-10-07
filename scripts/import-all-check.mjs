/**
 * Regression test for the committable deployment artifact.
 *
 *   node --env-file=.env scripts/import-all-check.mjs
 *
 * Proves drizzle/import-all.sql is safe to import repeatedly through phpMyAdmin,
 * that a partially migrated database is repaired by it, and that neither committed
 * SQL file carries an admin credential.
 *
 * Statements are executed one at a time, split the way phpMyAdmin splits them, so
 * this exercises the real import path rather than a single multi-statement batch.
 */
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

let failures = 0;
function check(name, condition, detail = "") {
  console.log(`${condition ? "  ok  " : "  FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures += 1;
}

/**
 * Quote-aware splitter: MySQL string literals may contain ";" and the seed data
 * escapes quotes with a backslash (mysql2) while the DDL doubles them, so both
 * forms have to be understood. Mirrors what phpMyAdmin does before sending.
 */
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

const databaseUrl = new URL(process.env.DATABASE_URL);
const database = process.env.DATABASE_URL;

async function connect(name) {
  return mysql.createConnection({ uri: database, database: name, multipleStatements: false });
}

async function adminConnection() {
  const url = new URL(databaseUrl.toString());
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

/** Everything a correct final schema must satisfy. */
async function verifySchema(connection, label) {
  check(`${label}: projects.client ada`, await exists(connection, "projects", "client"));
  check(`${label}: projects.location ada`, await exists(connection, "projects", "location"));
  check(`${label}: projects.year ada`, await exists(connection, "projects", "year"));
  check(`${label}: projects.scope ada`, await exists(connection, "projects", "scope"));
  check(`${label}: project_images ada`, await hasTable(connection, "project_images"));
  check(`${label}: FK project_images -> projects ada`, await hasForeignKey(connection));
  check(`${label}: company_legalities ada`, await hasTable(connection, "company_legalities"));
  check(`${label}: media.width sudah tidak ada`, !(await exists(connection, "media", "width")));
  check(`${label}: media.height sudah tidak ada`, !(await exists(connection, "media", "height")));
}

async function freshDatabase(admin, name) {
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}

const importAll = readFileSync(new URL("../drizzle/import-all.sql", import.meta.url), "utf8");
const seedData = readFileSync(new URL("../drizzle/seed-data.sql", import.meta.url), "utf8");

// Raw drizzle output is not importable as-is: `--> statement-breakpoint` is not
// valid SQL, which is precisely why import-all.sql exists. Strip it here too so
// this can reproduce the state of a host that only imported 0000_init.sql.
const migration0000 = readFileSync(new URL("../drizzle/0000_init.sql", import.meta.url), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\s*-->\s*statement-breakpoint\s*/g, "\n");

const admin = await adminConnection();

// ---------------------------------------------------------------- static checks
check("import-all.sql tidak memuat password hash", !importAll.includes("scrypt:"));
check("seed-data.sql tidak memuat password hash", !seedData.includes("scrypt:"));
check("import-all.sql tidak memuat INSERT admin", !/INSERT\s+INTO\s+`admin_users`/i.test(importAll));
check("seed-data.sql tidak memuat INSERT admin", !/INSERT\s+INTO\s+`admin_users`/i.test(seedData));

// ----------------------------------------------------------- Test A / B / C
const TEST_DB = "amana_import_test";
await freshDatabase(admin, TEST_DB);

let connection = await connect(TEST_DB);
try {
  const first = await runScript(connection, importAll, "import pertama");
  check("Test A: import ke database baru berhasil", first > 0, `${first} pernyataan`);
  await verifySchema(connection, "Test A");
  check("Test A: konten ter-seed", (await count(connection, "projects")) === 10, `projects=${await count(connection, "projects")}`);
  check("Test A: settings ter-seed", (await count(connection, "settings")) >= 10);
  check("Test A: tidak ada admin dari file", (await count(connection, "admin_users")) === 0);

  const second = await runScript(connection, importAll, "import kedua");
  check("Test B: import kedua berhasil", second > 0, `${second} pernyataan`);
  await verifySchema(connection, "Test C");
  check("Test C: konten tidak terduplikasi", (await count(connection, "projects")) === 10);
} finally {
  await connection.end();
}

// ------------------------------------------------- partial migration recovery
const PARTIAL_DB = "amana_import_partial";
await freshDatabase(admin, PARTIAL_DB);

connection = await connect(PARTIAL_DB);
try {
  // Simulate a host that imported only the original migration: projects has no
  // metadata columns yet and media still carries width/height.
  await runScript(connection, migration0000, "0000 saja");
  check("recovery: prasyarat terpenuhi (client belum ada)", !(await exists(connection, "projects", "client")));
  check("recovery: prasyarat terpenuhi (width masih ada)", await exists(connection, "media", "width"));

  await runScript(connection, importAll, "import-all di atas database separuh");
  await verifySchema(connection, "Test recovery");
} finally {
  await connection.end();
}

await admin.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
await admin.query(`DROP DATABASE IF EXISTS \`${PARTIAL_DB}\``);
await admin.end();

console.log(failures === 0 ? "\nSEMUA TES LOLOS" : `\n${failures} TES GAGAL`);
process.exit(failures === 0 ? 0 : 1);
