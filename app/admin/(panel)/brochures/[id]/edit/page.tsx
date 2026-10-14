import { notFound } from "next/navigation";
import BrochureEditor from "@/components/admin/brochure-editor";
import { MAX_BROCHURE_BYTES, getBrochureById } from "@/lib/brochures";

export const dynamic = "force-dynamic";

export default async function EditBrochurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const brochureId = Number(id);
  if (!Number.isInteger(brochureId) || brochureId <= 0) notFound();

  const row = await getBrochureById(brochureId).catch(() => null);
  if (!row) notFound();

  // Only display-safe fields cross into the client component — the stored UUID
  // name and any filesystem detail stay on the server.
  return (
    <BrochureEditor
      maxBytes={MAX_BROCHURE_BYTES}
      brochure={{
        id: row.id,
        title: row.title,
        description: row.description,
        filename: row.filename,
        size: row.size,
        published: row.published,
      }}
    />
  );
}
