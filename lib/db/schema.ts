import {
  boolean,
  foreignKey,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
  text,
} from "drizzle-orm/mysql-core";

/**
 * Every content table shares the same shape: id, display fields, `position`
 * for manual ordering and `published` for soft hide. New content types should
 * follow it so the admin pages and seed script stay uniform.
 *
 * TEXT columns deliberately carry no DEFAULT: MariaDB and MySQL <8.0.13 reject
 * defaults on TEXT/BLOB, and the generated SQL is meant to import cleanly from
 * phpMyAdmin on any shared host. Writers must always supply `description`
 * explicitly (the zod schemas in app/admin/actions.ts guarantee "").
 */

export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

export const services = mysqlTable("services", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  no: varchar("no", { length: 4 }).notNull().default(""),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description").notNull(),
  position: int("position", { unsigned: true }).notNull().default(0),
  published: boolean("published").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

export const projects = mysqlTable("projects", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  title: varchar("title", { length: 150 }).notNull(),
  category: varchar("category", { length: 80 }).notNull().default(""),
  /** Cover / thumbnail. Stays a single value — gallery lives in project_images. */
  image: varchar("image", { length: 500 }).notNull(),
  description: text("description").notNull(),
  client: varchar("client", { length: 150 }).notNull().default(""),
  location: varchar("location", { length: 150 }).notNull().default(""),
  /** Kept as text on purpose: a display year (or "2023/2024"), not a date system. */
  year: varchar("year", { length: 9 }).notNull().default(""),
  /**
   * Newline-separated list of work items. A plain varchar with a default keeps
   * this compatible with MariaDB and MySQL <8.0.13, which reject TEXT defaults,
   * and avoids introducing a tag table for what is only a short bullet list.
   */
  scope: varchar("scope", { length: 1000 }).notNull().default(""),
  /**
   * Optional case-study narrative. VARCHAR with a default rather than TEXT so the
   * ALTER in migration 0003 is portable across MySQL/MariaDB and existing rows get
   * "" without a separate backfill.
   */
  objective: varchar("objective", { length: 2000 }).notNull().default(""),
  approach: varchar("approach", { length: 2000 }).notNull().default(""),
  outcome: varchar("outcome", { length: 2000 }).notNull().default(""),
  position: int("position", { unsigned: true }).notNull().default(0),
  published: boolean("published").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

/**
 * Gallery images for a project. The foreign key cascades, so deleting a project
 * can never leave orphaned gallery rows behind. Media files themselves are never
 * deleted here — the same image may be referenced from elsewhere.
 */
export const projectImages = mysqlTable(
  "project_images",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    projectId: int("project_id", { unsigned: true }).notNull(),
    image: varchar("image", { length: 500 }).notNull(),
    caption: varchar("caption", { length: 255 }).notNull().default(""),
    position: int("position", { unsigned: true }).notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "project_images_project_fk",
    }).onDelete("cascade"),
  ],
);

export const teamMembers = mysqlTable("team_members", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  role: varchar("role", { length: 100 }).notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description").notNull(),
  photo: varchar("photo", { length: 500 }).notNull().default(""),
  position: int("position", { unsigned: true }).notNull().default(0),
  published: boolean("published").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

export const workflowSteps = mysqlTable("workflow_steps", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  no: varchar("no", { length: 4 }).notNull().default(""),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description").notNull(),
  position: int("position", { unsigned: true }).notNull().default(0),
  published: boolean("published").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

export const companyLegalities = mysqlTable("company_legalities", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  /** Free text: the admin decides which legalities exist (NIB, NPWP, Akta, ...). */
  title: varchar("title", { length: 150 }).notNull(),
  value: varchar("value", { length: 150 }).notNull().default(""),
  description: text("description").notNull(),
  position: int("position", { unsigned: true }).notNull().default(0),
  published: boolean("published").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

export const whyChooseUs = mysqlTable("why_choose_us", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description").notNull(),
  position: int("position", { unsigned: true }).notNull().default(0),
  published: boolean("published").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

/**
 * Clients / partners shown as social proof. The logo is optional: when it is empty
 * the public grid falls back to the name. No rows are seeded — the admin adds only
 * companies that actually worked with CV AMANA PERKASA.
 */
export const clientsPartners = mysqlTable("clients_partners", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  logo: varchar("logo", { length: 500 }).notNull().default(""),
  position: int("position", { unsigned: true }).notNull().default(0),
  published: boolean("published").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

/**
 * Client testimonials. `project` is free-text context (e.g. "Product Launch"),
 * deliberately not a foreign key: a testimonial may reference work that is not in
 * the public portfolio. No rows are seeded.
 */
export const testimonials = mysqlTable("testimonials", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  quote: text("quote").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  role: varchar("role", { length: 150 }).notNull().default(""),
  company: varchar("company", { length: 150 }).notNull().default(""),
  project: varchar("project", { length: 150 }).notNull().default(""),
  photo: varchar("photo", { length: 500 }).notNull().default(""),
  position: int("position", { unsigned: true }).notNull().default(0),
  published: boolean("published").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

/**
 * Inbound quotation requests from the public form. Not a content table: rows are
 * written by visitors, never seeded, and read only through the admin panel.
 * `status` is a plain varchar (no ENUM) so it stays portable across
 * MySQL/MariaDB on shared hosting; the four allowed values are enforced in code.
 */
export const quotationRequests = mysqlTable("quotation_requests", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  company: varchar("company", { length: 150 }).notNull().default(""),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 190 }).notNull().default(""),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  /** Display date kept as a string for the same reason as projects.year. */
  eventDate: varchar("event_date", { length: 10 }).notNull().default(""),
  location: varchar("location", { length: 255 }).notNull().default(""),
  guestCount: varchar("guest_count", { length: 50 }).notNull().default(""),
  budgetRange: varchar("budget_range", { length: 100 }).notNull().default(""),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

export const media = mysqlTable("media", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  /** Original upload name, kept for reference only — never used to build a path. */
  filename: varchar("filename", { length: 255 }).notNull(),
  /** Public URL the site loads, e.g. /uploads/<uuid>.png */
  path: varchar("path", { length: 500 }).notNull(),
  mime: varchar("mime", { length: 80 }).notNull(),
  size: int("size", { unsigned: true }).notNull().default(0),
  alt: varchar("alt", { length: 255 }).notNull().default(""),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const adminUsers = mysqlTable("admin_users", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  username: varchar("username", { length: 80 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => [uniqueIndex("admin_users_username_uq").on(table.username)]);

export type SettingRow = typeof settings.$inferSelect;
export type ServiceRow = typeof services.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectImageRow = typeof projectImages.$inferSelect;
export type TeamMemberRow = typeof teamMembers.$inferSelect;
export type WorkflowStepRow = typeof workflowSteps.$inferSelect;
export type CompanyLegalityRow = typeof companyLegalities.$inferSelect;
export type WhyChooseUsRow = typeof whyChooseUs.$inferSelect;
export type ClientPartnerRow = typeof clientsPartners.$inferSelect;
export type TestimonialRow = typeof testimonials.$inferSelect;
export type QuotationRequestRow = typeof quotationRequests.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type AdminUserRow = typeof adminUsers.$inferSelect;
