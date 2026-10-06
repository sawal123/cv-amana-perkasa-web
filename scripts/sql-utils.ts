/**
 * drizzle-kit separates statements inside a generated migration with the token
 * `--> statement-breakpoint`. It is not valid SQL: MySQL and MariaDB only treat
 * `--` as a comment when whitespace or a control character follows it, so feeding
 * the raw file to phpMyAdmin or a multi-statement query fails on the token.
 *
 * Location matters too — drizzle puts it on its own line after a CREATE TABLE but
 * INLINE after an ALTER TABLE (`...;--> statement-breakpoint`). Both forms have to
 * go, which is why this matches the token anywhere rather than line-by-line.
 */
const BREAKPOINT = /\s*-->\s*statement-breakpoint\s*/g;

export function stripDrizzleBreakpoints(sql: string): string {
  return sql.replace(/\r\n/g, "\n").replace(BREAKPOINT, "\n").trim();
}

/**
 * Splits a migration into its individual statements using drizzle's own
 * separator. Safe to do: the token never appears inside a string literal, whereas
 * splitting on ";" would break on any text value that contains one.
 *
 * A file with no breakpoints (the generated seed-data.sql) comes back as a single
 * chunk and is executed as one multi-statement query.
 */
export function splitStatements(sql: string): string[] {
  return sql
    .replace(/\r\n/g, "\n")
    .split(BREAKPOINT)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

/**
 * Makes a generated migration safe to import twice through phpMyAdmin.
 *
 * drizzle-kit emits bare `CREATE TABLE`, so a second import dies with
 * ER_TABLE_EXISTS_ERROR partway down the file. Only the hand-built
 * drizzle/import-all.sql gets this treatment — the original 000X_*.sql files are
 * left untouched so drizzle-kit's own migrator keeps its exact semantics.
 */
export function makeReimportable(sql: string): string {
  return sql.replace(/CREATE\s+TABLE(?!\s+IF\s+NOT\s+EXISTS)/gi, "CREATE TABLE IF NOT EXISTS");
}
