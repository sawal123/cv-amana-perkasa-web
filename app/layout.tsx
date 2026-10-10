import type { Metadata } from "next";
import "./globals.css";
import { loadSettings } from "@/lib/content";
import { absoluteUrl, resolveCanonical } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { seo, identity, hero } = await loadSettings();

  // Priority: valid CMS canonical → valid SITE_URL → omit. A malformed value —
  // including one that merely starts with `http://` — resolves to null and is
  // dropped, so it can never throw here and 500 the homepage.
  const canonical = resolveCanonical(seo.canonical);
  const keywords = seo.keywords.split(",").map((k) => k.trim()).filter(Boolean);
  const ogImage = absoluteUrl(seo.ogImage, canonical);
  const title = seo.title.trim() || `${identity.company} | ${identity.tagline}`;
  const description = seo.description.trim() || hero.description;

  return {
    ...(canonical ? { metadataBase: new URL(canonical) } : {}),
    title,
    description,
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
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(ogImage ? { images: [{ url: ogImage, alt: identity.company }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: seo.title.trim() || identity.company,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...(canonical ? { alternates: { canonical } } : {}),
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
