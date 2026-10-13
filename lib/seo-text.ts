/**
 * Shortens stored copy for a `<meta name="description">` tag without ever
 * mutating the stored value. Whitespace is collapsed and the cut happens on a
 * word boundary at roughly `max` characters, with an ellipsis, so the rendered
 * meta tag stays within search-result length while the database keeps the full
 * text.
 */
export function shortenDescription(value: string, max = 160): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;

  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}
