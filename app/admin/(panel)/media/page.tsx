import MediaManager from "@/components/admin/media-manager";
import { MAX_UPLOAD_BYTES, listMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const items = await listMedia().catch(() => []);

  return <MediaManager items={items} maxBytes={MAX_UPLOAD_BYTES} uploadDirHint="public/uploads" />;
}
