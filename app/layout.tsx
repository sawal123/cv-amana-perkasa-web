import type { Metadata } from "next";
import "./globals.css";
import { loadSettings } from "@/lib/content";

export const dynamic = "force-dynamic";

function absolutize(value: string, base: string) {
  if (/^https?:\/\//.test(value)) return value;
  if (base && value.startsWith("/")) return `${base}${value}`;
  return value;
}

export async function generateMetadata(): Promise<Metadata> {
  const { seo, identity, hero } = await loadSettings();

  const rawCanonical = seo.canonical.trim();
  const base = /^https?:\/\//.test(rawCanonical) ? rawCanonical.replace(/\/+$/, "") : "";
  const keywords = seo.keywords.split(",").map((k) => k.trim()).filter(Boolean);
  const ogImage = seo.ogImage.trim();

  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: seo.title.trim() || `${identity.company} | ${identity.tagline}`,
    description: seo.description.trim() || hero.description,
    ...(keywords.length ? { keywords } : {}),
    applicationName: identity.company,
    authors: [{ name: identity.company }],
    creator: identity.company,
    publisher: identity.company,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: identity.company,
      title: seo.title.trim() || identity.company,
      description: seo.description.trim() || hero.description,
      ...(base ? { url: base } : {}),
      ...(ogImage ? { images: [{ url: absolutize(ogImage, base), alt: identity.company }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: seo.title.trim() || identity.company,
      description: seo.description.trim() || hero.description,
      ...(ogImage ? { images: [absolutize(ogImage, base)] } : {}),
    },
    ...(base ? { alternates: { canonical: base } } : {}),
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
