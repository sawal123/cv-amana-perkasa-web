import {
  boolean,
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
  image: varchar("image", { length: 500 }).notNull(),
  description: text("description").notNull(),
  position: int("position", { unsigned: true }).notNull().default(0),
  published: boolean("published").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});

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
export type TeamMemberRow = typeof teamMembers.$inferSelect;
export type WorkflowStepRow = typeof workflowSteps.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type AdminUserRow = typeof adminUsers.$inferSelect;
