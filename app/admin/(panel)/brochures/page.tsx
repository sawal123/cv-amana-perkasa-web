import BrochureManager, { type BrochureListRow } from "@/components/admin/brochure-manager";
import { listBrochures } from "@/lib/brochures";

export const dynamic = "force-dynamic";

// Formatted on the server so the client render is deterministic (no locale or
// timezone drift between server HTML and hydration).
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

export default async function BrochuresPage() {
  // A broken database shows an empty list rather than crashing the panel — the
  // same degradation the Media page uses. /api/health reports the real state.
  const items = await listBrochures().catch(() => []);

  const rows: BrochureListRow[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    filename: item.filename,
    size: item.size,
    published: item.published,
    updatedAt: dateFormatter.format(item.updatedAt),
  }));

  return <BrochureManager rows={rows} />;
}
