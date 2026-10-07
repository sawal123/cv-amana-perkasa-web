export type Stat = { value: string; label: string };

export type SiteSettings = {
  identity: {
    company: string;
    shortName: string;
    initials: string;
    /** Optional official logo under /uploads or /projects. Empty means the initials mark. */
    logo: string;
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
  whyUs: { kicker: string; heading: string; description: string };
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
    /** Copy for the public Request Quotation form. */
    formHeading: string;
    formDescription: string;
    submitLabel: string;
    successHeading: string;
    successDescription: string;
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

/** One "Why Choose Us" card. Numbering is derived from render order, not stored. */
export type WhyChooseUsItem = {
  id: number;
  title: string;
  description: string;
};

export type WorkflowStep = { id: number; no: string; title: string; description: string };

/** A company legality entry. The admin decides which ones exist. */
export type Legality = { id: number; title: string; value: string; description: string };

/** Bentuk utuh yang diterima <SiteShell />: settings + seluruh daftar konten. */
export type SiteContent = {
  settings: SiteSettings;
  services: Service[];
  projects: Project[];
  whyChooseUs: WhyChooseUsItem[];
  team: TeamMember[];
  workflow: WorkflowStep[];
  legalities: Legality[];
};

/**
 * Allowed quotation statuses. Kept here (a dependency-free module) rather than in
 * lib/quotation.ts so client components can import them without pulling the
 * database layer into the browser bundle.
 */
export const QUOTATION_STATUSES = ["new", "contacted", "quoted", "closed"] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

/** Indonesian labels for the admin panel; the database stores the English code. */
export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  new: "Baru",
  contacted: "Sudah Dihubungi",
  quoted: "Penawaran Dikirim",
  closed: "Selesai",
};

/**
 * A submitted quotation request. Deliberately kept out of SiteContent: it is not
 * public content and is only ever read through the admin panel.
 */
export type QuotationRequest = {
  id: number;
  name: string;
  company: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  location: string;
  guestCount: string;
  budgetRange: string;
  message: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SettingsGroup = keyof SiteSettings;

export const SETTINGS_GROUPS: SettingsGroup[] = [
  "identity",
  "hero",
  "about",
  "services",
  "projects",
  "whyUs",
  "process",
  "team",
  "legalities",
  "contact",
  "seo",
];
