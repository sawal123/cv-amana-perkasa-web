"use client";

import { useState } from "react";
import { submitQuotationAction } from "@/app/admin/actions";

type Props = {
  whatsappDigits: string;
  copy: {
    formHeading: string;
    formDescription: string;
    submitLabel: string;
    successHeading: string;
    successDescription: string;
  };
};

type Values = {
  name: string;
  company: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  location: string;
  guestCount: string;
  budgetRange: string;
  message: string;
  consent: boolean;
  website: string;
};

const EMPTY: Values = {
  name: "",
  company: "",
  phone: "",
  email: "",
  eventType: "",
  eventDate: "",
  location: "",
  guestCount: "",
  budgetRange: "",
  message: "",
  consent: false,
  website: "",
};

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300";

const WHATSAPP_FOLLOW_UP =
  "Halo CV AMANA PERKASA, saya baru saja mengirim permintaan penawaran melalui website.";

export default function QuotationForm({ whatsappDigits, copy }: Props) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string> | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors(undefined);
    setMessage(undefined);

    try {
      const result = await submitQuotationAction({ ...values });
      if (result.ok) {
        setValues(EMPTY);
        setSuccess(true);
      } else {
        setErrors(result.errors);
        setMessage(result.message ?? "Periksa kembali data yang dikirim.");
      }
    } catch {
      setMessage("Permintaan belum dapat dikirim. Silakan coba kembali atau hubungi kami melalui WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-3xl border border-white/12 bg-white/[.04] p-7">
        <div className="text-xs font-black uppercase tracking-[.20em] text-blue-300">Terima kasih</div>
        <h3 className="mt-3 text-2xl font-black text-white">{copy.successHeading}</h3>
        <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">{copy.successDescription}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {whatsappDigits ? (
            <a
              href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(WHATSAPP_FOLLOW_UP)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-400"
            >
              Lanjutkan via WhatsApp
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Kirim permintaan lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/12 bg-white/[.04] p-7">
      <div className="text-xs font-black uppercase tracking-[.20em] text-blue-300">{copy.formHeading}</div>
      <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">{copy.formDescription}</p>

      {message ? (
        <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {message}
        </p>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="q-name" className={labelClass}>Nama *</label>
            <input
              id="q-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              maxLength={150}
              placeholder="Nama lengkap"
              className={inputClass}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={!!errors?.name}
            />
            {errors?.name ? <p className="mt-1.5 text-xs font-medium text-red-300">{errors.name}</p> : null}
          </div>

          <div>
            <label htmlFor="q-company" className={labelClass}>Perusahaan / Instansi</label>
            <input
              id="q-company"
              name="company"
              type="text"
              autoComplete="organization"
              maxLength={150}
              placeholder="Nama perusahaan / instansi"
              className={inputClass}
              value={values.company}
              onChange={(e) => set("company", e.target.value)}
            />
            {errors?.company ? <p className="mt-1.5 text-xs font-medium text-red-300">{errors.company}</p> : null}
          </div>

          <div>
            <label htmlFor="q-phone" className={labelClass}>WhatsApp / Telepon *</label>
            <input
              id="q-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              maxLength={40}
              placeholder="08xx / +62..."
              className={inputClass}
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              aria-invalid={!!errors?.phone}
            />
            {errors?.phone ? <p className="mt-1.5 text-xs font-medium text-red-300">{errors.phone}</p> : null}
          </div>

          <div>
            <label htmlFor="q-email" className={labelClass}>Email</label>
            <input
              id="q-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={190}
              placeholder="email@domain.com"
              className={inputClass}
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={!!errors?.email}
            />
            {errors?.email ? <p className="mt-1.5 text-xs font-medium text-red-300">{errors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="q-event-type" className={labelClass}>Jenis Event *</label>
            <input
              id="q-event-type"
              name="eventType"
              type="text"
              required
              maxLength={120}
              placeholder="Corporate Event / Gathering / Exhibition / dll."
              className={inputClass}
              value={values.eventType}
              onChange={(e) => set("eventType", e.target.value)}
              aria-invalid={!!errors?.eventType}
            />
            {errors?.eventType ? <p className="mt-1.5 text-xs font-medium text-red-300">{errors.eventType}</p> : null}
          </div>

          <div>
            <label htmlFor="q-event-date" className={labelClass}>Tanggal Event</label>
            <input
              id="q-event-date"
              name="eventDate"
              type="date"
              className={`${inputClass} [color-scheme:dark]`}
              value={values.eventDate}
              onChange={(e) => set("eventDate", e.target.value)}
              aria-invalid={!!errors?.eventDate}
            />
            {errors?.eventDate ? <p className="mt-1.5 text-xs font-medium text-red-300">{errors.eventDate}</p> : null}
          </div>

          <div>
            <label htmlFor="q-location" className={labelClass}>Lokasi Event</label>
            <input
              id="q-location"
              name="location"
              type="text"
              maxLength={255}
              placeholder="Medan"
              className={inputClass}
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="q-guest-count" className={labelClass}>Estimasi Jumlah Tamu</label>
            <input
              id="q-guest-count"
              name="guestCount"
              type="text"
              maxLength={50}
              placeholder="500 orang"
              className={inputClass}
              value={values.guestCount}
              onChange={(e) => set("guestCount", e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="q-budget" className={labelClass}>Kisaran Budget</label>
            <input
              id="q-budget"
              name="budgetRange"
              type="text"
              maxLength={100}
              placeholder="Rp50–100 juta"
              className={inputClass}
              value={values.budgetRange}
              onChange={(e) => set("budgetRange", e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="q-message" className={labelClass}>Kebutuhan / Brief *</label>
            <textarea
              id="q-message"
              name="message"
              required
              rows={5}
              maxLength={3000}
              placeholder="Ceritakan kebutuhan acara, konsep, venue, teknis, timeline, dll."
              className={`${inputClass} resize-y`}
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
              aria-invalid={!!errors?.message}
            />
            {errors?.message ? <p className="mt-1.5 text-xs font-medium text-red-300">{errors.message}</p> : null}
          </div>
        </div>

        {/* Honeypot: hidden from users, ignored by screen readers. Bots that fill
            every field trip it; the server then silently drops the submission. */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="q-website">Website</label>
          <input
            id="q-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>

        <label htmlFor="q-consent" className="flex items-start gap-3 text-sm leading-6 text-slate-300">
          <input
            id="q-consent"
            name="consent"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/30 bg-white/10 accent-blue-500"
            checked={values.consent}
            onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={!!errors?.consent}
          />
          <span>
            Saya menyetujui data yang saya kirim digunakan oleh CV AMANA PERKASA untuk menghubungi saya
            terkait permintaan penawaran ini.
          </span>
        </label>
        {errors?.consent ? <p className="text-xs font-medium text-red-300">{errors.consent}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center rounded-full bg-blue-500 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Mengirim…" : copy.submitLabel}
        </button>
      </form>
    </div>
  );
}
