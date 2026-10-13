import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ProjectGallery from "@/components/project-gallery";
import PublicFooter from "@/components/public-footer";
import PublicHeader from "@/components/public-header";
import { ArrowRight } from "@/components/icons";
import { loadPublishedProjectById, loadPublishedProjects, loadSettings } from "@/lib/content";
import { parseProjectParam, projectPath } from "@/lib/project-url";
import { shortenDescription } from "@/lib/seo-text";
import { absoluteUrl, resolveCanonical } from "@/lib/site-url";

// Database-driven: a hidden or renamed project takes effect on the next request.
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ project: string }> };

/** Requested segment -> published project, or null (which becomes a 404). */
async function resolveProject(param: string) {
  const id = parseProjectParam(param);
  if (id === null) return null;
  return loadPublishedProjectById(id);
}

/** Splits the newline-separated scope field into display items. */
function scopeItems(scope: string): string[] {
  return scope.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[#071b35]">{value}</dd>
    </div>
  );
}

function CaseBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-white p-7 card-shadow">
      <h3 className="text-xs font-bold uppercase tracking-[.15em] text-blue-600">{title}</h3>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{body}</p>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { project: param } = await params;
  const [project, { identity, seo }] = await Promise.all([resolveProject(param), loadSettings()]);

  if (!project) {
    return {
      title: `Project tidak ditemukan | ${identity.company}`,
      robots: { index: false, follow: false },
    };
  }

  const title = `${project.title} | ${identity.company}`;
  const description = shortenDescription(project.description || seo.description || identity.tagline);
  const origin = resolveCanonical(seo.canonical);
  const canonical = absoluteUrl(projectPath(project), origin);
  const ogImage = absoluteUrl(project.image, origin);

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: "article",
      siteName: identity.company,
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(ogImage ? { images: [{ url: ogImage, alt: project.title }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { project: param } = await params;
  const project = await resolveProject(param);
  if (!project) notFound();

  // A slug-less or stale slug still resolves by id, then bounces permanently to
  // the current canonical path so renaming a project never breaks old links.
  const canonicalPath = projectPath(project);
  if (`/projects/${param}` !== canonicalPath) permanentRedirect(canonicalPath);

  const [settings, allProjects] = await Promise.all([loadSettings(), loadPublishedProjects()]);
  const { identity, contact } = settings;
  const whatsappDigits = contact.whatsapp.replace(/\D/g, "");

  const scope = scopeItems(project.scope);
  const hasInfo = Boolean(project.client || project.location || project.year);
  const hasCaseStudy = Boolean(project.objective || project.approach || project.outcome);

  // Same category first, otherwise the CMS order — stable sort keeps position.
  const related = allProjects
    .filter((item) => item.id !== project.id)
    .sort((a, b) => {
      const aMatch = a.category && a.category === project.category ? 1 : 0;
      const bMatch = b.category && b.category === project.category ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, 3);

  return (
    <main className="overflow-x-hidden bg-white">
      <PublicHeader identity={identity} />

      <section className="relative bg-[#041429] pt-[76px] text-white">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[90px]" />
        <div className="container-shell relative py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold tracking-wide text-slate-400">
            <Link href="/" className="transition hover:text-white">Beranda</Link>
            <span className="mx-2 text-slate-600">/</span>
            <Link href="/projects" className="transition hover:text-white">Projects</Link>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-blue-200">{project.title}</span>
          </nav>
        </div>

        <div className="container-shell relative pb-16 md:pb-20">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-[#071b35] md:aspect-[21/9]">
            <Image src={project.image} alt={project.title} fill priority sizes="(max-width: 1024px) 100vw, 1180px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#041429]/92 via-[#041429]/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
              {project.category ? <div className="text-[10px] font-black uppercase tracking-[.20em] text-blue-200">{project.category}</div> : null}
              <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <h1 className="max-w-3xl text-balance text-3xl font-black leading-tight tracking-[-.035em] md:text-5xl">{project.title}</h1>
                {project.year ? <div className="text-sm font-black tracking-wide text-blue-200">{project.year}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {project.description || scope.length > 0 || hasInfo ? (
        <section className="section-pad bg-white">
          <div className="container-shell grid gap-12 lg:grid-cols-[1.4fr_.6fr] lg:gap-16">
            <div>
              {project.description ? (
                <div>
                  <h2 className="text-xs font-black uppercase tracking-[.20em] text-blue-600">Deskripsi</h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-700">{project.description}</p>
                </div>
              ) : null}

              {scope.length > 0 ? (
                <div className={project.description ? "mt-12" : ""}>
                  <h2 className="text-xs font-black uppercase tracking-[.20em] text-blue-600">Scope Pekerjaan</h2>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {scope.map((item) => (
                      <li key={item} className="flex items-start gap-3 rounded-2xl bg-[#f6f9fc] p-4 text-sm font-semibold leading-6 text-[#071b35]">
                        <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {hasInfo ? (
              <aside>
                <dl className="grid gap-5 rounded-3xl border border-slate-200 bg-[#f8fbfe] p-7">
                  {project.client ? <Meta label="Client" value={project.client} /> : null}
                  {project.location ? <Meta label="Lokasi" value={project.location} /> : null}
                  {project.year ? <Meta label="Tahun" value={project.year} /> : null}
                </dl>
              </aside>
            ) : null}
          </div>
        </section>
      ) : null}

      {hasCaseStudy ? (
        <section className="section-pad bg-[#f6f9fc]">
          <div className="container-shell">
            <h2 className="text-xs font-black uppercase tracking-[.20em] text-blue-600">Case Study</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {project.objective ? <CaseBlock title="Tujuan / Challenge" body={project.objective} /> : null}
              {project.approach ? <CaseBlock title="Pendekatan" body={project.approach} /> : null}
              {project.outcome ? <CaseBlock title="Hasil / Outcome" body={project.outcome} /> : null}
            </div>
          </div>
        </section>
      ) : null}

      {project.gallery.length > 0 ? (
        <section className="section-pad bg-white">
          <div className="container-shell">
            <h2 className="text-xs font-black uppercase tracking-[.20em] text-blue-600">Galeri</h2>
            <div className="mt-6">
              <ProjectGallery title={project.title} images={project.gallery} />
            </div>
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden bg-[#041429] py-20 text-white md:py-24">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[90px]" />
        <div className="container-shell relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <div className="text-xs font-black uppercase tracking-[.20em] text-blue-300">{contact.kicker}</div>
            <h2 className="mt-4 max-w-xl text-balance text-3xl font-black leading-tight tracking-[-.03em] md:text-4xl">{contact.heading}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {whatsappDigits ? <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-blue-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-400">WhatsApp</a> : null}
            <Link href="/#contact" className="rounded-full bg-white px-6 py-3.5 text-sm font-black text-[#071b35] transition hover:bg-blue-100">{identity.navCta}</Link>
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="section-pad bg-[#f6f9fc]">
          <div className="container-shell">
            <div className="flex items-end justify-between gap-6">
              <h2 className="text-2xl font-black tracking-[-.03em] text-[#071b35] md:text-3xl">Project Lainnya</h2>
              <Link href="/projects" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-700">Semua Project <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Link key={item.id} href={projectPath(item)} className="project-card group block overflow-hidden rounded-3xl bg-white card-shadow">
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#071b35]">
                    <Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                  </div>
                  <div className="p-5">
                    {item.category || item.year ? (
                      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.18em] text-blue-600">
                        {item.category ? <span>{item.category}</span> : null}
                        {item.year ? <span className="text-slate-400">{item.year}</span> : null}
                      </div>
                    ) : null}
                    <h3 className="mt-2 text-lg font-bold text-[#071b35] transition group-hover:text-blue-600">{item.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <PublicFooter identity={identity} contact={contact} />
    </main>
  );
}
