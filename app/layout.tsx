import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV AMANA PERKASA | Event Service & Creative Production",
  description: "Company profile CV AMANA PERKASA — pelayanan jasa event, produksi kreatif, dan event management.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
