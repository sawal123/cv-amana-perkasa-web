import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  MAX_BROCHURE_BYTES,
  getBrochureById,
  replaceBrochureFile,
  revalidateBrochures,
  updateBrochure,
} from "@/lib/brochures";

export const dynamic = "force-dynamic";

const titleSchema = z.string().trim().min(1).max(150);
const descriptionSchema = z.string().trim().max(500);

async function handleUpdate(
  request: Request,
  params: Promise<{ id: string }>,
) {
  // 1. Authentication checked BEFORE request.formData() is parsed
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, message: "ID brosur tidak valid." }, { status: 400 });
  }

  const existing = await getBrochureById(id);
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Brosur tidak ditemukan." }, { status: 404 });
  }

  // 2. Parse form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal memproses data formulir." }, { status: 400 });
  }

  const file = formData.get("file");
  const replacement = file instanceof File && file.size > 0 ? file : null;

  if (replacement) {
    if (replacement.size > MAX_BROCHURE_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          message: `Ukuran maksimum ${Math.floor(MAX_BROCHURE_BYTES / 1024 / 1024)} MB.`,
          errors: { file: `Ukuran maksimum ${Math.floor(MAX_BROCHURE_BYTES / 1024 / 1024)} MB.` },
        },
        { status: 400 },
      );
    }
    const replaced = await replaceBrochureFile(id, replacement);
    if (!replaced.ok) {
      return NextResponse.json({ ok: false, errors: { file: replaced.error } }, { status: 400 });
    }
  }

  if (formData.has("title")) {
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
    const updated = await updateBrochure(id, { title: parsedTitle.data, description: parsedDesc.data });
    if (!updated.ok) {
      return NextResponse.json({ ok: false, message: updated.error }, { status: 400 });
    }
  }

  revalidateBrochures();
  return NextResponse.json({ ok: true, message: "Brosur diperbarui." });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, context.params);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, context.params);
}
