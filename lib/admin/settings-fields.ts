import { z } from "zod";
import { SAFE_IMAGE_PATH } from "@/lib/admin/fields";
import { SETTINGS_GROUPS, type SettingsGroup } from "@/lib/types";

export type SettingFieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "image" | "stats";
  maxLength?: number;
  help?: string;
};

export type SettingTab = {
  group: SettingsGroup;
  label: string;
  fields: SettingFieldDef[];
};

const TEXT = 200;
const LONG = 2000;

/**
 * Mirrors lib/types.ts SiteSettings field for field. The admin form and the
 * server-side validator are both generated from this table, so a field cannot
 * be editable without being validated.
 */
export const SETTING_TABS: SettingTab[] = [
  {
    group: "identity",
    label: "Identitas",
    fields: [
      { name: "company", label: "Nama perusahaan", type: "text", maxLength: TEXT },
      { name: "shortName", label: "Nama pendek", type: "text", maxLength: TEXT, help: "Muncul di logo header dan footer." },
      { name: "initials", label: "Inisial logo", type: "text", maxLength: 4 },
      {
        name: "logo",
        label: "Logo perusahaan",
        type: "image",
        maxLength: 500,
        help: "Logo resmi perusahaan. PNG/WEBP transparan disarankan. Kosongkan untuk memakai logo inisial.",
      },
      { name: "tagline", label: "Tagline", type: "text", maxLength: TEXT },
      { name: "navCta", label: "Tombol navigasi", type: "text", maxLength: TEXT },
      { name: "copyright", label: "Catatan copyright", type: "text", maxLength: TEXT, help: "Tahun dan nama perusahaan ditambahkan otomatis." },
    ],
  },
  {
    group: "hero",
    label: "Hero",
    fields: [
      { name: "title", label: "Judul utama", type: "textarea", maxLength: LONG },
      { name: "description", label: "Deskripsi", type: "textarea", maxLength: LONG },
      { name: "image", label: "Gambar latar", type: "image", maxLength: 500 },
      { name: "ctaPrimary", label: "Tombol utama", type: "text", maxLength: TEXT },
      { name: "ctaSecondary", label: "Tombol sekunder", type: "text", maxLength: TEXT },
      { name: "scrollHint", label: "Petunjuk scroll", type: "text", maxLength: TEXT },
    ],
  },
  {
    group: "about",
    label: "Tentang",
    fields: [
      { name: "kicker", label: "Label kecil", type: "text", maxLength: TEXT },
      { name: "heading", label: "Judul seksi", type: "textarea", maxLength: LONG },
      { name: "body", label: "Deskripsi perusahaan", type: "textarea", maxLength: LONG },
      { name: "stats", label: "Statistik", type: "stats" },
    ],
  },
  {
    group: "services",
    label: "Seksi Layanan",
    fields: [
      { name: "kicker", label: "Label kecil", type: "text", maxLength: TEXT },
      { name: "heading", label: "Judul seksi", type: "textarea", maxLength: LONG },
      { name: "description", label: "Deskripsi", type: "textarea", maxLength: LONG },
    ],
  },
  {
    group: "projects",
    label: "Seksi Project",
    fields: [
      { name: "kicker", label: "Label kecil", type: "text", maxLength: TEXT },
      { name: "heading", label: "Judul seksi", type: "textarea", maxLength: LONG },
      { name: "description", label: "Deskripsi", type: "textarea", maxLength: LONG },
    ],
  },
  {
    group: "process",
    label: "Seksi Workflow",
    fields: [
      { name: "kicker", label: "Label kecil", type: "text", maxLength: TEXT },
      { name: "heading", label: "Judul seksi", type: "textarea", maxLength: LONG },
    ],
  },
  {
    group: "team",
    label: "Seksi Tim",
    fields: [
      { name: "kicker", label: "Label kecil", type: "text", maxLength: TEXT },
      { name: "heading", label: "Judul seksi", type: "textarea", maxLength: LONG },
      { name: "description", label: "Deskripsi", type: "textarea", maxLength: LONG },
    ],
  },
  {
    group: "legalities",
    label: "Seksi Legalitas",
    fields: [
      { name: "kicker", label: "Label kecil", type: "text", maxLength: TEXT },
      { name: "heading", label: "Judul seksi", type: "textarea", maxLength: LONG },
      { name: "description", label: "Deskripsi", type: "textarea", maxLength: LONG, help: "Opsional. Kosongkan untuk menyembunyikan paragraf ini." },
    ],
  },
  {
    group: "contact",
    label: "Kontak",
    fields: [
      { name: "kicker", label: "Label kecil", type: "text", maxLength: TEXT },
      { name: "heading", label: "Judul seksi", type: "textarea", maxLength: LONG },
      { name: "description", label: "Deskripsi", type: "textarea", maxLength: LONG },
      { name: "phone", label: "Telepon", type: "text", maxLength: TEXT },
      { name: "email", label: "Email", type: "text", maxLength: TEXT },
      { name: "whatsapp", label: "WhatsApp", type: "text", maxLength: TEXT, help: "Angka saja disarankan, mis. 62812xxxx. Kosongkan untuk menyembunyikan tombol." },
      { name: "address", label: "Alamat", type: "textarea", maxLength: LONG },
      { name: "instagram", label: "Instagram", type: "text", maxLength: TEXT },
    ],
  },
  {
    group: "seo",
    label: "SEO & Meta",
    fields: [
      { name: "title", label: "Judul tab / search result", type: "text", maxLength: 120 },
      { name: "description", label: "Meta description", type: "textarea", maxLength: 320, help: "Panjang aman sekitar 150-160 karakter." },
      { name: "keywords", label: "Keywords", type: "text", maxLength: LONG, help: "Pisah dengan koma." },
      { name: "ogImage", label: "Gambar OG", type: "image", maxLength: 500 },
      { name: "canonical", label: "URL kanonis", type: "text", maxLength: LONG, help: "mis. https://amanaperkasa.co.id — isi untuk mengaktifkan metadataBase dan canonical." },
    ],
  },
];

export const SETTINGS_SCHEMA_BY_GROUP = Object.fromEntries(
  SETTING_TABS.map((tab) => {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const field of tab.fields) {
      if (field.type === "stats") {
        shape[field.name] = z
          .array(z.object({ value: z.string().trim().max(40), label: z.string().trim().max(80) }))
          .max(6);
      } else {
        const base = z.string().trim().max(field.maxLength ?? LONG).default("");
        // Image settings share the content-CMS rule: a site-relative path under
        // /uploads or /projects, or empty. Absolute URLs, schemes and `..` are refused.
        shape[field.name] =
          field.type === "image"
            ? base.refine((v: unknown) => v === "" || SAFE_IMAGE_PATH.test(String(v)))
            : base;
      }
    }
    return [tab.group, z.object(shape).strict()];
  }),
) as unknown as Record<SettingsGroup, z.ZodType<Record<string, unknown>, Record<string, unknown>>>;

export function tabFor(group: string): SettingTab | undefined {
  return SETTING_TABS.find((tab) => tab.group === group);
}

export function isSettingsGroup(value: string): value is SettingsGroup {
  return (SETTINGS_GROUPS as string[]).includes(value);
}
