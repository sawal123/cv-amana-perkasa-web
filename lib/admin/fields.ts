import { z } from "zod";

export type ContentTable =
  | "services"
  | "projects"
  | "team_members"
  | "workflow_steps"
  | "company_legalities";

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

/**
 * Every image reference must be a site-relative path under /uploads (media
 * manager output) or /projects (bundled artwork). This rejects absolute URLs,
 * schemes, protocol-relative values and anything containing `..`, so a stored
 * image field can never be turned into a path traversal or an injected host.
 */
export const SAFE_IMAGE_PATH = /^\/(?:uploads|projects)\/[A-Za-z0-9._-]+$/;

/**
 * Stricter variant for project gallery images: media library output only.
 * Bundled /projects/* artwork stays valid for a project cover, but a gallery
 * entry has to be a real uploaded file, so it is refused here.
 */
export const SAFE_UPLOAD_PATH = /^\/uploads\/[A-Za-z0-9._-]+$/;

function schemaFor(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    // Built as a ZodString first so min/max are available, then widened — a
    // ZodDefault (from .default) has no .min.
    const base = z.string().trim().max(field.maxLength ?? 65_000);
    let value: z.ZodTypeAny = field.required ? base.min(1) : base.default("");

    if (field.type === "image") {
      // Empty stays valid so optional images (team photo) can be cleared.
      value = value.refine((v: unknown) => v === "" || SAFE_IMAGE_PATH.test(String(v)));
    }

    shape[field.name] = value;
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
      { name: "image", label: "Gambar cover", type: "image", required: true, maxLength: 500, help: "Thumbnail utama di grid portfolio." },
      { name: "description", label: "Deskripsi", type: "textarea", required: true, maxLength: 1000 },
      { name: "client", label: "Client", type: "text", maxLength: 150, help: "Opsional. Kosongkan bila tidak ingin ditampilkan di situs." },
      { name: "location", label: "Lokasi", type: "text", maxLength: 150, help: "Opsional." },
      { name: "year", label: "Tahun", type: "text", maxLength: 9, help: 'Opsional. Misalnya "2024".' },
      { name: "scope", label: "Scope pekerjaan", type: "textarea", maxLength: 1000, help: "Opsional. Satu item per baris." },
    ],
  }),

  company_legalities: define({
    key: "company_legalities",
    label: "Legalitas",
    singular: "legalitas",
    route: "/admin/content/company_legalities",
    titleField: "title",
    fields: [
      { name: "title", label: "Nama legalitas", type: "text", required: true, maxLength: 150, help: 'Misalnya "NIB", "Akta Pendirian", "NPWP".' },
      { name: "value", label: "Keterangan singkat", type: "text", maxLength: 150, help: 'Misalnya "Terdaftar", "Tersedia".' },
      { name: "description", label: "Catatan", type: "textarea", maxLength: 500, help: "Opsional." },
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
