import Link from "next/link";
import { notFound } from "next/navigation";
import QuotationStatusForm from "@/components/admin/quotation-status-form";
import { Card } from "@/components/admin/ui";
import { getQuotationRequest, toWhatsAppNumber } from "@/lib/quotation";
import { QUOTATION_STATUS_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date): string {
  const value = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{children}</dd>
    </div>
  );
}

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) notFound();

  const request = await getQuotationRequest(numeric).catch(() => null);
  if (!request) notFound();

  const phoneDigits = request.phone.replace(/\D/g, "");
  const whatsappNumber = toWhatsAppNumber(request.phone);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/quotation-requests" className="text-sm text-slate-500 hover:text-slate-900">
          ← Kembali ke permintaan penawaran
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-900">Permintaan dari {request.name}</h1>
      </div>

      <Card title="Detail permintaan" description={`Masuk ${formatDateTime(request.createdAt)}.`}>
        <dl>
          <Row label="Nama">{request.name}</Row>
          <Row label="Perusahaan">{request.company || "—"}</Row>
          <Row label="Telepon / WhatsApp">
            <a href={`tel:${phoneDigits}`} className="font-medium text-blue-600 hover:underline">
              {request.phone}
            </a>
            {whatsappNumber ? (
              <>
                {" · "}
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  WhatsApp
                </a>
              </>
            ) : null}
          </Row>
          <Row label="Email">
            {request.email ? (
              <a href={`mailto:${request.email}`} className="font-medium text-blue-600 hover:underline">
                {request.email}
              </a>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Jenis Event">{request.eventType}</Row>
          <Row label="Tanggal Event">{request.eventDate || "—"}</Row>
          <Row label="Lokasi">{request.location || "—"}</Row>
          <Row label="Jumlah Tamu">{request.guestCount || "—"}</Row>
          <Row label="Budget">{request.budgetRange || "—"}</Row>
          <Row label="Brief">
            {/* Plain text only — React escapes it; no HTML is ever rendered. */}
            <span className="block whitespace-pre-wrap break-words">{request.message}</span>
          </Row>
          <Row label="Status">{QUOTATION_STATUS_LABELS[request.status as keyof typeof QUOTATION_STATUS_LABELS] ?? request.status}</Row>
        </dl>
      </Card>

      <Card title="Status">
        <QuotationStatusForm id={request.id} status={request.status} />
      </Card>
    </div>
  );
}
