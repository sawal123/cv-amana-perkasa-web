import type { SiteSettings } from "@/lib/types";
import { serializeJsonLd } from "@/lib/json-ld";
import { absoluteUrl, resolveCanonical } from "@/lib/site-url";

/**
 * Minimal Organization + WebSite JSON-LD for the homepage.
 *
 * Only properties that are reliably configured are emitted — no legal
 * identifiers, founding date, ratings, address, phone or social profiles are
 * invented. When no valid absolute origin is available the block is omitted
 * entirely rather than emitting a relative `url`.
 */
export default function StructuredData({ settings }: { settings: SiteSettings }) {
  const { identity, seo } = settings;
  const site = resolveCanonical(seo.canonical);
  if (!site) return null;

  const logo = absoluteUrl(identity.logo, site);

  const organization: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: identity.company,
    url: site,
  };
  if (logo) organization.logo = logo;

  const website: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: identity.company,
    url: site,
    inLanguage: "id-ID",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(website) }}
      />
    </>
  );
}
