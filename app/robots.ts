import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

// SITE_URL is set as a cPanel environment variable at runtime, not during the
// local build, so this must be evaluated per request instead of at build time —
// otherwise the Sitemap line would be baked in empty.
export const dynamic = "force-dynamic";

/**
 * Never infers the host from request headers: behind Passenger those are
 * attacker-controlled. The sitemap line is emitted only when SITE_URL is a valid
 * absolute origin, and the route still returns valid robots.txt without it.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
