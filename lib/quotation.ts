import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { quotationRequests } from "@/lib/db/schema";
import { QUOTATION_STATUSES, type QuotationRequest, type QuotationStatus } from "@/lib/types";

/**
 * Quotation intake lives here rather than in the server action so the validation,
 * the honeypot and the status rules can be tested without a Next request context.
 * The public action and the admin status action are thin wrappers around it.
 */

export function isQuotationStatus(value: unknown): value is QuotationStatus {
  return typeof value === "string" && (QUOTATION_STATUSES as readonly string[]).includes(value);
}

/**
 * Digits-only phone number in the form WhatsApp Click-to-Chat expects.
 *
 * Indonesian local numbers lead with a trunk 0 (08…); WhatsApp wants the country
 * code instead, so the leading 0 becomes 62. Numbers already written in
 * international form — with or without an explicit `+` — are returned unchanged
 * apart from punctuation.
 *
 * This only affects the generated URL. The value stored in the database stays the
 * form's normalized `request.phone` and is never rewritten here.
 */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export const MAX_MESSAGE = 3000;

// Liberal but bounded: real phone numbers contain only these characters.
const PHONE_CHARS = /^[0-9+().\-\s]+$/;
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True only for a real YYYY-MM-DD calendar date (rejects 2024-02-31). */
function isCalendarDate(value: string): boolean {
  if (!DATE_FORMAT.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Field shape of the public form. Unknown keys are stripped by zod, so a client
 * cannot smuggle in `id`, `status`, `created_at`, or anything else — status is
 * set by the server to "new" on insert.
 */
const quotationSchema = z.object({
  name: z.string().trim().min(2).max(150),
  company: z.string().trim().max(150).default(""),
  phone: z.string().trim().min(8).max(40).regex(PHONE_CHARS),
  email: z
    .string()
    .trim()
    .max(190)
    .default("")
    .refine((value) => value === "" || EMAIL.test(value)),
  eventType: z.string().trim().min(2).max(120),
  eventDate: z
    .string()
    .trim()
    .max(10)
    .default("")
    .refine((value) => value === "" || isCalendarDate(value)),
  location: z.string().trim().max(255).default(""),
  guestCount: z.string().trim().max(50).default(""),
  budgetRange: z.string().trim().max(100).default(""),
  message: z.string().trim().min(10).max(MAX_MESSAGE),
  consent: z.literal(true),
});

const FIELD_LABELS: Record<string, string> = {
  name: "Nama",
  company: "Perusahaan",
  phone: "WhatsApp / Telepon",
  email: "Email",
  eventType: "Jenis event",
  eventDate: "Tanggal event",
  location: "Lokasi",
  guestCount: "Jumlah tamu",
  budgetRange: "Kisaran budget",
  message: "Kebutuhan / brief",
  consent: "Persetujuan penggunaan data",
};

function toFieldErrors(issues: Array<{ path: PropertyKey[]; code?: string }>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const name = String(issue.path[0] ?? "");
    if (!name || errors[name]) continue;
    const label = FIELD_LABELS[name] ?? name;

    if (name === "consent") {
      errors[name] = `${label} wajib dicentang.`;
      continue;
    }
    errors[name] =
      issue.code === "too_small" ? `${label} wajib diisi`
      : issue.code === "too_big" ? `${label} terlalu panjang`
      : `${label} tidak valid`;
  }
  return errors;
}

export type QuotationSubmitResult =
  | { ok: true; id: number }
  | { ok: false; errors: Record<string, string> };

/**
 * Validate and store one submission.
 *
 *  1. Honeypot first: a hidden `website` field no human fills. When it is present
 *     the call reports success without touching the database, so a bot gets no
 *     signal that it was caught.
 *  2. Zod validates and trims every field; optional fields default to "".
 *  3. Only known columns are inserted, and status is always "new".
 */
export async function submitQuotation(raw: Record<string, unknown>): Promise<QuotationSubmitResult> {
  const honeypot = raw.website;
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { ok: true, id: 0 };
  }

  const parsed = quotationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error.issues) };

  const data = parsed.data;
  const result = await getDb().insert(quotationRequests).values({
    name: data.name,
    company: data.company,
    phone: data.phone,
    email: data.email,
    eventType: data.eventType,
    eventDate: data.eventDate,
    location: data.location,
    guestCount: data.guestCount,
    budgetRange: data.budgetRange,
    message: data.message,
    status: "new",
  });

  const inserted = (result as unknown as Array<{ insertId?: number }>)[0];
  return { ok: true, id: Number(inserted?.insertId ?? 0) };
}

type QuotationRow = typeof quotationRequests.$inferSelect;

function toQuotationRequest(row: QuotationRow): QuotationRequest {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    phone: row.phone,
    email: row.email,
    eventType: row.eventType,
    eventDate: row.eventDate,
    location: row.location,
    guestCount: row.guestCount,
    budgetRange: row.budgetRange,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Newest first. `id` breaks ties so ordering stays stable within one second. */
export async function listQuotationRequests(): Promise<QuotationRequest[]> {
  const rows = await getDb()
    .select()
    .from(quotationRequests)
    .orderBy(desc(quotationRequests.createdAt), desc(quotationRequests.id));
  return rows.map(toQuotationRequest);
}

export async function getQuotationRequest(id: number): Promise<QuotationRequest | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const rows = await getDb().select().from(quotationRequests).where(eq(quotationRequests.id, id)).limit(1);
  return rows[0] ? toQuotationRequest(rows[0]) : null;
}

export type QuotationMutationResult = { ok: true } | { ok: false; error: string };

/** Only the four known statuses are accepted; anything else is refused here too. */
export async function updateQuotationStatus(id: number, status: string): Promise<QuotationMutationResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Permintaan tidak ditemukan." };
  if (!isQuotationStatus(status)) return { ok: false, error: "Status tidak valid." };

  const updated = await getDb()
    .update(quotationRequests)
    .set({ status })
    .where(eq(quotationRequests.id, id));

  return (updated as unknown as { affectedRows?: number }).affectedRows === 0
    ? { ok: false, error: "Permintaan tidak ditemukan." }
    : { ok: true };
}
