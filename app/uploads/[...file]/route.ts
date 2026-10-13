import { readFile } from "node:fs/promises";
import { sep } from "node:path";
import { NextResponse } from "next/server";
import { resolveUploadStorageDir, uploadPath } from "@/lib/upload-storage";

/**
 * Serves runtime-uploaded images from the configured storage directory.
 *
 * Next builds its public-file index once at boot, so a file written after boot
 * is NOT served by the static middleware until the process restarts — and when
 * `UPLOAD_STORAGE_DIR` points outside `public/` it never would. This handler
 * reads the bytes per request instead, so an upload is live immediately and the
 * public URL stays /uploads/<uuid>.<ext> regardless of where the file lives.
 *
 * The file is read into memory (uploads are capped at 4 MB) and returned as a
 * real Uint8Array body — not a Node stream cast to a Web ReadableStream.
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
  const dir = resolveUploadStorageDir();
  const target = uploadPath(name);
  if (!target.startsWith(dir + sep)) return notFound();

  let body: Buffer;
  try {
    body = await readFile(target);
  } catch {
    // Missing file, a directory, or an unreadable path all resolve to the same
    // 404 so nothing about the filesystem leaks.
    return notFound();
  }

  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": TYPES[extension] ?? "application/octet-stream",
      "Content-Length": String(body.byteLength),
      // Immutable: the name is a UUID, so content for a given URL never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
