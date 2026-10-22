import { notFound } from "next/navigation";
import ContentEditor from "@/components/admin/content-editor";
import { TABLES, type ContentTable } from "@/lib/admin/fields";
import { listGallery } from "@/lib/admin/gallery";
import { findRow } from "@/lib/admin/store";
import { listMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function EditContentPage({ params }: { params: Promise<{ table: string; id: string }> }) {
  const { table, id } = await params;
  if (!(table in TABLES)) notFound();

  const key = table as ContentTable;
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId <= 0) notFound();

  const definition = TABLES[key];
  const [row, media, galleryRows] = await Promise.all([
    findRow(key, rowId),
    listMedia().catch(() => []),
    key === "projects" ? listGallery(rowId).catch(() => []) : Promise.resolve([]),
  ]);
  if (!row) notFound();

  return (
    <ContentEditor
      table={key}
      route={definition.route}
      label={definition.label}
      singular={definition.singular}
      titleField={definition.titleField}
      fields={definition.fields}
      initialValues={row.values}
      id={row.id}
      media={media.map((item) => ({
        path: item.path,
        alt: item.alt,
        filename: item.filename,
        groupName: item.groupName,
      }))}
      initialGallery={galleryRows.map((g) => ({ id: g.id, image: g.image, caption: g.caption }))}
    />
  );
}
