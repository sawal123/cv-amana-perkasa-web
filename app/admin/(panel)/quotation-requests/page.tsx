import Link from "next/link";
import { Badge, Banner, Card, EmptyState, PageHeader, btnSecondarySm } from "@/components/admin/ui";
import { listQuotationRequests } from "@/lib/quotation";
import { QUOTATION_STATUS_LABELS, type QuotationRequest } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Permintaan Penawaran" };

const BADGE_TONE: Record<string, "info" | "warning" | "violet" | "success" | "neutral"> = {
  new: "info",
  contacted: "warning",
  quoted: "violet",
  closed: "success",
};

function formatDate(date: Date): string {
  const value = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function QuotationRequestsPage() {
  let requests: QuotationRequest[] = [];
  let error: string | undefined;

  try {
    requests = await listQuotationRequests();
  } catch {
    error = "Database belum terhubung. Permintaan penawaran tidak dapat ditampilkan.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permintaan Penawaran"
        description={`${requests.length} permintaan, terbaru di atas.`}
      />

      {error ? <Banner tone="error">{error}</Banner> : null}

      <Card>
        {requests.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Belum ada permintaan penawaran"
            description="Permintaan dari form publik akan muncul di sini secara otomatis."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold">Tanggal</th>
                  <th className="px-3 py-3 font-semibold">Nama</th>
                  <th className="px-3 py-3 font-semibold">Perusahaan</th>
                  <th className="px-3 py-3 font-semibold">Jenis Event</th>
                  <th className="px-3 py-3 font-semibold">Kontak</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 align-middle transition last:border-0 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(request.createdAt)}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{request.name}</td>
                    <td className="px-3 py-3 text-slate-600">{request.company || "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{request.eventType}</td>
                    <td className="px-3 py-3 text-slate-600">
                      <div className="font-medium text-slate-700">{request.phone}</div>
                      {request.email ? <div className="text-xs text-slate-400">{request.email}</div> : null}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={BADGE_TONE[request.status] ?? "neutral"}>
                        {QUOTATION_STATUS_LABELS[request.status as keyof typeof QUOTATION_STATUS_LABELS] ?? request.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/admin/quotation-requests/${request.id}`} className={btnSecondarySm}>
                        Lihat detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
