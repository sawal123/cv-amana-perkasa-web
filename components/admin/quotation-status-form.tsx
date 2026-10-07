"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateQuotationStatusAction } from "@/app/admin/actions";
import { QUOTATION_STATUSES, QUOTATION_STATUS_LABELS } from "@/lib/types";
import { Banner, Field, btnPrimary, inputClass } from "./ui";

export default function QuotationStatusForm({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [message, setMessage] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    setSuccess(undefined);
    try {
      const result = await updateQuotationStatusAction(id, value);
      if (result.ok) {
        setSuccess("Status diperbarui.");
        router.refresh();
      } else {
        setMessage(result.message ?? "Gagal memperbarui status.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {message ? <Banner tone="error">{message}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}

      <Field label="Status" htmlFor="quotation-status" help="Ubah status untuk menandai progres penanganan lead.">
        <select
          id="quotation-status"
          className={inputClass}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          {QUOTATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {QUOTATION_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>

      <button type="submit" disabled={busy || value === status} className={btnPrimary}>
        {busy ? "Menyimpan…" : "Simpan status"}
      </button>
    </form>
  );
}
