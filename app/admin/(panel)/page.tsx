import Link from "next/link";
import { settings as settingsTable } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { TABLES, type ContentTable } from "@/lib/admin/fields";
import { countRows } from "@/lib/admin/store";
import { ActionCard, Banner, Card, EmptyState, PageHeader, StatCard, btnPrimary, btnSecondary } from "@/components/admin/ui";
import { tablePresentation } from "@/components/admin/nav";
import type { IconName } from "@/components/admin/icons";

export const dynamic = "force-dynamic";

type Count = { label: string; href: string; icon: IconName; total: number; published: number };

async function gather() {
  const keys = Object.keys(TABLES) as ContentTable[];
  try {
    const [rows, settingKeys] = await Promise.all([
      Promise.all(keys.map(async (key) => ({ key, ...(await countRows(key)) }))),
      getDb().select({ key: settingsTable.key }).from(settingsTable),
    ]);
    return {
      error: undefined as string | undefined,
      counts: rows.map<Count>((row) => ({
        label: TABLES[row.key].label,
        href: TABLES[row.key].route,
        icon: tablePresentation(row.key).icon,
        total: row.total,
        published: row.published,
      })),
      settingsGroups: settingKeys.length,
    };
  } catch {
    return { error: "Database belum terhubung.", counts: [] as Count[], settingsGroups: 0 };
  }
}

export default async function AdminDashboard() {
  const { error, counts, settingsGroups } = await gather();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ringkasan Dashboard"
        description="Kelola konten website CV AMANA PERKASA dari satu tempat."
        actions={
          <>
            <Link href="/admin/content/projects" className={btnPrimary}>
              Kelola Project
            </Link>
            <a href="/" target="_blank" rel="noopener noreferrer" className={btnSecondary}>
              Buka Situs
            </a>
          </>
        }
      />

      {error ? (
        <Banner tone="error">
          {error} Jalankan migrasi <code className="font-mono text-xs">drizzle/0000_init.sql</code> lalu seed
          sebelum panel ini bisa dipakai.
        </Banner>
      ) : settingsGroups === 0 ? (
        <Banner tone="info">
          Database sudah terhubung tapi belum ter-seed. Situs publik untuk sementara menampilkan konten bawaan
          dari <code className="font-mono text-xs">data/site.json</code>. Jalankan seed untuk memindahkan konten
          itu ke MySQL.
        </Banner>
      ) : null}

      <Card title="Konten" description="Jumlah baris termasuk yang sedang disembunyikan.">
        {counts.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {counts.map((count) => (
              <StatCard
                key={count.href}
                icon={count.icon}
                label={count.label}
                published={count.published}
                total={count.total}
                href={count.href}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="inbox"
            title="Tidak ada data yang bisa dihitung."
            description="Hubungkan database lalu muat ulang halaman ini."
          />
        )}
      </Card>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Pintasan</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ActionCard icon="briefcase" title="Kelola Portfolio" description="Tambah dan edit project" href="/admin/content/projects" />
          <ActionCard icon="settings" title="Ubah teks & SEO" description="Kelola identitas dan metadata website" href="/admin/settings/identity" />
          <ActionCard icon="image" title="Unggah Gambar" description="Kelola media website" href="/admin/media" />
          <ActionCard icon="fileText" title="Kelola Brosur" description="Upload company profile PDF" href="/admin/brochures" />
          <ActionCard icon="external" title="Buka Situs" description="Lihat website publik" href="/" external />
        </div>
      </section>
    </div>
  );
}
