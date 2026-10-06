"use client";

import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-500`;
export const btnSecondary = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
export const btnDanger = `${btn} border border-red-200 bg-white text-red-600 hover:bg-red-50`;

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

export function Banner({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function Card({ title, description, children }: { title?: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {title ? <h2 className="text-base font-bold text-slate-900">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className={title ? "mt-5" : ""}>{children}</div>
    </section>
  );
}
