import Link from "next/link";
import { notFound } from "next/navigation";
import SettingsEditor from "@/components/admin/settings-editor";
import { Card } from "@/components/admin/ui";
import { SETTING_TABS, isSettingsGroup, tabFor } from "@/lib/admin/settings-fields";
import { loadSettings } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function SettingsGroupPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  if (!isSettingsGroup(group)) notFound();

  const tab = tabFor(group);
  if (!tab) notFound();

  const settings = await loadSettings();
  const values = settings[tab.group] as unknown as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <Card title="Settings" description="Teks, gambar, dan meta yang dipakai di seluruh situs.">
        <div className="flex flex-wrap gap-1.5">
          {SETTING_TABS.map((item) => (
            <Link
              key={item.group}
              href={`/admin/settings/${item.group}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                item.group === tab.group
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Card>

      <SettingsEditor group={tab.group} label={tab.label} fields={tab.fields} values={values} />
    </div>
  );
}
