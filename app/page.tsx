import SiteShell from "@/components/site-shell";
import { loadContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await loadContent();
  return <SiteShell content={content} />;
}
