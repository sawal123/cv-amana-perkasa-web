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

// ---------------------------------------------------------------------------
// Re-runnable DDL
// ---------------------------------------------------------------------------

/** A statement that runs and does nothing, used as the "already applied" branch. */
const NOOP = "DO 0";

/** Quotes a statement for embedding inside another SQL string literal. */
function sqlString(text: string): string {
  return `'${text.replace(/'/g, "''")}'`;
}

const CREATE_TABLE = /^CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i;
const ADD_CONSTRAINT = /^ALTER\s+TABLE\s+`([^`]+)`\s+ADD\s+CONSTRAINT\s+`([^`]+)`\s+(.+)$/i;
const ADD_COLUMN = /^ALTER\s+TABLE\s+`([^`]+)`\s+ADD\s+`([^`]+)`\s+(.+)$/i;
const DROP_COLUMN = /^ALTER\s+TABLE\s+`([^`]+)`\s+DROP\s+COLUMN\s+`([^`]+)`$/i;

/**
 * Runs `ddl` only when `condition` holds, by preparing it dynamically from
 * information_schema. Plain SQL with no stored routines or DELIMITER games, so
 * phpMyAdmin sends it like any other statement.
 *
 * `condition` counts rows matching an existence probe; `expect` says whether the
 * object should already be there. The escaped inner statement is what makes
 * column definitions containing quotes (DEFAULT '') survive the round trip.
 */
function guardedDdl(condition: string, expect: number, ddl: string, name: string): string {
  return [
    `SET @${name} := IF((${condition}) = ${expect}, ${sqlString(ddl)}, ${sqlString(NOOP)});`,
    `PREPARE ${name} FROM @${name};`,
    `EXECUTE ${name};`,
    `DEALLOCATE PREPARE ${name};`,
  ].join("\n");
}

function columnsProbe(table: string, column: string): string {
  return (
    "SELECT COUNT(*) FROM information_schema.COLUMNS " +
    `WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${sqlString(table)} AND COLUMN_NAME = ${sqlString(column)}`
  );
}

function constraintProbe(table: string, constraint: string): string {
  return (
    "SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS " +
    `WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ${sqlString(table)} AND CONSTRAINT_NAME = ${sqlString(constraint)}`
  );
}

/**
 * Rewrites a single drizzle statement so that running it a second time is a
 * no-op instead of an error:
 *
 *   CREATE TABLE x            -> CREATE TABLE IF NOT EXISTS x
 *   ALTER TABLE x ADD col     -> only when the column is absent
 *   ALTER TABLE x DROP col    -> only when the column is present
 *   ALTER TABLE x ADD CONSTRAINT -> only when the constraint is absent
 *
 * Anything else is returned unchanged. Only drizzle's own generated shapes are
 * handled, deliberately — this is not a general SQL rewriter.
 */
function makeStatementReimportable(statement: string, index: number): string {
  const body = statement.replace(/;\s*$/, "").trim();
  const name = `ddl_${index}`;

  if (CREATE_TABLE.test(body)) {
    return `${body.replace(CREATE_TABLE, "CREATE TABLE IF NOT EXISTS")};`;
  }

  const constraint = ADD_CONSTRAINT.exec(body);
  if (constraint) {
    const [, table, constraintName, definition] = constraint;
    return guardedDdl(constraintProbe(table, constraintName), 0, body, name) + ";";
  }

  const added = ADD_COLUMN.exec(body);
  if (added) {
    const [, table, column] = added;
    return guardedDdl(columnsProbe(table, column), 0, body, name) + ";";
  }

  const dropped = DROP_COLUMN.exec(body);
  if (dropped) {
    const [, table, column] = dropped;
    return guardedDdl(columnsProbe(table, column), 1, body, name) + ";";
  }

  return statement;
}

/** Applies makeStatementReimportable to a whole migration's statements. */
export function makeReimportable(statements: string[]): string {
  return statements.map((statement, index) => makeStatementReimportable(statement, index + 1)).join("\n");
}
