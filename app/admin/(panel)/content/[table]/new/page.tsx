import { notFound } from "next/navigation";
import ContentEditor from "@/components/admin/content-editor";
import { TABLES, type ContentTable, type Payload } from "@/lib/admin/fields";
import { listMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function NewContentPage({ params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  if (!(table in TABLES)) notFound();

  const key = table as ContentTable;
  const definition = TABLES[key];

  // Media powers the image picker; a broken database there must not hide the form.
  const media = await listMedia().catch(() => []);

  const initialValues: Payload = {};
  for (const field of definition.fields) initialValues[field.name] = "";

  return (
    <ContentEditor
      table={key}
      route={definition.route}
      label={definition.label}
      singular={definition.singular}
      titleField={definition.titleField}
      fields={definition.fields}
      initialValues={initialValues}
      media={media.map((item) => ({
        path: item.path,
        alt: item.alt,
        filename: item.filename,
        groupName: item.groupName,
      }))}
    />
  );
}
