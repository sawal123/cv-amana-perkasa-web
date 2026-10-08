import SiteShell from "@/components/site-shell";
import StructuredData from "@/components/structured-data";
import { loadContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await loadContent();
  return (
    <>
      <StructuredData settings={content.settings} />
      <SiteShell content={content} />
    </>
  );
}
