"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveContentAction } from "@/app/admin/actions";
import type { ContentTable, FieldDef, Payload } from "@/lib/admin/fields";
import { NavIcon } from "./icons";
import MediaPicker, { type MediaOption } from "./media-picker";
import { Banner, Card, Field, PageHeader, btnPrimary, btnSecondary, inputClass } from "./ui";

type Props = {
  table: ContentTable;
  route: string;
  label: string;
  singular: string;
  titleField: string;
  fields: FieldDef[];
  initialValues: Payload;
  id?: number;
  media: MediaOption[];
};

function emptyValues(fields: FieldDef[]): Payload {
  const values: Payload = {};
  for (const field of fields) values[field.name] = "";
  return values;
}

/**
 * Groups a table's fields into form sections. Project is the only table with
 * enough fields to need real grouping; the rest render as one compact card.
 * Field names/labels/validation all come from the registry — nothing here
 * defines or changes them.
 */
function sectionsFor(table: ContentTable, fields: FieldDef[]): { title: string; fields: FieldDef[] }[] {
  const byName = new Map(fields.map((field) => [field.name, field]));
  const pick = (names: string[]) => names.map((name) => byName.get(name)).filter((f): f is FieldDef => Boolean(f));

  if (table === "projects") {
    const groups = [
      { title: "Informasi Utama", names: ["title", "category", "year", "client", "location"] },
      { title: "Media", names: ["image"] },
      { title: "Deskripsi", names: ["description"] },
      { title: "Scope Pekerjaan", names: ["scope"] },
      { title: "Case Study", names: ["objective", "approach", "outcome"] },
    ];
    return groups
      .map((group) => ({ title: group.title, fields: pick(group.names) }))
      .filter((section) => section.fields.length > 0);
  }

  return [{ title: "Detail", fields }];
}

export default function ContentEditor({ table, route, label, singular, titleField, fields, initialValues, id, media }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Payload>(() => ({ ...emptyValues(fields), ...initialValues }));
  const [errors, setErrors] = useState<Record<string, string> | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function setValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors(undefined);
    setMessage(undefined);
    try {
      const result = await saveContentAction(table, values, id);
      if (result.ok) {
        router.refresh();
        router.push(route);
        return;
      }
      setErrors(result.errors);
      setMessage(result.message ?? "Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  function renderField(field: FieldDef) {
    const value = values[field.name] ?? "";
    const inputId = `field-${table}-${field.name}`;
    const wide = field.type !== "text";
    const labelled = field.type === "text" || field.type === "textarea";

    return (
      <div key={field.name} className={wide ? "lg:col-span-2" : undefined}>
        <Field label={field.label} help={field.help} error={errors?.[field.name]} htmlFor={labelled ? inputId : undefined}>
          {field.type === "image" ? (
            <MediaPicker
              value={value}
              onChange={(next) => setValue(field.name, next)}
              media={media}
              allowClear={!field.required}
              disabled={busy}
              emptyHint="Pilih dari pustaka media. Untuk mengunggah gambar baru, buka menu Media."
            />
          ) : field.type === "textarea" ? (
            <textarea
              id={inputId}
              rows={4}
              maxLength={field.maxLength}
              className={inputClass}
              value={value}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          ) : (
            <input
              id={inputId}
              type="text"
              maxLength={field.maxLength}
              className={inputClass}
              value={value}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          )}
        </Field>
      </div>
    );
  }

  const sections = sectionsFor(table, fields);

  return (
    <div className="space-y-6">
      <div>
        <Link href={route} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
          <NavIcon name="arrowRight" className="h-4 w-4 rotate-180" /> Kembali ke daftar {label.toLowerCase()}
        </Link>
        <div className="mt-4">
          <PageHeader
            title={id ? `Ubah ${singular}` : `Tambah ${singular}`}
            description={
              id && values[titleField]
                ? `Mengubah “${values[titleField]}”.`
                : `Lengkapi data ${singular} lalu simpan.`
            }
          />
        </div>
      </div>

      {message ? <Banner tone="error">{message}</Banner> : null}
      {errors && Object.keys(errors).length ? (
        <Banner tone="error">
          <ul className="list-inside list-disc space-y-0.5">
            {fields.filter((field) => errors[field.name]).map((field) => (
              <li key={field.name}>{errors[field.name]}</li>
            ))}
            {errors.form ? <li>{errors.form}</li> : null}
          </ul>
        </Banner>
      ) : null}

      <form onSubmit={submit} className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title} title={section.title}>
            <div className="grid gap-5 lg:grid-cols-2">{section.fields.map(renderField)}</div>
          </Card>
        ))}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
          <Link href={route} className={btnSecondary}>
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
