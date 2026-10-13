import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicFooter from "@/components/public-footer";
import PublicHeader from "@/components/public-header";
import { ArrowRight } from "@/components/icons";
import { loadPublishedProjects, loadSettings } from "@/lib/content";
import { projectPath } from "@/lib/project-url";
import { shortenDescription } from "@/lib/seo-text";
import { absoluteUrl, resolveCanonical } from "@/lib/site-url";

// Database-driven, like the homepage: an admin edit shows up on the next request.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { identity, projects, seo } = await loadSettings();
  const title = `Projects | ${identity.company}`;
  const description = shortenDescription(projects.description || seo.description || identity.tagline);
  const origin = resolveCanonical(seo.canonical);
  const canonical = absoluteUrl("/projects", origin);
  const ogImage = absoluteUrl(seo.ogImage, origin);

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: "website",
      siteName: identity.company,
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(ogImage ? { images: [{ url: ogImage, alt: identity.company }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function ProjectsPage() {
  const [settings, projects] = await Promise.all([loadSettings(), loadPublishedProjects()]);
  const { identity, contact, projects: copy } = settings;

  return (
    <main className="overflow-x-hidden bg-white">
      <PublicHeader identity={identity} />

      <section className="relative bg-[#041429] pt-[76px] text-white">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[90px]" />
        <div className="container-shell relative py-20 md:py-24">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold tracking-wide text-slate-400">
            <Link href="/" className="transition hover:text-white">Beranda</Link>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-blue-200">Projects</span>
          </nav>
          <div className="mt-6 text-xs font-black uppercase tracking-[.20em] text-blue-300">{copy.kicker}</div>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-black leading-[1.03] tracking-[-.04em] md:text-6xl">{copy.heading}</h1>
          {copy.description ? <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{copy.description}</p> : null}
        </div>
      </section>

      {projects.length > 0 ? (
        <section className="section-pad bg-[#f6f9fc]">
          <div className="container-shell grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article key={project.id} className="project-card group flex flex-col overflow-hidden rounded-3xl bg-white card-shadow">
                <Link href={projectPath(project)} aria-label={`Lihat project ${project.title}`} className="relative block aspect-[16/10] overflow-hidden bg-[#071b35]">
                  <Image src={project.image} alt={project.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                </Link>
                <div className="flex flex-1 flex-col p-6">
                  {project.category || project.year ? (
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.18em] text-blue-600">
                      {project.category ? <span>{project.category}</span> : null}
                      {project.year ? <span className="text-slate-400">{project.year}</span> : null}
                    </div>
                  ) : null}
                  <h2 className="mt-3 text-xl font-black tracking-[-.02em] text-[#071b35] md:text-2xl">
                    <Link href={projectPath(project)} className="transition hover:text-blue-600">{project.title}</Link>
                  </h2>
                  {project.description ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{project.description}</p> : null}
                  <Link href={projectPath(project)} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition group-hover:gap-3 hover:text-blue-700">
                    Lihat Project <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <PublicFooter identity={identity} contact={contact} />
    </main>
  );
}
