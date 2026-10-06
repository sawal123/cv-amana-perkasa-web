import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { NextResponse } from "next/server";

/**
 * Serves freshly uploaded images.
 *
 * Next builds its public-file index once at boot, so a file written into
 * public/uploads by the admin is NOT served until the process restarts — on
 * cPanel that restart costs a 10-20s 503, which makes the CMS unusable. This
 * handler reads from disk per request instead, so an upload is live immediately.
 *
 * Files that existed at boot are still served by the static middleware first,
 * so this only carries the requests that actually need it.
 */

export const dynamic = "force-dynamic";

// Uploads are named from a server-generated UUID plus a whitelisted extension,
// so anything else is not ours to serve. This is the traversal guard: no
// attacker-controlled path is ever joined against the uploads directory.
const SAFE_NAME = /^[a-f0-9-]{36}\.(png|jpe?g|webp)$/i;

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function notFound() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string[] }> },
) {
  const { file } = await params;
  if (file.length !== 1 || !SAFE_NAME.test(file[0])) return notFound();

  const name = file[0];
  const dir = resolve(process.cwd(), "public", "uploads");
  const target = join(dir, name);
  if (!target.startsWith(dir + sep)) return notFound();

  let size: number;
  try {
    const info = await stat(target);
    if (!info.isFile()) return notFound();
    size = info.size;
  } catch {
    return notFound();
  }

  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();

  return new NextResponse(createReadStream(target) as unknown as ReadableStream, {
    headers: {
      "Content-Type": TYPES[extension] ?? "application/octet-stream",
      "Content-Length": String(size),
      // Immutable: the name is a UUID, so content for a given URL never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
