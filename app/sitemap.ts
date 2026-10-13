import type { MetadataRoute } from "next";
import { loadPublishedProjects } from "@/lib/content";
import { projectPath } from "@/lib/project-url";
import { getSiteOrigin } from "@/lib/site-url";

// Evaluated per request, not baked at build time: SITE_URL comes from the cPanel
// runtime environment, so a static prerender would emit an empty sitemap.
export const dynamic = "force-dynamic";

/**
 * Public routes only: the homepage, the project archive, and one URL per
 * published project (built from the same id + title slug the pages use).
 * Unpublished projects are never listed, and admin/api routes stay out.
 *
 * The host comes solely from SITE_URL — never inferred from request headers,
 * which are attacker-controlled behind Passenger — so an invalid value yields an
 * empty sitemap rather than wrong URLs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  if (!origin) return [];

  const projects = await loadPublishedProjects();

  return [
    {
      url: `${origin}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${origin}/projects`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...projects.map((project) => ({
      url: `${origin}${projectPath(project)}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
