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
    <main className="grid min-h-screen place-items-center bg-[#041429] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-sm font-black tracking-tight text-white">
            AP
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">CV AMANA PERKASA</div>
          <h1 className="mt-1 text-xl font-bold text-white">Admin Console</h1>
        </div>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
