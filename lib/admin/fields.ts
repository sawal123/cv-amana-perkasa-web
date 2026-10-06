import { z } from "zod";

export type ContentTable = "services" | "projects" | "team_members" | "workflow_steps";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "image";
  required?: boolean;
  maxLength?: number;
  /** Hint shown under the input in the admin form. */
  help?: string;
};

export type Payload = Record<string, string>;

export type TableDef = {
  key: ContentTable;
  /** Plural heading, e.g. "Layanan". */
  label: string;
  singular: string;
  /** Admin route for this table — revalidatePath targets it after a mutation. */
  route: string;
  /** Column whose value labels a row in lists and confirm dialogs. */
  titleField: string;
  fields: FieldDef[];
  schema: z.ZodType<Payload, Payload>;
};

function schemaFor(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    const base = z.string().trim().max(field.maxLength ?? 65_000);
    shape[field.name] = field.required ? base.min(1) : base.default("");
  }
  // The shape is built at runtime from the registry, so the inferred output is an
  // index signature rather than Payload. The registry is the only author of those
  // keys, which is what makes this narrowing safe.
  return z.object(shape).strict() as unknown as z.ZodType<Payload, Payload>;
}

function define(def: Omit<TableDef, "schema">): TableDef {
  return { ...def, schema: schemaFor(def.fields) };
}

/**
 * Closed registry of every editable content table. Table and column names only
 * ever come from here — never from a request — which is what makes the generic
 * data access in lib/admin/store.ts safe to interpolate.
 */
export const TABLES: Record<ContentTable, TableDef> = {
  services: define({
    key: "services",
    label: "Layanan",
    singular: "layanan",
    route: "/admin/content/services",
    titleField: "title",
    fields: [
      { name: "no", label: "Nomor", type: "text", maxLength: 4, help: 'Label kecil di kartu, misalnya "01".' },
      { name: "title", label: "Judul", type: "text", required: true, maxLength: 150 },
      { name: "description", label: "Deskripsi", type: "textarea", required: true, maxLength: 500 },
    ],
  }),

  projects: define({
    key: "projects",
    label: "Project",
    singular: "project",
    route: "/admin/content/projects",
    titleField: "title",
    fields: [
      { name: "title", label: "Judul", type: "text", required: true, maxLength: 150 },
      { name: "category", label: "Kategori", type: "text", maxLength: 80 },
      { name: "image", label: "Gambar", type: "image", required: true, maxLength: 500 },
      { name: "description", label: "Deskripsi", type: "textarea", required: true, maxLength: 1000 },
    ],
  }),

  team_members: define({
    key: "team_members",
    label: "Tim & Management",
    singular: "anggota tim",
    route: "/admin/content/team_members",
    titleField: "name",
    fields: [
      { name: "role", label: "Jabatan", type: "text", required: true, maxLength: 100 },
      { name: "name", label: "Nama", type: "text", required: true, maxLength: 150 },
      { name: "description", label: "Ringkasan tugas", type: "textarea", maxLength: 300 },
      { name: "photo", label: "Foto", type: "image", maxLength: 500, help: "Opsional. Kosongkan untuk menampilkan nomor urut." },
    ],
  }),

  workflow_steps: define({
    key: "workflow_steps",
    label: "Workflow",
    singular: "langkah workflow",
    route: "/admin/content/workflow_steps",
    titleField: "title",
    fields: [
      { name: "no", label: "Nomor", type: "text", maxLength: 4 },
      { name: "title", label: "Judul", type: "text", required: true, maxLength: 150 },
      { name: "description", label: "Deskripsi", type: "textarea", required: true, maxLength: 500 },
    ],
  }),
};

export const TABLE_KEYS = Object.keys(TABLES) as ContentTable[];

/** Column names a row may carry besides id/position/published, for one table. */
export function payloadKeys(key: ContentTable): string[] {
  return TABLES[key].fields.map((f) => f.name);
}
