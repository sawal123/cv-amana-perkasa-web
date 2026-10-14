import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  MAX_BROCHURE_BYTES,
  createBrochure,
  revalidateBrochures,
} from "@/lib/brochures";

export const dynamic = "force-dynamic";

const titleSchema = z.string().trim().min(1).max(150);
const descriptionSchema = z.string().trim().max(500);

/**
 * Authenticated admin route handler for PDF brochure transfer.
 * Authentication is verified BEFORE request.formData() is parsed so unauthenticated
 * requests never buffer or store any payload bytes.
 * This endpoint is CREATE ONLY. Update/replacement belongs to /api/admin/brochures/[id].
 */
export async function POST(request: Request) {
  // 1. Authentication checked BEFORE request.formData() is parsed
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  // Reject ?id parameter: updates belong strictly to /api/admin/brochures/[id]
  const url = new URL(request.url);
  if (url.searchParams.has("id")) {
    return NextResponse.json(
      { ok: false, message: "Pembaruan brosur hanya diizinkan melalui /api/admin/brochures/[id]." },
      { status: 400 },
    );
  }

  // 2. Parse form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal memproses data formulir." }, { status: 400 });
  }

  // Reject formData id: updates belong strictly to /api/admin/brochures/[id]
  if (formData.has("id")) {
    return NextResponse.json(
      { ok: false, message: "Pembaruan brosur hanya diizinkan melalui /api/admin/brochures/[id]." },
      { status: 400 },
    );
  }

  // Handle brochure creation with PDF
  const parsedTitle = titleSchema.safeParse(formData.get("title"));
  if (!parsedTitle.success) {
    return NextResponse.json(
      { ok: false, errors: { title: "Judul wajib diisi (maksimal 150 karakter)." } },
      { status: 400 },
    );
  }

  const rawDesc = formData.get("description");
  const parsedDesc = descriptionSchema.safeParse(typeof rawDesc === "string" ? rawDesc : "");
  if (!parsedDesc.success) {
    return NextResponse.json(
      { ok: false, errors: { description: "Deskripsi maksimal 500 karakter." } },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, errors: { file: "Pilih file PDF terlebih dahulu." } },
      { status: 400 },
    );
  }

  if (file.size > MAX_BROCHURE_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        message: `Ukuran maksimum ${Math.floor(MAX_BROCHURE_BYTES / 1024 / 1024)} MB.`,
        errors: { file: `Ukuran maksimum ${Math.floor(MAX_BROCHURE_BYTES / 1024 / 1024)} MB.` },
      },
      { status: 400 },
    );
  }

  const result = await createBrochure({
    title: parsedTitle.data,
    description: parsedDesc.data,
    file,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: { file: result.error } }, { status: 400 });
  }

  revalidateBrochures();
  return NextResponse.json({ ok: true, message: "Brosur terunggah." }, { status: 201 });
}
