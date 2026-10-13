"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { NavIcon, type IconName } from "./icons";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimaryTone = "bg-blue-600 text-white shadow-sm hover:bg-blue-500";
const btnSecondaryTone = "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900";
const btnDangerTone = "border border-red-200 bg-white text-red-600 hover:bg-red-50";

/** Sizing lives on each variant, so a small variant never fights a base padding. */
export const btn = btnBase;
export const btnPrimary = `${btnBase} ${btnPrimaryTone} px-3.5 py-2 text-sm`;
export const btnSecondary = `${btnBase} ${btnSecondaryTone} px-3.5 py-2 text-sm`;
export const btnDanger = `${btnBase} ${btnDangerTone} px-3.5 py-2 text-sm`;
export const btnPrimarySm = `${btnBase} ${btnPrimaryTone} px-2.5 py-1.5 text-xs`;
export const btnSecondarySm = `${btnBase} ${btnSecondaryTone} px-2.5 py-1.5 text-xs`;
export const btnDangerSm = `${btnBase} ${btnDangerTone} px-2.5 py-1.5 text-xs`;
export const btnIconSm = `${btnBase} ${btnSecondaryTone} h-8 w-8 p-0`;

export function Field({
  label,
  help,
  error,
  htmlFor,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {help && !error ? <p className="mt-1.5 text-xs text-slate-400">{help}</p> : null}
      {error ? <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

const BANNER_TONES = {
  error: { box: "border-red-200 bg-red-50 text-red-700", icon: "alert" as IconName },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: "check" as IconName },
  info: { box: "border-blue-200 bg-blue-50 text-blue-700", icon: "info" as IconName },
} as const;

export function Banner({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const { box, icon } = BANNER_TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${box}`}>
      <NavIcon name={icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      ) : null}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const BADGE_TONES = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
        <NavIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  published,
  total,
  href,
}: {
  icon: IconName;
  label: string;
  published: number;
  total: number;
  href: string;
}) {
  const pct = total > 0 ? Math.round((published / total) * 100) : 0;

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          <NavIcon name={icon} className="h-5 w-5" />
        </span>
        <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{published}</div>
      <div className="mt-1 text-xs text-slate-500">{total > 0 ? `${published} dari ${total} tayang` : "Belum ada konten"}</div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-all group-hover:gap-2">
        Kelola <NavIcon name="arrowRight" className="h-4 w-4" />
      </div>
    </Link>
  );
}

export function ActionCard({
  icon,
  title,
  description,
  href,
  external = false,
}: {
  icon: IconName;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) {
  const className =
    "group flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

  const inner = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
        <NavIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          {title}
          {external ? <NavIcon name="external" className="h-3.5 w-3.5 text-slate-400" /> : null}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
    </>
  );

  return external ? (
    <a href={href} className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
