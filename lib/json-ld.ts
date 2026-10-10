/**
 * JSON-LD serialization with script-tag safety.
 *
 * Company and settings values are admin-editable, so a value such as
 * `</script><script>alert(1)</script>` must not be able to close the JSON-LD
 * script element. Escaping `<`, `>` and `&` to their `\uXXXX` forms keeps the
 * output valid JSON (the escapes are inside JSON strings) while making a breakout
 * impossible. U+2028/U+2029 are escaped too — they are valid inside JSON strings
 * but were historically invalid in JavaScript source.
 *
 * Kept dependency-free so it can be unit-tested without the database layer.
 */
export function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Serializes an object to a script-safe JSON string. */
export function serializeJsonLd(data: unknown): string {
  return escapeJsonForScript(JSON.stringify(data));
}
