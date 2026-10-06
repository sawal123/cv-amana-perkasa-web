import Link from "next/link";
import { settings as settingsTable } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { TABLES, type ContentTable } from "@/lib/admin/fields";
import { countRows } from "@/lib/admin/store";
import { Banner, Card, btnSecondary } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Count = { label: string; href: string; total: number; published: number };

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {counts.map((count) => (
              <Link
                key={count.href}
                href={count.href}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{count.label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{count.published}</div>
                <div className="text-xs text-slate-400">
                  tayang dari {count.total} baris
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Tidak ada data yang bisa dihitung.</p>
        )}
      </Card>

      <Card title="Pintasan">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/settings/identity" className={btnSecondary}>
            Ubah teks &amp; SEO
          </Link>
          <Link href="/admin/content/projects" className={btnSecondary}>
            Kelola portfolio
          </Link>
          <Link href="/admin/media" className={btnSecondary}>
            Unggah gambar
          </Link>
          <a href="/" className={btnSecondary}>
            Buka situs
          </a>
        </div>
      </Card>
    </div>
  );
}
