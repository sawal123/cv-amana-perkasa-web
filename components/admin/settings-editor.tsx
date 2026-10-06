"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveSettingsAction } from "@/app/admin/actions";
import type { SettingFieldDef } from "@/lib/admin/settings-fields";
import { Banner, Card, Field, btnDanger, btnPrimary, btnSecondary, inputClass } from "./ui";

type StatValue = { value: string; label: string };

type Props = {
  group: string;
  label: string;
  fields: SettingFieldDef[];
  values: Record<string, unknown>;
};

function statsFrom(values: Record<string, unknown>): StatValue[] {
  const raw = values.stats;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({ value: String(item.value ?? ""), label: String(item.label ?? "") }));
}

export default function SettingsEditor({ group, label, fields, values }: Props) {
  const router = useRouter();
  const [text, setText] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === "stats") continue;
      initial[field.name] = String(values[field.name] ?? "");
    }
    return initial;
  });
  const [stats, setStats] = useState<StatValue[]>(() => statsFrom(values));
  const [errors, setErrors] = useState<Record<string, string> | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors(undefined);
    setMessage(undefined);
    setSaved(false);

    try {
      const payload: Record<string, unknown> = { ...text };
      if (fields.some((field) => field.type === "stats")) {
        payload.stats = stats.filter((stat) => stat.value.trim() || stat.label.trim());
      }

      const result = await saveSettingsAction(group, payload);
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setErrors(result.errors);
        setMessage(result.message ?? "Gagal menyimpan.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={label} description="Perubahan langsung terlihat di situs setelah disimpan.">
      {message ? <Banner tone="error">{message}</Banner> : null}
      {saved && !message ? <Banner tone="success">Tersimpan.</Banner> : null}

      <form onSubmit={submit} className="space-y-5">
        {fields.map((field) => {
          const id = `settings-${group}-${field.name}`;

          if (field.type === "stats") {
            return (
              <div key={field.name}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {field.label}
                </div>
                {errors?.[field.name] ? (
                  <p className="mb-2 text-xs font-medium text-red-600">{errors[field.name]}</p>
                ) : null}
                <div className="space-y-2">
                  {stats.map((stat, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        className={`${inputClass} w-28`}
                        placeholder="360°"
                        maxLength={40}
                        value={stat.value}
                        onChange={(e) =>
                          setStats((current) =>
                            current.map((item, i) => (i === index ? { ...item, value: e.target.value } : item)),
                          )
                        }
                      />
                      <input
                        className={inputClass}
                        placeholder="Event Support"
                        maxLength={80}
                        value={stat.label}
                        onChange={(e) =>
                          setStats((current) =>
                            current.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)),
                          )
                        }
                      />
                      <button
                        type="button"
                        className={`${btnDanger} shrink-0 px-2.5 py-1 text-xs`}
                        onClick={() => setStats((current) => current.filter((_, i) => i !== index))}
                        aria-label="Hapus statistik"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {stats.length < 6 ? (
                    <button
                      type="button"
                      className={`${btnSecondary} px-2.5 py-1 text-xs`}
                      onClick={() => setStats((current) => [...current, { value: "", label: "" }])}
                    >
                      + Tambah statistik
                    </button>
                  ) : null}
                </div>
              </div>
            );
          }

          return (
            <Field
              key={field.name}
              label={field.label}
              help={field.help}
              error={errors?.[field.name]}
              htmlFor={id}
            >
              {field.type === "textarea" ? (
                <textarea
                  id={id}
                  rows={4}
                  maxLength={field.maxLength}
                  className={inputClass}
                  value={text[field.name] ?? ""}
                  onChange={(e) => setText((current) => ({ ...current, [field.name]: e.target.value }))}
                />
              ) : (
                <input
                  id={id}
                  type="text"
                  maxLength={field.maxLength}
                  className={inputClass}
                  value={text[field.name] ?? ""}
                  onChange={(e) => setText((current) => ({ ...current, [field.name]: e.target.value }))}
                />
              )}
            </Field>
          );
        })}

        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "Menyimpan…" : `Simpan ${label}`}
        </button>
      </form>
    </Card>
  );
}
