import Link from "next/link";
import { notFound } from "next/navigation";
import SettingsEditor from "@/components/admin/settings-editor";
import { Card, PageHeader } from "@/components/admin/ui";
import { SETTING_TABS, isSettingsGroup, tabFor } from "@/lib/admin/settings-fields";
import { loadSettings } from "@/lib/content";
import { listMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function SettingsGroupPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  if (!isSettingsGroup(group)) notFound();

  const tab = tabFor(group);
  if (!tab) notFound();

  const settings = await loadSettings();
  const values = settings[tab.group] as unknown as Record<string, unknown>;
  // Media powers the image picker; a broken database there must not hide the form.
  const media = await listMedia().catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Teks, gambar, dan meta yang dipakai di seluruh situs publik." />

      <Card>
        <div className="flex flex-wrap gap-1.5">
          {SETTING_TABS.map((item) => (
            <Link
              key={item.group}
              href={`/admin/settings/${item.group}`}
              aria-current={item.group === tab.group ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                item.group === tab.group
                  ? "bg-[#071b35] text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Card>

      <SettingsEditor
        group={tab.group}
        label={tab.label}
        fields={tab.fields}
        values={values}
        media={media.map((item) => ({
          path: item.path,
          alt: item.alt,
          filename: item.filename,
          groupName: item.groupName,
        }))}
      />
    </div>
  );
}
