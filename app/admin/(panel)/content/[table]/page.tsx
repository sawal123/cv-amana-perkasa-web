import { notFound } from "next/navigation";
import ContentManager from "@/components/admin/content-manager";
import { TABLES, type ContentTable } from "@/lib/admin/fields";
import { listRows } from "@/lib/admin/store";
import { listMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function ContentPage({ params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  if (!(table in TABLES)) notFound();

  const key = table as ContentTable;
  const definition = TABLES[key];

  // Media powers the image picker; a broken database there must not hide the list.
  const [rows, media] = await Promise.all([listRows(key), listMedia().catch(() => [])]);

  return (
    <ContentManager
      table={key}
      label={definition.label}
      singular={definition.singular}
      titleField={definition.titleField}
      fields={definition.fields}
      rows={rows}
      media={media.map((item) => ({ path: item.path, alt: item.alt }))}
    />
  );
}
