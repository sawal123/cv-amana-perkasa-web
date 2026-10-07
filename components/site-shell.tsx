"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Project, SiteContent } from "@/lib/types";
import ProjectDetail from "./project-detail";
import QuotationForm from "./quotation-form";
import { ArrowRight, ArrowUpRight, CloseIcon, MenuIcon } from "./icons";

const nav = [
  ["Tentang", "#about"], ["Layanan", "#services"], ["Project", "#projects"], ["Tim", "#team"], ["Kontak", "#contact"],
];

const reveal = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
  transition: { duration: .65, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
};

function BrandMark({ logo, initials, shortName, company }: { logo: string; initials: string; shortName: string; company: string }) {
  if (logo) {
    return <Image src={logo} alt={company} width={180} height={40} className="h-10 w-auto max-w-[180px] object-contain" />;
  }
  return <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 text-sm font-black tracking-tight text-white">{initials}</div><div><div className="text-[11px] font-semibold tracking-[.20em] text-blue-200">CV</div><div className="text-sm font-bold tracking-[.07em] text-white">{shortName}</div></div></div>;
}

export default function SiteShell({ content }: { content: SiteContent }) {
  const { settings, services: serviceList, projects: projectList, whyChooseUs: whyUsList, team: teamList, workflow: workflowList, legalities: legalityList } = content;
  const { identity, hero, about, contact } = settings;

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  useEffect(() => {
    document.body.style.overflow = activeProject || menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeProject, menuOpen]);

  const whatsappDigits = contact.whatsapp.replace(/\D/g, "");

  return <main className="overflow-x-hidden">
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 glass">
      <div className="container-shell flex h-[76px] items-center justify-between">
        <a href="#home" aria-label={identity.company}><BrandMark logo={identity.logo} initials={identity.initials} shortName={identity.shortName} company={identity.company} /></a>
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map(([label, href]) => <a key={label} href={href} className="text-sm font-medium text-slate-200 transition hover:text-white">{label}</a>)}
          <a href="#contact" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#071b35] transition hover:bg-blue-100">{identity.navCta}</a>
        </nav>
        <button onClick={() => setMenuOpen(v => !v)} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white md:hidden" aria-label="Menu">
          {menuOpen ? <CloseIcon className="h-5 w-5"/> : <MenuIcon className="h-5 w-5"/>}
        </button>
      </div>
    </header>

    <AnimatePresence>{menuOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-40 bg-[#041429] pt-28 md:hidden">
      <div className="container-shell flex flex-col gap-4">
        {nav.map(([label, href], i) => <motion.a initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*.05}} key={label} href={href} onClick={() => setMenuOpen(false)} className="border-b border-white/10 py-4 text-2xl font-semibold text-white">{label}</motion.a>)}
      </div>
    </motion.div>}</AnimatePresence>

    <section id="home" className="relative min-h-[790px] bg-[#041429] pt-[76px] text-white">
      <Image src={hero.image} alt={identity.company} fill priority className="object-cover opacity-35" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,20,41,.98)_0%,rgba(4,20,41,.88)_43%,rgba(4,20,41,.28)_100%)]" />
      <div className="absolute inset-0 grid-pattern opacity-40" />
      <div className="container-shell relative flex min-h-[714px] items-center py-20">
        <div className="max-w-3xl">
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.6}} className="mb-6 inline-flex items-center gap-3 rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[.19em] text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> {identity.tagline}
          </motion.div>
          <motion.h1 initial={{opacity:0,y:28}} animate={{opacity:1,y:0}} transition={{duration:.8,delay:.08}} className="text-balance text-[clamp(44px,6.1vw,86px)] font-black leading-[.98] tracking-[-.045em]">{hero.title}</motion.h1>
          <motion.p initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.18}} className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">{hero.description}</motion.p>
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.28}} className="mt-9 flex flex-wrap gap-4">
            <a href="#projects" className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-400">{hero.ctaPrimary} <ArrowRight className="h-4 w-4"/></a>
            <a href="#contact" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">{hero.ctaSecondary} <ArrowUpRight className="h-4 w-4"/></a>
          </motion.div>
        </div>
        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-[10px] font-bold uppercase tracking-[.23em] text-white/50 md:flex"><span className="h-px w-12 bg-white/30"/>{hero.scrollHint}<span className="h-px w-12 bg-white/30"/></div>
      </div>
    </section>

    <section id="about" className="section-pad bg-white">
      <div className="container-shell grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <motion.div {...reveal}><div className="text-xs font-black uppercase tracking-[.20em] text-blue-600">{about.kicker}</div><h2 className="mt-4 text-4xl font-black leading-tight tracking-[-.035em] text-[#071b35] md:text-5xl">{about.heading}</h2></motion.div>
        <motion.div {...reveal} className="lg:pt-8"><p className="text-lg leading-8 text-slate-600">{about.body}</p><div className="mt-9 grid grid-cols-3 gap-3">{about.stats.map((stat,i)=><div key={`${stat.label}-${i}`} className="rounded-2xl bg-[#f3f8fd] p-5"><div className="text-2xl font-black text-[#071b35]">{stat.value}</div><div className="mt-1 text-xs font-semibold text-slate-500">{stat.label}</div></div>)}</div></motion.div>
      </div>
    </section>

    <section id="services" className="section-pad bg-[#071b35] text-white">
      <div className="container-shell">
        <motion.div {...reveal} className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><div className="text-xs font-black uppercase tracking-[.20em] text-blue-300">{settings.services.kicker}</div><h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-.035em] md:text-5xl">{settings.services.heading}</h2></div><p className="max-w-md text-sm leading-7 text-slate-300">{settings.services.description}</p></motion.div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-3">
          {serviceList.map((s,i)=><motion.article {...reveal} transition={{...reveal.transition,delay:i*.04}} key={s.id} className="min-h-64 bg-[#071b35] p-7 transition hover:bg-[#0b2a52]"><div className="flex items-start justify-between"><span className="text-xs font-black tracking-[.16em] text-blue-300">{s.no}</span><ArrowUpRight className="h-5 w-5 text-white/35"/></div><h3 className="mt-16 text-2xl font-bold">{s.title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{s.description}</p></motion.article>)}
        </div>
      </div>
    </section>

    <section id="projects" className="section-pad bg-[#f6f9fc]">
      <div className="container-shell">
        <motion.div {...reveal} className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div><div className="text-xs font-black uppercase tracking-[.20em] text-blue-600">{settings.projects.kicker}</div><h2 className="mt-4 text-4xl font-black tracking-[-.035em] text-[#071b35] md:text-5xl">{settings.projects.heading}</h2></div><p className="max-w-md text-sm leading-7 text-slate-500">{settings.projects.description}</p></motion.div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {projectList.map((p,i)=><motion.button {...reveal} transition={{...reveal.transition,delay:(i%2)*.05}} key={p.id} onClick={()=>setActiveProject(p)} className="project-card group relative aspect-[16/10] overflow-hidden rounded-3xl bg-[#071b35] text-left card-shadow"><Image src={p.image} alt={p.title} fill className="object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-[#041429]/95 via-[#041429]/12 to-transparent"/><div className="absolute inset-x-0 bottom-0 p-6 md:p-8"><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-200">{p.category}</div><div className="mt-2 flex items-end justify-between gap-4"><h3 className="text-2xl font-bold text-white md:text-3xl">{p.title}</h3><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#071b35] transition group-hover:rotate-45"><ArrowUpRight className="h-5 w-5"/></span></div></div></motion.button>)}
        </div>
      </div>
    </section>

    {whyUsList.length > 0 ? <section id="why-us" className="section-pad bg-white">
      <div className="container-shell">
        <motion.div {...reveal} className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div><div className="text-xs font-black uppercase tracking-[.20em] text-blue-600">{settings.whyUs.kicker}</div><h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-.035em] text-[#071b35] md:text-5xl">{settings.whyUs.heading}</h2></div><p className="max-w-md text-sm leading-7 text-slate-500">{settings.whyUs.description}</p></motion.div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {whyUsList.map((item,i)=><motion.article {...reveal} transition={{...reveal.transition,delay:(i%2)*.05}} key={item.id} className="rounded-3xl border border-slate-200 bg-[#f6f9fc] p-7 card-shadow"><div className="text-xs font-black tracking-[.16em] text-blue-600">{String(i+1).padStart(2,"0")}</div><h3 className="mt-5 text-xl font-bold text-[#071b35]">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p></motion.article>)}
        </div>
      </div>
    </section> : null}

    <section id="process" className="section-pad bg-white">
      <div className="container-shell"><motion.div {...reveal}><div className="text-xs font-black uppercase tracking-[.20em] text-blue-600">{settings.process.kicker}</div><h2 className="mt-4 text-4xl font-black tracking-[-.035em] text-[#071b35] md:text-5xl">{settings.process.heading}</h2></motion.div><div className="mt-12 border-t border-slate-200">{workflowList.map((w,i)=><motion.div {...reveal} transition={{...reveal.transition,delay:i*.03}} key={w.id} className="grid gap-4 border-b border-slate-200 py-7 md:grid-cols-[80px_1fr_1.3fr] md:items-center"><div className="text-xs font-black tracking-[.18em] text-blue-600">{w.no}</div><div className="text-xl font-bold text-[#071b35]">{w.title}</div><div className="text-sm leading-7 text-slate-500">{w.description}</div></motion.div>)}</div></div>
    </section>

    <section id="team" className="section-pad bg-[#eef5fb]">
      <div className="container-shell grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-16"><motion.div {...reveal}><div className="text-xs font-black uppercase tracking-[.20em] text-blue-600">{settings.team.kicker}</div><h2 className="mt-4 text-4xl font-black tracking-[-.035em] text-[#071b35] md:text-5xl">{settings.team.heading}</h2><p className="mt-6 max-w-md text-sm leading-7 text-slate-600">{settings.team.description}</p></motion.div><div className="grid gap-4 sm:grid-cols-2">{teamList.map((m,i)=><motion.article {...reveal} transition={{...reveal.transition,delay:i*.06}} key={m.id} className="overflow-hidden rounded-3xl bg-white card-shadow">{m.photo ? <div className="relative aspect-[4/5] w-full bg-slate-100"><Image src={m.photo} alt={m.name} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover"/></div> : null}<div className="p-7">{m.photo ? null : <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#071b35] text-sm font-black text-white">{String(i+1).padStart(2,"0")}</div>}<div className="text-xs font-bold uppercase tracking-[.15em] text-blue-600">{m.role}</div><div className="mt-2 text-xl font-black text-[#071b35]">{m.name}</div><div className="mt-2 text-sm text-slate-500">{m.description}</div></div></motion.article>)}</div></div>
    </section>

    {legalityList.length > 0 ? <section id="legalitas" className="section-pad bg-white">
      <div className="container-shell grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-16"><motion.div {...reveal}><div className="text-xs font-black uppercase tracking-[.20em] text-blue-600">{settings.legalities.kicker}</div><h2 className="mt-4 text-4xl font-black leading-tight tracking-[-.035em] text-[#071b35] md:text-5xl">{settings.legalities.heading}</h2>{settings.legalities.description ? <p className="mt-6 max-w-md text-sm leading-7 text-slate-600">{settings.legalities.description}</p> : null}</motion.div><div className="grid gap-4 sm:grid-cols-2">{legalityList.map((l,i)=><motion.article {...reveal} transition={{...reveal.transition,delay:i*.06}} key={l.id} className="rounded-3xl border border-slate-200 bg-[#f8fbfe] p-7"><div className="text-xs font-bold uppercase tracking-[.15em] text-blue-600">{l.title}</div>{l.value ? <div className="mt-2 text-xl font-black text-[#071b35]">{l.value}</div> : null}{l.description ? <p className="mt-3 text-sm leading-6 text-slate-500">{l.description}</p> : null}</motion.article>)}</div></div>
    </section> : null}

    <section id="contact" className="relative overflow-hidden bg-[#041429] py-24 text-white md:py-32"><div className="absolute inset-0 grid-pattern opacity-50"/><div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[90px]"/><motion.div {...reveal} className="container-shell relative"><div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16"><div><div className="text-xs font-black uppercase tracking-[.20em] text-blue-300">{contact.kicker}</div><h2 className="mt-5 max-w-xl text-balance text-4xl font-black leading-[1.05] tracking-[-.04em] md:text-5xl">{contact.heading}</h2><p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">{contact.description}</p><div className="mt-10 flex flex-wrap gap-3">{contact.email ? <a href={`mailto:${contact.email}`} className="rounded-full bg-white px-6 py-3.5 text-sm font-black text-[#071b35] transition hover:bg-blue-100">{contact.email}</a> : null}{contact.phone ? <a href={`tel:${contact.phone.replace(/[^+0-9]/g, "")}`} className="rounded-full border border-white/15 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">{contact.phone}</a> : null}{whatsappDigits ? <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-blue-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-400">WhatsApp</a> : null}</div>{contact.address ? <div className="mt-8 max-w-md text-sm leading-6 text-slate-400">{contact.address}</div> : null}</div><QuotationForm whatsappDigits={whatsappDigits} copy={{ formHeading: contact.formHeading, formDescription: contact.formDescription, submitLabel: contact.submitLabel, successHeading: contact.successHeading, successDescription: contact.successDescription }} /></div></motion.div></section>

    <footer className="bg-[#031020] py-10 text-white"><div className="container-shell flex flex-col justify-between gap-8 md:flex-row md:items-end"><BrandMark logo={identity.logo} initials={identity.initials} shortName={identity.shortName} company={identity.company} /><div className="text-sm leading-6 text-slate-400 md:text-right"><div>{contact.address}</div><div className="mt-1">{contact.instagram}</div><div className="mt-5 text-xs text-slate-500">© {new Date().getFullYear()} {identity.company}. {identity.copyright}</div></div></div></footer>

    <AnimatePresence>{activeProject && <ProjectDetail project={activeProject} onClose={()=>setActiveProject(null)} />}</AnimatePresence>
  </main>;
}
