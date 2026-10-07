import { notFound } from "next/navigation";
import GalleryManager from "@/components/admin/gallery-manager";
import { listGallery } from "@/lib/admin/gallery";
import { findRow } from "@/lib/admin/store";
import { listMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function ProjectGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();

  const project = await findRow("projects", projectId);
  if (!project) notFound();

  const [images, media] = await Promise.all([listGallery(projectId), listMedia().catch(() => [])]);

  return (
    <GalleryManager
      projectId={projectId}
      projectTitle={project.values.title}
      images={images.map((row) => ({ id: row.id, image: row.image, caption: row.caption }))}
      media={media.map((item) => ({ path: item.path, alt: item.alt }))}
    />
  );
}
