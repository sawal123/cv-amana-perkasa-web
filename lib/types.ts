export type Stat = { value: string; label: string };

export type SiteSettings = {
  identity: {
    company: string;
    shortName: string;
    initials: string;
    tagline: string;
    navCta: string;
    copyright: string;
  };
  hero: {
    title: string;
    description: string;
    image: string;
    ctaPrimary: string;
    ctaSecondary: string;
    scrollHint: string;
  };
  about: {
    kicker: string;
    heading: string;
    body: string;
    stats: Stat[];
  };
  services: { kicker: string; heading: string; description: string };
  projects: { kicker: string; heading: string; description: string };
  process: { kicker: string; heading: string };
  team: { kicker: string; heading: string; description: string };
  legalities: { kicker: string; heading: string; description: string };
  contact: {
    kicker: string;
    heading: string;
    description: string;
    phone: string;
    email: string;
    address: string;
    instagram: string;
    whatsapp: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
    canonical: string;
  };
};

export type Service = { id: number; no: string; title: string; description: string };

/** One image in a project's gallery. The cover stays in Project.image. */
export type GalleryImage = { id: number; image: string; caption: string };

export type Project = {
  id: number;
  title: string;
  category: string;
  image: string;
  description: string;
  /** The four below are optional metadata: empty strings mean "not set". */
  client: string;
  location: string;
  year: string;
  scope: string;
  gallery: GalleryImage[];
};

export type TeamMember = {
  id: number;
  role: string;
  name: string;
  description: string;
  photo: string;
};

export type WorkflowStep = { id: number; no: string; title: string; description: string };

/** A company legality entry. The admin decides which ones exist. */
export type Legality = { id: number; title: string; value: string; description: string };

/** Bentuk utuh yang diterima <SiteShell />: settings + seluruh daftar konten. */
export type SiteContent = {
  settings: SiteSettings;
  services: Service[];
  projects: Project[];
  team: TeamMember[];
  workflow: WorkflowStep[];
  legalities: Legality[];
};

export type SettingsGroup = keyof SiteSettings;

export const SETTINGS_GROUPS: SettingsGroup[] = [
  "identity",
  "hero",
  "about",
  "services",
  "projects",
  "process",
  "team",
  "legalities",
  "contact",
  "seo",
];
