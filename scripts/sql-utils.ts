/**
 * drizzle-kit separates statements inside a generated migration with lines
 * reading `--> statement-breakpoint`. That marker is for drizzle-kit's own
 * migrator and is NOT valid SQL: MySQL and MariaDB only treat `--` as a comment
 * when a whitespace or control character follows it, so feeding the raw file to
 * phpMyAdmin or a multi-statement query fails with a syntax error on the marker.
 *
 * Strip these lines before executing or shipping the file.
 */
export function stripDrizzleBreakpoints(sql: string): string {
  return sql
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*-->\s*statement-breakpoint\s*$/.test(line))
    .join("\n")
    .trim();
}

/**
 * Makes a generated migration safe to import twice through phpMyAdmin.
 *
 * drizzle-kit emits bare `CREATE TABLE`, so a second import dies with
 * ER_TABLE_EXISTS_ERROR partway down the file. Only the hand-built
 * drizzle/import-all.sql gets this treatment — the original 0000_init.sql is
 * left untouched so drizzle-kit's own migrator keeps its exact semantics.
 */
export function makeReimportable(sql: string): string {
  return sql.replace(/CREATE\s+TABLE(?!\s+IF\s+NOT\s+EXISTS)/gi, "CREATE TABLE IF NOT EXISTS");
}
