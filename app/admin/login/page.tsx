import type { Metadata } from "next";
import LoginForm from "@/components/admin/login-form";
import { Card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk — Admin CV AMANA PERKASA",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">CV Amana Perkasa</div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Panel Admin</h1>
        </div>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
