import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

// Evaluated per request, not baked at build time: SITE_URL comes from the cPanel
// runtime environment, so a static prerender would emit an empty sitemap.
export const dynamic = "force-dynamic";

/**
 * The public site has exactly one canonical route: `/`. Projects are modal
 * content, not routed pages, so there are no project detail URLs to invent — and
 * admin, api and login routes are deliberately absent.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  if (!origin) return [];

  return [
    {
      url: `${origin}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
