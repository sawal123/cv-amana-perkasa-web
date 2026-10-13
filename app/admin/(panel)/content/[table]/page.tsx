import { notFound } from "next/navigation";
import ContentManager from "@/components/admin/content-manager";
import { TABLES, type ContentTable } from "@/lib/admin/fields";
import { listRows } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

export default async function ContentPage({ params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  if (!(table in TABLES)) notFound();

  const key = table as ContentTable;
  const definition = TABLES[key];
  const rows = await listRows(key);

  return (
    <ContentManager
      table={key}
      route={definition.route}
      label={definition.label}
      singular={definition.singular}
      titleField={definition.titleField}
      fields={definition.fields}
      rows={rows}
    />
  );
}
