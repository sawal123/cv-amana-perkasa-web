import Link from "next/link";
import { Banner, Card, btnSecondary } from "@/components/admin/ui";
import { listQuotationRequests } from "@/lib/quotation";
import { QUOTATION_STATUS_LABELS, type QuotationRequest } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Permintaan Penawaran" };

const BADGE: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-amber-50 text-amber-700",
  quoted: "bg-violet-50 text-violet-700",
  closed: "bg-emerald-50 text-emerald-700",
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
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Card title="Permintaan Penawaran" description={`${requests.length} permintaan, terbaru di atas.`}>
        {requests.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">Belum ada permintaan penawaran.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2.5 pr-3 font-semibold">Tanggal</th>
                  <th className="py-2.5 pr-3 font-semibold">Nama</th>
                  <th className="py-2.5 pr-3 font-semibold">Perusahaan</th>
                  <th className="py-2.5 pr-3 font-semibold">Jenis Event</th>
                  <th className="py-2.5 pr-3 font-semibold">Kontak</th>
                  <th className="py-2.5 pr-3 font-semibold">Status</th>
                  <th className="py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="py-3 pr-3 whitespace-nowrap text-slate-500">{formatDate(request.createdAt)}</td>
                    <td className="py-3 pr-3 font-medium text-slate-900">{request.name}</td>
                    <td className="py-3 pr-3 text-slate-600">{request.company || "—"}</td>
                    <td className="py-3 pr-3 text-slate-600">{request.eventType}</td>
                    <td className="py-3 pr-3 text-slate-600">
                      <div>{request.phone}</div>
                      {request.email ? <div className="text-xs text-slate-400">{request.email}</div> : null}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE[request.status] ?? "bg-slate-100 text-slate-500"}`}
                      >
                        {QUOTATION_STATUS_LABELS[request.status as keyof typeof QUOTATION_STATUS_LABELS] ?? request.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/quotation-requests/${request.id}`}
                        className={`${btnSecondary} px-2.5 py-1 text-xs`}
                      >
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
