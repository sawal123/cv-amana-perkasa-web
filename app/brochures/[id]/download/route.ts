import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  BROCHURE_MIME,
  brochureContentDisposition,
  getBrochureById,
  resolveBrochureFilePath,
} from "@/lib/brochures";

/**
 * Public brochure download: GET /brochures/{id}/download.
 *
 * No admin session required, but the database is always the authority: the row
 * must exist AND be published. Serving is never based on a URL string or on
 * filesystem existence alone — an unpublished or unknown id is a 404, and so is
 * a published row whose physical file has gone missing.
 *
 * The file is read into memory and returned as a real Uint8Array body (never a
 * Node stream cast to a Web stream). That is safe because uploads are capped at
 * MAX_BROCHURE_BYTES (15 MB) on every write path.
 */

export const dynamic = "force-dynamic";

function notFound() {
  return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Positive integers only — anything else never reaches SQL.
  if (!/^\d+$/.test(id)) return notFound();
  const brochureId = Number(id);
  if (!Number.isInteger(brochureId) || brochureId <= 0) return notFound();

  const row = await getBrochureById(brochureId);
  if (!row || !row.published) return notFound();

  // stored_name is server-generated, but the safe-name + prefix guards stay:
  // no value from the database is ever joined against the storage directory
  // unchecked.
  const target = resolveBrochureFilePath(row.storedName);
  if (!target) return notFound();

  let body: Buffer;
  try {
    body = await readFile(target);
  } catch {
    // Missing file, a directory, or an unreadable path all resolve to the same
    // 404 so nothing about the filesystem leaks.
    return notFound();
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": BROCHURE_MIME,
      "Content-Length": String(body.byteLength),
      // Original filename as the browser's download label, ASCII-fallback plus
      // RFC 5987 filename* — never interpolated raw into the header.
      "Content-Disposition": brochureContentDisposition(row.filename),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
