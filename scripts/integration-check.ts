/**
 * Integration checks for the parts an HTTP probe cannot reach: the seeded admin
 * credentials, content CRUD, upload validation, and the settings merge.
 *
 *   npm run db:migrate && npm run db:seed
 *   npx tsx --env-file=.env scripts/integration-check.ts
 *
 * Needs DATABASE_URL. Creates its own rows and files and removes them again.
 */
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { defaultContent } from "@/data/site";
import { adminUsers, quotationRequests, settings as settingsTable } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  addGalleryImage,
  deleteGalleryImage,
  listGallery,
  moveGalleryImage,
  setGalleryCaption,
} from "@/lib/admin/gallery";
import * as store from "@/lib/admin/store";
import { loadContent } from "@/lib/content";
import { MAX_UPLOAD_BYTES, listMedia, mediaUsage, removeMedia, saveUpload, uploadDir } from "@/lib/media";
import { TABLES, type Payload } from "@/lib/admin/fields";
import { SETTINGS_SCHEMA_BY_GROUP } from "@/lib/admin/settings-fields";
import {
  getQuotationRequest,
  isQuotationStatus,
  listQuotationRequests,
  submitQuotation,
  toWhatsAppNumber,
  updateQuotationStatus,
} from "@/lib/quotation";
import { SETTINGS_GROUPS } from "@/lib/types";
import { absoluteUrl, getSiteOrigin, parseHttpUrl, resolveCanonical } from "@/lib/site-url";
import { escapeJsonForScript, serializeJsonLd } from "@/lib/json-ld";
import {
  checkConfig,
  checkDatabaseReachable,
  checkSchema,
  checkUploadsWritable,
  isProductionSiteOrigin,
  runHealthChecks,
} from "@/lib/health";

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  console.log(`${condition ? "  ok  " : "  FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures += 1;
}

/** True when the call rejects — used for validators that throw by design. */
async function rejects(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return false;
  } catch {
    return true;
  }
}

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fakeFile(name: string, data: Buffer, type: string) {
  // Node 22 types reject Buffer/Uint8Array<ArrayBufferLike> as BlobPart, so copy
  // into a fresh ArrayBuffer rather than aliasing the pooled buffer.
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return new File([buffer], name, { type });
}

async function main() {
  // ------------------------------------------------------------ credentials
  const db = getDb();
  const [admin] = await db.select().from(adminUsers).limit(1);
  check("seed created an admin user", !!admin);

  if (admin) {
    check("stored hash uses the scrypt scheme", admin.passwordHash.startsWith("scrypt:"));
    check("hash fits the varchar(255) column", admin.passwordHash.length <= 255, `len=${admin.passwordHash.length}`);
    check("seeded password verifies", await verifyPassword(process.env.ADMIN_PASSWORD ?? "", admin.passwordHash));
    check("wrong password rejected", !(await verifyPassword("salah-password", admin.passwordHash)));
    check(
      "tampered hash rejected",
      !(await verifyPassword(process.env.ADMIN_PASSWORD ?? "", admin.passwordHash.replace(/.$/, "0"))),
    );
    check("non-scrypt stored value rejected", !(await verifyPassword("x", "plaintext:secret")));
  }

  // Two hashes of the same password must differ (random salt).
  const [h1, h2] = await Promise.all([hashPassword("sama-sama"), hashPassword("sama-sama")]);
  check("hashing is salted", h1 !== h2 && (await verifyPassword("sama-sama", h1)) && (await verifyPassword("sama-sama", h2)));

  // ------------------------------------------------------------------ CRUD
  const draft: Payload = { no: "99", title: "TEST BARIS CRUD", description: "Dibuat oleh integration check." };

  const before = await store.listRows("services");
  await store.saveRow("services", draft);
  const afterInsert = await store.listRows("services");
  check("insert appends a row", afterInsert.length === before.length + 1);

  const created = afterInsert.find((row) => row.values.title === "TEST BARIS CRUD");
  check("new row lands last", !!created && created.position === Math.max(...afterInsert.map((r) => r.position)));
  check("new row is published by default", created?.published === true);

  if (created) {
    await store.moveRow("services", created.id, -1);
    const moved = await store.listRows("services");
    check("move up changes order", moved[moved.length - 2].id === created.id);

    await store.setPublished("services", created.id, false);
    const hidden = await loadContent();
    check("unpublished row leaves the public site", !hidden.services.some((s) => s.title === "TEST BARIS CRUD"));

    await store.setPublished("services", created.id, true);
    const shown = await loadContent();
    check("republished row returns", shown.services.some((s) => s.id === created.id));

    // Positions must stay dense after the shuffle.
    const dense = await store.listRows("services");
    check(
      "positions stay dense 1..n",
      dense.every((row, index) => row.position === index + 1),
      dense.map((r) => r.position).join(","),
    );

    await store.deleteRow("services", created.id);
    check("delete removes the row", (await store.listRows("services")).length === before.length);
  }

  // Missing required field must be refused before it reaches MySQL.
  const invalid = await store.saveRow("services", { no: "1", title: "", description: "x" } as Payload).then(
    () => "no-error" as const,
    (error: Error) => error,
  );
  check("empty required title is rejected", invalid instanceof Error, String(invalid).slice(0, 60));

  // Unknown column must not be smuggled into the UPDATE.
  const smuggled = await store
    .saveRow("services", { title: "X", description: "Y", published: "1", id: "1" } as unknown as Payload)
    .then(() => "no-error" as const, (error: Error) => error);
  check("unknown payload keys are rejected", smuggled instanceof Error, String(smuggled).slice(0, 60));

  // ------------------------------------------------- project gallery + metadata
  // A throwaway project keeps these checks from touching the seeded rows.
  const PROJECT: Payload = {
    title: "TEST PROJECT GALERI",
    category: "Uji",
    image: "/projects/corporate-conference.png",
    description: "Dibuat oleh integration check.",
    client: "Klien Uji",
    location: "Jakarta",
    year: "2024",
    scope: "Event Management\nSound System",
  };

  await store.saveRow("projects", PROJECT);
  const testProject = (await store.listRows("projects")).find((row) => row.values.title === "TEST PROJECT GALERI");
  check("project with metadata is created", !!testProject);

  const projectId = testProject?.id ?? 0;

  if (testProject) {
    check("metadata round-trips through MySQL", testProject.values.client === "Klien Uji" && testProject.values.year === "2024");
    check("scope keeps its newlines", testProject.values.scope.includes("\n"));

    // No gallery yet: this is the "0..N" lower bound and must not error.
    const emptyGallery = await listGallery(projectId);
    check("new project starts with an empty gallery", emptyGallery.length === 0);

    const noGallery = await loadContent();
    const plainProject = noGallery.projects.find((p) => p.id === projectId);
    check("project without gallery renders with gallery: []", plainProject?.gallery.length === 0);

    // Gallery entries have to be real media, so upload three files first.
    const uploads: Array<{ id: number; path: string }> = [];
    for (let index = 1; index <= 3; index += 1) {
      const uploaded = await saveUpload(
        fakeFile(`galeri-${index}.png`, Buffer.concat([PNG_HEADER, Buffer.alloc(32 + index)]), "image/png"),
        `Galeri ${index}`,
      );
      if (uploaded.ok) uploads.push({ id: uploaded.item.id, path: uploaded.item.path });
    }
    check("three media files uploaded for the gallery", uploads.length === 3, `uploads=${uploads.length}`);

    // One image.
    const one = await addGalleryImage(projectId, uploads[0].path, "Satu");
    check("gallery accepts an existing media path", one.ok, one.ok ? "" : one.error);
    check("gallery holds exactly one image", (await listGallery(projectId)).length === 1);

    // Several, and order must follow insertion.
    await addGalleryImage(projectId, uploads[1].path, "Dua");
    await addGalleryImage(projectId, uploads[2].path, "Tiga");
    const three = await listGallery(projectId);
    check("gallery holds three images", three.length === 3);
    check("gallery order follows insertion", three.map((g) => g.caption).join(",") === "Satu,Dua,Tiga");
    check("gallery positions are dense 1..n", three.every((g, i) => g.position === i + 1));
    check("gallery reaches the public content", (await loadContent()).projects.find((p) => p.id === projectId)?.gallery.length === 3);

    // Reorder.
    await moveGalleryImage(three[2].id, -1);
    const moved = await listGallery(projectId);
    check("move up swaps gallery order", moved[1].caption === "Tiga" && moved[2].caption === "Dua");
    check("positions stay dense after reorder", moved.every((g, i) => g.position === i + 1));

    await moveGalleryImage(moved[0].id, -1);
    check("move at the top edge is a no-op", (await listGallery(projectId))[0].caption === "Satu");

    // Caption update.
    await setGalleryCaption(moved[0].id, "  Caption Baru  ");
    check("caption is trimmed and saved", (await listGallery(projectId))[0].caption === "Caption Baru");

    // Every rejection case below must leave no row behind.
    const beforeRejects = (await listGallery(projectId)).length;
    const rejections: Array<[string, string]> = [
      ["/uploads/nonexistent.jpg", "media yang tidak ada di tabel"],
      ["/projects/exhibition.png", "path bundled /projects"],
      ["https://example.com/x.jpg", "URL eksternal"],
      ["/uploads/../secret.jpg", "path traversal"],
    ];
    for (const [path, label] of rejections) {
      const result = await addGalleryImage(projectId, path, "x");
      check(`gallery menolak ${label}`, !result.ok, result.ok ? "DITERIMA" : "");
    }
    check("tidak ada baris galeri tercipta dari penolakan", (await listGallery(projectId)).length === beforeRejects);

    // A perfectly valid media path is still refused for a project that is not there.
    const orphan = await addGalleryImage(999_999, uploads[0].path, "x");
    check("gallery rejects a non-existent project", !orphan.ok);

    // The data layer caps the caption rather than storing an over-long value.
    const longCaption = await addGalleryImage(projectId, uploads[0].path, "x".repeat(400));
    check("over-long caption is capped at 255", longCaption.ok && (await listGallery(projectId)).some((g) => g.caption.length === 255));
    const capped = (await listGallery(projectId)).find((g) => g.caption.length === 255);
    if (capped) await deleteGalleryImage(capped.id);
    check("gallery back to three after cleanup", (await listGallery(projectId)).length === 3);

    // Remove one.
    const beforeDelete = await listGallery(projectId);
    await deleteGalleryImage(beforeDelete[0].id);
    check("delete removes one gallery image", (await listGallery(projectId)).length === 2);

    // Unpublished project must not leak its gallery to the public content.
    await store.setPublished("projects", projectId, false);
    const hidden = await loadContent();
    check("unpublished project is absent from public content", !hidden.projects.some((p) => p.id === projectId));
    await store.setPublished("projects", projectId, true);

    // Deleting the project must cascade its gallery rows away.
    await store.deleteRow("projects", projectId);
    check("deleting a project removes it", !(await store.listRows("projects")).some((r) => r.id === projectId));
    check("deleting a project cascades its gallery", (await listGallery(projectId)).length === 0);

    // The cascade also frees the media files: while the gallery existed they were
    // "in use" and removeMedia refused to delete them.
    for (const upload of uploads) {
      const removed = await removeMedia(upload.id);
      check(`media galeri terhapus setelah cascade (${upload.path})`, removed.ok, removed.ok ? "" : removed.error);
    }
  }

  // ---------------------------------------------------------- company legalities
  const beforeLegalities = await store.listRows("company_legalities");
  check("legalities start empty", beforeLegalities.length === 0);

  const emptyContent = await loadContent();
  check("empty legality list renders without error", Array.isArray(emptyContent.legalities) && emptyContent.legalities.length === 0);

  await store.saveRow("company_legalities", { title: "NIB", value: "Terdaftar", description: "" });
  await store.saveRow("company_legalities", { title: "NPWP", value: "Terdaftar", description: "Dokumen legal perusahaan" });
  const twoLegalities = await store.listRows("company_legalities");
  check("legalities can be created", twoLegalities.length === 2);

  const nib = twoLegalities.find((row) => row.values.title === "NIB");
  if (nib) {
    await store.moveRow("company_legalities", nib.id, 1);
    const reordered = await store.listRows("company_legalities");
    check("legalities can be reordered", reordered[1].values.title === "NIB");

    await store.setPublished("company_legalities", nib.id, false);
    const hiddenLegality = await loadContent();
    check("hidden legality is not published", !hiddenLegality.legalities.some((l) => l.title === "NIB"));
    check("published legality still shows", hiddenLegality.legalities.some((l) => l.title === "NPWP"));

    await store.setPublished("company_legalities", nib.id, true);
    check("republished legality returns", (await loadContent()).legalities.some((l) => l.title === "NIB"));

    // Edit.
    await store.saveRow("company_legalities", { title: "NIB", value: "Terdaftar (diubah)", description: "" }, nib.id);
    check("legality can be edited", (await store.listRows("company_legalities")).some((r) => r.values.value === "Terdaftar (diubah)"));
  }

  check("required legality title is enforced", await rejects(() => store.saveRow("company_legalities", { title: "", value: "x", description: "" })));

  for (const row of await store.listRows("company_legalities")) {
    await store.deleteRow("company_legalities", row.id);
  }
  check("legalities can be deleted back to empty", (await store.listRows("company_legalities")).length === 0);
  check("empty legalities render again", (await loadContent()).legalities.length === 0);

  // ----------------------------------------------------------------- media
  const good = await saveUpload(fakeFile("logo.png", Buffer.concat([PNG_HEADER, Buffer.alloc(64)]), "image/png"), "Alt uji");
  check("valid PNG is accepted", good.ok, good.ok ? good.item.path : good.error);

  if (good.ok) {
    check("upload lands under public/uploads", good.item.path.startsWith("/uploads/"));
    check("file exists on disk", existsSync(uploadDir() + good.item.path.replace("/uploads", "")));
    check("recorded in media table", (await listMedia()).some((m) => m.id === good.item.id));
    check("stored filename is the uuid, not the client name", !good.item.path.includes("logo"));
  }

  const php = await saveUpload(
    fakeFile("shell.php", Buffer.concat([PNG_HEADER, Buffer.from("<?php system($_GET[0]); ?>")]), "image/png"),
    "",
  );
  // Header is a real PNG signature, so this one passes — the point is that the
  // stored name can never end in .php and the path is UUID-derived.
  check("png-signed php-named file gets a .png path", php.ok && php.item.path.endsWith(".png"));
  if (php.ok) {
    const cleanup = await removeMedia(php.item.id);
    check("php-named upload cleans up", cleanup.ok);
  }

  const disguised = await saveUpload(fakeFile("evil.png", Buffer.from("<?php system($_GET[0]); ?>"), "image/png"), "");
  check("PHP disguised as .png is rejected", !disguised.ok);
  check("rejection explains why", !disguised.ok && /JPG|PNG|WEBP/.test(disguised.ok ? "" : disguised.error));

  const exe = await saveUpload(fakeFile("note.exe", Buffer.alloc(128), "application/octet-stream"), "");
  check("exe is rejected", !exe.ok);

  const empty = await saveUpload(fakeFile("empty.png", Buffer.alloc(0), "image/png"), "");
  check("zero-byte file is rejected", !empty.ok);

  const huge = await saveUpload(
    fakeFile("big.png", Buffer.concat([PNG_HEADER, Buffer.alloc(MAX_UPLOAD_BYTES + 1)]), "image/png"),
    "",
  );
  check("oversize file is rejected", !huge.ok);

  // Deletion must respect references.
  if (good.ok) {
    const firstProject = (await store.listRows("projects"))[0];
    if (firstProject) {
      const original = firstProject.values.image;
      await store.saveRow("projects", { ...firstProject.values, image: good.item.path }, firstProject.id);
      const blocked = await removeMedia(good.item.id);
      check("in-use image cannot be deleted", !blocked.ok);
      await store.saveRow("projects", { ...firstProject.values, image: original }, firstProject.id);
    }

    const freed = await removeMedia(good.item.id);
    check("unused image deletes", freed.ok, freed.ok ? "" : freed.error);
    check("media row is gone", !(await listMedia()).some((m) => m.id === good.item.id));
    const fileOnDisk = uploadDir() + good.item.path.replace("/uploads", "");
    check("file is removed from disk", !existsSync(fileOnDisk));

    if (existsSync(fileOnDisk)) await unlink(fileOnDisk).catch(() => undefined);
  }

  // ------------------------------------------------------- settings merge
  const content = await loadContent();
  check(
    "loadContent returns every registered setting group",
    Object.keys(content.settings).length === SETTINGS_GROUPS.length,
    `${Object.keys(content.settings).length}/${SETTINGS_GROUPS.length}`,
  );
  check("services came from MySQL", content.services.length > 0 && content.services.every((s) => typeof s.id === "number"));
  check("hero image is populated", content.settings.hero.image.length > 0);
  check("about stats survive the JSON round-trip", Array.isArray(content.settings.about.stats) && content.settings.about.stats.length === 3);
  check(
    "utf8mb4 content is intact",
    content.settings.hero.description.includes("—") && content.settings.about.stats[0].value.includes("°"),
  );

  // --------------------------------------------------- logo image validation
  // identity.logo is an image setting, so it is held to the same SAFE_IMAGE_PATH
  // rule as the content CMS: /uploads or /projects, or empty.
  const identity = content.settings.identity as unknown as Record<string, unknown>;
  const identitySchema = SETTINGS_SCHEMA_BY_GROUP.identity;
  const logo = (value: string) => identitySchema.safeParse({ ...identity, logo: value }).success;

  check("logo kosong tetap valid (fallback inisial)", logo(""));
  check("logo /uploads diterima", logo("/uploads/logo.png"));
  check("logo /projects diterima", logo("/projects/logo.png"));
  check("logo URL eksternal ditolak", !logo("https://evil.example/logo.png"));
  check("logo protocol-relative ditolak", !logo("//evil.example/logo.png"));
  check("logo path traversal ditolak", !logo("/uploads/../secret.png"));
  check("logo skema javascript ditolak", !logo("javascript:alert(1)"));
  check("hero image masih lolos aturan image", SETTINGS_SCHEMA_BY_GROUP.hero.safeParse(content.settings.hero).success);
  check("og image masih lolos aturan image", SETTINGS_SCHEMA_BY_GROUP.seo.safeParse(content.settings.seo).success);

  // Backward compatibility: a stored identity document written before `logo`
  // existed still resolves, with logo defaulting to "".
  const [identityRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "identity"));
  if (identityRow) {
    const legacy = JSON.parse(identityRow.value) as Record<string, unknown>;
    delete legacy.logo;
    await db.update(settingsTable).set({ value: JSON.stringify(legacy) }).where(eq(settingsTable.key, "identity"));
    check("settings lama tanpa logo memakai fallback kosong", (await loadContent()).settings.identity.logo === "");
    await db.update(settingsTable).set({ value: identityRow.value }).where(eq(settingsTable.key, "identity"));
    check("identitas dipulihkan setelah tes fallback", (await loadContent()).settings.identity.logo === identity.logo);
  }

  // --------------------------------------------------- team photo validation
  // team_members.photo already exists and is optional; only its validation and
  // public rendering are new.
  const teamSchema = TABLES.team_members.schema;
  const teamBase = { role: "Director", name: "Nama Direktur", description: "", photo: "" };
  check("team tanpa foto tetap valid", teamSchema.safeParse(teamBase).success);
  check("foto team /uploads diterima", teamSchema.safeParse({ ...teamBase, photo: "/uploads/foto.png" }).success);
  check("foto team URL eksternal ditolak", !teamSchema.safeParse({ ...teamBase, photo: "https://evil.example/foto.png" }).success);
  check("foto team path traversal ditolak", !teamSchema.safeParse({ ...teamBase, photo: "/uploads/../secret.png" }).success);
  check("loadContent membawa field foto team", content.team.every((member) => typeof member.photo === "string"));

  // -------------------------------------------- settings media protection
  // A media file chosen for identity.logo / hero.image / seo.ogImage is a real
  // reference: the Media Manager must refuse to delete it, exactly as it does
  // for project, team, and gallery uses.
  const brand = await saveUpload(
    fakeFile("brand.png", Buffer.concat([PNG_HEADER, Buffer.alloc(48)]), "image/png"),
    "Brand uji",
  );
  check("upload untuk tes settings", brand.ok, brand.ok ? brand.item.path : brand.error);

  if (brand.ok) {
    const brandPath = brand.item.path;
    const originals = new Map<string, string>();
    for (const key of ["identity", "hero", "seo"]) {
      const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
      if (row) originals.set(key, row.value);
    }

    const setSetting = async (key: string, patch: Record<string, string>) => {
      const base = originals.get(key);
      const parsed = base ? (JSON.parse(base) as Record<string, unknown>) : {};
      await db
        .update(settingsTable)
        .set({ value: JSON.stringify({ ...parsed, ...patch }) })
        .where(eq(settingsTable.key, key));
    };

    try {
      await setSetting("identity", { logo: brandPath });
      check("mediaUsage menghitung identity.logo", (await mediaUsage(brandPath)) >= 1);
      check("media dipakai identity.logo ditolak", !(await removeMedia(brand.item.id)).ok);

      await setSetting("hero", { image: brandPath });
      check("mediaUsage menghitung hero.image", (await mediaUsage(brandPath)) >= 2);
      check("media dipakai hero.image ditolak", !(await removeMedia(brand.item.id)).ok);

      await setSetting("seo", { ogImage: brandPath });
      check("mediaUsage menjumlahkan ketiga referensi settings", (await mediaUsage(brandPath)) === 3);
      check("media dipakai seo.ogImage ditolak", !(await removeMedia(brand.item.id)).ok);

      // A malformed settings document is skipped, not thrown, and must not
      // disable protection coming from the other rows.
      await db.update(settingsTable).set({ value: "{ bukan json" }).where(eq(settingsTable.key, "seo"));
      const afterMalformed = await mediaUsage(brandPath);
      check("mediaUsage tidak crash pada JSON rusak", Number.isFinite(afterMalformed) && afterMalformed >= 2);
      check("proteksi row lain tetap aktif saat ada JSON rusak", !(await removeMedia(brand.item.id)).ok);

      // Clearing every reference frees the file for deletion.
      await setSetting("identity", { logo: "" });
      await setSetting("hero", { image: "" });
      await setSetting("seo", { ogImage: "" });
      check("mediaUsage 0 setelah referensi settings dikosongkan", (await mediaUsage(brandPath)) === 0);
      const freed = await removeMedia(brand.item.id);
      check("media bisa dihapus setelah referensi settings dikosongkan", freed.ok, freed.ok ? "" : freed.error);
    } finally {
      for (const [key, value] of originals) {
        await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
      }
      await removeMedia(brand.item.id).catch(() => undefined);
    }
  }

  // ------------------------------------------------------------ why choose us
  const whyBefore = await store.listRows("why_choose_us");
  check("why_choose_us seed terisi", whyBefore.length === 4, `rows=${whyBefore.length}`);
  check("why_choose_us posisi rapat 1..n", whyBefore.every((row, index) => row.position === index + 1));

  await store.saveRow("why_choose_us", { title: "TEST KEUNGGULAN", description: "Dibuat oleh integration check." });
  const whyAfter = await store.listRows("why_choose_us");
  check("why_choose_us insert menambah baris", whyAfter.length === whyBefore.length + 1);
  const createdWhy = whyAfter.find((row) => row.values.title === "TEST KEUNGGULAN");
  check("why_choose_us baris baru tayang", createdWhy?.published === true);

  const publicWhy = await loadContent();
  check("why_choose_us tayang muncul di konten publik", publicWhy.whyChooseUs.some((row) => row.title === "TEST KEUNGGULAN"));

  if (createdWhy) {
    await store.moveRow("why_choose_us", createdWhy.id, -1);
    const movedWhy = await store.listRows("why_choose_us");
    check("why_choose_us bisa diurutkan", movedWhy[movedWhy.length - 2].id === createdWhy.id);

    await store.setPublished("why_choose_us", createdWhy.id, false);
    check("why_choose_us disembunyikan hilang dari publik", !(await loadContent()).whyChooseUs.some((row) => row.id === createdWhy.id));
    await store.setPublished("why_choose_us", createdWhy.id, true);
    check("why_choose_us tayang kembali", (await loadContent()).whyChooseUs.some((row) => row.id === createdWhy.id));

    check("why_choose_us judul wajib", await rejects(() => store.saveRow("why_choose_us", { title: "", description: "x" })));

    // Swap the row back down before removing it: moveRow renumbers 1..n, so
    // deleting straight after the up-move would leave its neighbour shifted by
    // one and make a second run of this suite start from a non-dense state.
    await store.moveRow("why_choose_us", createdWhy.id, 1);
    await store.deleteRow("why_choose_us", createdWhy.id);
    check("why_choose_us bisa dihapus", (await store.listRows("why_choose_us")).length === whyBefore.length);
    check("why_choose_us posisi tetap rapat setelah hapus", (await store.listRows("why_choose_us")).every((row, index) => row.position === index + 1));
  }

  // Every row hidden is an empty list, not an error.
  const whyIds = (await store.listRows("why_choose_us")).map((row) => row.id);
  for (const id of whyIds) await store.setPublished("why_choose_us", id, false);
  const emptyWhy = await loadContent();
  check("why_choose_us tanpa item tayang = array kosong", Array.isArray(emptyWhy.whyChooseUs) && emptyWhy.whyChooseUs.length === 0);
  for (const id of whyIds) await store.setPublished("why_choose_us", id, true);

  check("fallback site.json memuat whyChooseUs", defaultContent.whyChooseUs.length === 4);
  check("fallback site.json memuat settings whyUs", defaultContent.settings.whyUs.kicker.length > 0);

  // --------------------------------------------------------- quotation intake
  const validSubmission: Record<string, unknown> = {
    name: "  Budi Santoso  ",
    company: "  PT Contoh  ",
    phone: "  +62 812-3456-7890 ",
    email: "  budi@example.com  ",
    eventType: "  Corporate Event  ",
    eventDate: "2025-08-17",
    location: "  Medan  ",
    guestCount: "  500 orang  ",
    budgetRange: "  Rp50-100 juta  ",
    message: "  Kami butuh event gathering 500 orang.  ",
    consent: true,
  };

  const quotesBefore = (await listQuotationRequests()).length;
  const createdQuote = await submitQuotation(validSubmission);
  check("quotation valid diterima", createdQuote.ok);
  const afterValid = await listQuotationRequests();
  check("satu baris quotation dibuat", afterValid.length === quotesBefore + 1);
  const createdRow = afterValid.find((row) => row.name === "Budi Santoso");
  check(
    "nilai quotation di-trim",
    createdRow?.company === "PT Contoh" &&
      createdRow?.phone === "+62 812-3456-7890" &&
      createdRow?.message === "Kami butuh event gathering 500 orang." &&
      createdRow?.eventType === "Corporate Event",
  );
  check("status quotation selalu 'new'", createdRow?.status === "new");

  const minimal = await submitQuotation({
    name: "Ani",
    phone: "08123456789",
    eventType: "Gathering",
    message: "Butuh gathering kecil.",
    consent: true,
  });
  check("quotation minimal (opsional kosong) diterima", minimal.ok);
  const minimalRow = (await listQuotationRequests()).find((row) => row.name === "Ani");
  check(
    "field opsional default kosong",
    minimalRow?.company === "" &&
      minimalRow?.email === "" &&
      minimalRow?.eventDate === "" &&
      minimalRow?.location === "" &&
      minimalRow?.guestCount === "" &&
      minimalRow?.budgetRange === "",
  );

  const beforeInvalid = (await listQuotationRequests()).length;
  const invalids: Array<[string, Record<string, unknown>]> = [
    ["nama kosong", { ...validSubmission, name: "   " }],
    ["nama terlalu pendek", { ...validSubmission, name: "A" }],
    ["telepon terlalu pendek", { ...validSubmission, phone: "123" }],
    ["telepon karakter aneh", { ...validSubmission, phone: "abc-def-!!!!" }],
    ["email tidak valid", { ...validSubmission, email: "bukan-email" }],
    ["jenis event kosong", { ...validSubmission, eventType: "" }],
    ["tanggal salah format", { ...validSubmission, eventDate: "17-08-2025" }],
    ["tanggal tidak nyata", { ...validSubmission, eventDate: "2025-02-31" }],
    ["nama terlalu panjang", { ...validSubmission, name: "x".repeat(200) }],
    ["pesan terlalu pendek", { ...validSubmission, message: "short" }],
    ["consent false", { ...validSubmission, consent: false }],
  ];
  for (const [label, payload] of invalids) {
    const result = await submitQuotation(payload);
    check(`quotation menolak ${label}`, !result.ok && Object.keys(result.errors).length > 0);
  }
  check("tidak ada baris dibuat dari penolakan", (await listQuotationRequests()).length === beforeInvalid);

  // Honeypot: filled silently, never stored.
  const beforeHoneypot = (await listQuotationRequests()).length;
  const honeypot = await submitQuotation({ ...validSubmission, website: "spam.example" });
  check("honeypot mengembalikan sukses generik", honeypot.ok);
  check("honeypot tidak membuat baris", (await listQuotationRequests()).length === beforeHoneypot);

  // Client-supplied status/id are stripped; the server decides.
  const injected = await submitQuotation({ ...validSubmission, name: "Inject Test", status: "closed", id: 999, created_at: "x" });
  check("kiriman dengan field ekstra diterima", injected.ok);
  const injectedRow = (await listQuotationRequests()).find((row) => row.name === "Inject Test");
  check("status tetap 'new' meski client mengirim status", injectedRow?.status === "new");

  // Status transitions and invalid values.
  if (injectedRow) {
    for (const status of ["contacted", "quoted", "closed"]) {
      check(`status ${status} diterima`, (await updateQuotationStatus(injectedRow.id, status)).ok);
    }
    check("status kembali ke new", (await updateQuotationStatus(injectedRow.id, "new")).ok);
    for (const bad of ["hacked", "deleted", "", "CLOSED", "NEW"]) {
      check(`status ${JSON.stringify(bad)} ditolak`, !(await updateQuotationStatus(injectedRow.id, bad)).ok);
    }
    check("isQuotationStatus benar", isQuotationStatus("new") && !isQuotationStatus("hacked"));
    check("getQuotationRequest mengembalikan baris", (await getQuotationRequest(injectedRow.id))?.id === injectedRow.id);
    check("getQuotationRequest id tidak valid = null", (await getQuotationRequest(-1)) === null);
  }

  // Clean up the rows this test created; there is no delete feature by design.
  for (const id of [createdQuote.ok ? createdQuote.id : 0, minimal.ok ? minimal.id : 0, injected.ok ? injected.id : 0]) {
    if (id > 0) await db.delete(quotationRequests).where(eq(quotationRequests.id, id));
  }
  check("baris uji quotation dibersihkan", (await listQuotationRequests()).length === quotesBefore);

  // ------------------------------------------------- clients / partners
  // Social proof is never seeded: a fresh database must show zero rows.
  check("clients_partners seed kosong (tanpa client fiktif)", (await store.listRows("clients_partners")).length === 0);
  check("testimonials seed kosong (tanpa testimonial fiktif)", (await store.listRows("testimonials")).length === 0);

  const clientSchema = TABLES.clients_partners.schema;
  check("client nama wajib", !clientSchema.safeParse({ name: "", logo: "" }).success);
  check("client logo kosong diterima", clientSchema.safeParse({ name: "X", logo: "" }).success);
  check("client logo /uploads diterima", clientSchema.safeParse({ name: "X", logo: "/uploads/logo.png" }).success);
  check("client logo /projects diterima", clientSchema.safeParse({ name: "X", logo: "/projects/logo.png" }).success);
  check("client logo URL eksternal ditolak", !clientSchema.safeParse({ name: "X", logo: "https://evil.example/logo.png" }).success);
  check("client logo protocol-relative ditolak", !clientSchema.safeParse({ name: "X", logo: "//evil.example/logo.png" }).success);
  check("client logo traversal ditolak", !clientSchema.safeParse({ name: "X", logo: "/uploads/../secret.png" }).success);

  await store.saveRow("clients_partners", { name: "TEST CLIENT A", logo: "/projects/corporate-conference.png" });
  await store.saveRow("clients_partners", { name: "TEST CLIENT B", logo: "" });
  const twoClients = await store.listRows("clients_partners");
  check("client dapat dibuat", twoClients.length === 2);
  const clientA = twoClients.find((row) => row.values.name === "TEST CLIENT A");
  const clientB = twoClients.find((row) => row.values.name === "TEST CLIENT B");
  check("logo client tanpa gambar boleh kosong", clientB?.values.logo === "");

  if (clientA) {
    await store.saveRow("clients_partners", { ...clientA.values, name: "TEST CLIENT A2" }, clientA.id);
    check("client dapat diedit", (await store.listRows("clients_partners")).some((row) => row.values.name === "TEST CLIENT A2"));

    await store.moveRow("clients_partners", clientA.id, 1);
    const movedClients = await store.listRows("clients_partners");
    check("client dapat diurutkan", movedClients[1].id === clientA.id);

    await store.setPublished("clients_partners", clientA.id, false);
    check("client disembunyikan hilang dari publik", !(await loadContent()).clientsPartners.some((row) => row.id === clientA.id));
    await store.setPublished("clients_partners", clientA.id, true);
    check("client tayang kembali muncul di publik", (await loadContent()).clientsPartners.some((row) => row.id === clientA.id));
  }

  for (const row of await store.listRows("clients_partners")) await store.deleteRow("clients_partners", row.id);
  check("client dapat dihapus sampai kosong", (await store.listRows("clients_partners")).length === 0);

  // ------------------------------------------------------- testimonials
  const testimonialSchema = TABLES.testimonials.schema;
  check("testimonial quote wajib", !testimonialSchema.safeParse({ quote: "", name: "X" }).success);
  check("testimonial nama wajib", !testimonialSchema.safeParse({ quote: "Bagus sekali", name: "" }).success);
  check("testimonial quote terlalu panjang ditolak", !testimonialSchema.safeParse({ quote: "x".repeat(1501), name: "X" }).success);
  check("testimonial foto valid diterima", testimonialSchema.safeParse({ quote: "Bagus", name: "X", photo: "/uploads/p.png" }).success);
  check("testimonial foto eksternal ditolak", !testimonialSchema.safeParse({ quote: "Bagus", name: "X", photo: "https://evil.example/p.png" }).success);
  check("testimonial foto traversal ditolak", !testimonialSchema.safeParse({ quote: "Bagus", name: "X", photo: "/uploads/../s.png" }).success);
  const parsedTestimonial = testimonialSchema.safeParse({ quote: "Bagus", name: "X" });
  check(
    "testimonial field opsional default kosong",
    parsedTestimonial.success &&
      parsedTestimonial.data.role === "" &&
      parsedTestimonial.data.company === "" &&
      parsedTestimonial.data.project === "" &&
      parsedTestimonial.data.photo === "",
  );

  await store.saveRow("testimonials", { quote: "TEST QUOTE SATU", name: "TEST PERSON A", role: "Manager", company: "PT Uji", project: "Annual Meeting" });
  await store.saveRow("testimonials", { quote: "TEST QUOTE DUA", name: "TEST PERSON B" });
  const twoTestimonials = await store.listRows("testimonials");
  check("testimonial dapat dibuat", twoTestimonials.length === 2);
  const testimonialA = twoTestimonials.find((row) => row.values.name === "TEST PERSON A");
  check("testimonial menyimpan role/company/project", testimonialA?.values.role === "Manager" && testimonialA?.values.company === "PT Uji" && testimonialA?.values.project === "Annual Meeting");

  if (testimonialA) {
    await store.saveRow("testimonials", { ...testimonialA.values, quote: "TEST QUOTE DIUBAH" }, testimonialA.id);
    check("testimonial dapat diedit", (await store.listRows("testimonials")).some((row) => row.values.quote === "TEST QUOTE DIUBAH"));

    await store.moveRow("testimonials", testimonialA.id, 1);
    check("testimonial dapat diurutkan", (await store.listRows("testimonials"))[1].id === testimonialA.id);

    await store.setPublished("testimonials", testimonialA.id, false);
    check("testimonial disembunyikan hilang dari publik", !(await loadContent()).testimonials.some((row) => row.id === testimonialA.id));
    await store.setPublished("testimonials", testimonialA.id, true);
    check("testimonial tayang kembali muncul di publik", (await loadContent()).testimonials.some((row) => row.id === testimonialA.id));
  }

  for (const row of await store.listRows("testimonials")) await store.deleteRow("testimonials", row.id);
  check("testimonial dapat dihapus sampai kosong", (await store.listRows("testimonials")).length === 0);
  const emptyProof = await loadContent();
  check("tanpa baris tayang, clientsPartners = []", emptyProof.clientsPartners.length === 0);
  check("tanpa baris tayang, testimonials = []", emptyProof.testimonials.length === 0);

  // ------------------------------------------------------ project case study
  const caseProject = (await store.listRows("projects"))[0];
  check(
    "project case-study default kosong",
    caseProject.values.objective === "" && caseProject.values.approach === "" && caseProject.values.outcome === "",
  );

  if (caseProject) {
    await store.saveRow(
      "projects",
      { ...caseProject.values, objective: "Tujuan uji", approach: "Pendekatan uji", outcome: "Hasil uji" },
      caseProject.id,
    );
    const updated = (await loadContent()).projects.find((p) => p.id === caseProject.id);
    check(
      "case-study round-trip ke konten publik",
      updated?.objective === "Tujuan uji" && updated?.approach === "Pendekatan uji" && updated?.outcome === "Hasil uji",
    );
    await store.saveRow("projects", { ...caseProject.values }, caseProject.id);
    const restored = (await loadContent()).projects.find((p) => p.id === caseProject.id);
    check("case-study dipulihkan kosong", restored?.objective === "" && restored?.approach === "" && restored?.outcome === "");
  }

  // ------------------------------------- media protection for new references
  const brandMedia = await saveUpload(
    fakeFile("clientbrand.png", Buffer.concat([PNG_HEADER, Buffer.alloc(40)]), "image/png"),
    "Brand client",
  );
  check("upload untuk tes media client/testimonial", brandMedia.ok, brandMedia.ok ? brandMedia.item.path : brandMedia.error);

  if (brandMedia.ok) {
    const mediaPath = brandMedia.item.path;
    await store.saveRow("clients_partners", { name: "MEDIA CLIENT", logo: mediaPath });
    check("mediaUsage menghitung client logo", (await mediaUsage(mediaPath)) >= 1);
    check("media dipakai client logo ditolak", !(await removeMedia(brandMedia.item.id)).ok);

    await store.saveRow("testimonials", { quote: "Media photo quote", name: "MEDIA PERSON", photo: mediaPath });
    check("mediaUsage menjumlahkan client + testimonial", (await mediaUsage(mediaPath)) >= 2);
    check("media dipakai client+testimonial ditolak", !(await removeMedia(brandMedia.item.id)).ok);

    for (const row of await store.listRows("clients_partners")) await store.deleteRow("clients_partners", row.id);
    for (const row of await store.listRows("testimonials")) await store.deleteRow("testimonials", row.id);
    check("mediaUsage 0 setelah referensi client/testimonial dibersihkan", (await mediaUsage(mediaPath)) === 0);
    const freed = await removeMedia(brandMedia.item.id);
    check("media bisa dihapus setelah referensi baru dibersihkan", freed.ok, freed.ok ? "" : freed.error);
  }

  // ---------------------------------------------------------- fallback data
  check("fallback site.json clientsPartners = []", Array.isArray(defaultContent.clientsPartners) && defaultContent.clientsPartners.length === 0);
  check("fallback site.json testimonials = []", Array.isArray(defaultContent.testimonials) && defaultContent.testimonials.length === 0);
  check("fallback settings clients tersedia", defaultContent.settings.clients.kicker.length > 0);
  check("fallback settings testimonials tersedia", defaultContent.settings.testimonials.kicker.length > 0);
  check(
    "fallback project punya field case-study kosong",
    defaultContent.projects.every((p) => p.objective === "" && p.approach === "" && p.outcome === ""),
  );

  // ------------------------------------------------ whatsapp number helper
  const whatsappCases: Array<[string, string]> = [
    ["081234567890", "6281234567890"],
    ["08 1234-567890", "6281234567890"],
    ["+62 812-3456-7890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["15551234567", "15551234567"],
    ["02012345678", "02012345678"],
  ];
  for (const [input, expected] of whatsappCases) {
    check(`toWhatsAppNumber(${JSON.stringify(input)}) = ${expected}`, toWhatsAppNumber(input) === expected);
  }

  // --------------------------------------------- SEO URL normalization / safety
  check("parseHttpUrl menerima https absolut", parseHttpUrl("https://example.com")?.origin === "https://example.com");
  check("parseHttpUrl menormalkan trailing slash", parseHttpUrl("https://example.com/")?.origin === "https://example.com");
  check("parseHttpUrl menerima http", parseHttpUrl("http://example.com") !== null);
  check("parseHttpUrl menolak javascript:", parseHttpUrl("javascript:alert(1)") === null);
  check("parseHttpUrl menolak ftp:", parseHttpUrl("ftp://example.com") === null);
  check("parseHttpUrl menolak protocol-relative //example.com", parseHttpUrl("//example.com") === null);
  check("parseHttpUrl menolak https:// tanpa host", parseHttpUrl("https://") === null);
  check("parseHttpUrl menolak kredensial", parseHttpUrl("https://user:pass@example.com") === null);
  check("parseHttpUrl menolak query", parseHttpUrl("https://example.com/?a=1") === null);
  check("parseHttpUrl menolak hash", parseHttpUrl("https://example.com/#x") === null);
  check("parseHttpUrl menolak nilai kosong", parseHttpUrl("") === null && parseHttpUrl("   ") === null);
  check("parseHttpUrl menolak non-string", parseHttpUrl(null) === null && parseHttpUrl(undefined) === null);

  const originalSiteUrl = process.env.SITE_URL;
  try {
    delete process.env.SITE_URL;
    check("getSiteOrigin null tanpa SITE_URL", getSiteOrigin() === null);
    check("resolveCanonical null tanpa canonical & SITE_URL", resolveCanonical("") === null);
    check("resolveCanonical mengabaikan canonical rusak", resolveCanonical("http://") === null);

    process.env.SITE_URL = "https://amana.example.com/";
    check("getSiteOrigin menormalkan SITE_URL", getSiteOrigin() === "https://amana.example.com");
    check("resolveCanonical jatuh ke SITE_URL", resolveCanonical("") === "https://amana.example.com");
    check("resolveCanonical memprioritaskan canonical", resolveCanonical("https://www.example.com/") === "https://www.example.com");
    check(
      "resolveCanonical mengabaikan canonical rusak lalu memakai SITE_URL",
      resolveCanonical("javascript:alert(1)") === "https://amana.example.com",
    );

    process.env.SITE_URL = "not a url";
    check("getSiteOrigin null untuk SITE_URL tidak valid", getSiteOrigin() === null);
  } finally {
    if (originalSiteUrl === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = originalSiteUrl;
  }

  check("absoluteUrl menggabungkan path dengan origin", absoluteUrl("/uploads/a.png", "https://example.com") === "https://example.com/uploads/a.png");
  check("absoluteUrl mempertahankan URL absolut", absoluteUrl("https://cdn.example.com/a.png", "https://example.com") === "https://cdn.example.com/a.png");
  check("absoluteUrl null tanpa origin untuk path relatif", absoluteUrl("/uploads/a.png", null) === null);
  check("absoluteUrl null untuk string kosong", absoluteUrl("", "https://example.com") === null);

  // --------------------------------------------- canonical CMS field validation
  const seoSchema = SETTINGS_SCHEMA_BY_GROUP.seo;
  const seoValues = content.settings.seo as unknown as Record<string, unknown>;
  const canonicalValid = (value: string) => seoSchema.safeParse({ ...seoValues, canonical: value }).success;
  check("canonical kosong valid", canonicalValid(""));
  check("canonical https valid", canonicalValid("https://example.com"));
  check("canonical https trailing slash valid", canonicalValid("https://www.example.com/"));
  check("canonical javascript ditolak", !canonicalValid("javascript:alert(1)"));
  check("canonical ftp ditolak", !canonicalValid("ftp://example.com"));
  check("canonical protocol-relative ditolak", !canonicalValid("//example.com"));
  check("canonical https:// tanpa host ditolak", !canonicalValid("https://"));

  // ----------------------------------------------------- JSON-LD XSS safety
  const dangerousName = "</script><script>alert(1)</script>";
  const serialized = serializeJsonLd({ name: dangerousName });
  check("JSON-LD tidak bisa keluar dari tag </script>", !serialized.includes("</script>"));
  check("JSON-LD hasil tetap JSON valid", (JSON.parse(serialized) as { name: string }).name === dangerousName);
  check("serializeJsonLd meng-escape < menjadi \\u003c", serializeJsonLd({ x: "<" }).includes("\\u003c"));
  check("escapeJsonForScript meng-escape U+2028", escapeJsonForScript("\u2028") === "\\u2028");
  check("escapeJsonForScript meng-escape &", escapeJsonForScript("a&b") === "a\\u0026b");

  // ------------------------------------------------------------- health checks
  const okEnv = { AUTH_SECRET: "x".repeat(32), SITE_URL: "https://example.com" };
  check("health: config ok untuk secret+https", checkConfig(okEnv).every((c) => c.ok));
  check("health: secret pendek ditolak", !checkConfig({ ...okEnv, AUTH_SECRET: "short" }).find((c) => c.name === "auth_secret")?.ok);
  check("health: SITE_URL http ditolak untuk produksi", !checkConfig({ ...okEnv, SITE_URL: "http://example.com" }).find((c) => c.name === "site_url")?.ok);
  check("health: SITE_URL rusak ditolak", !isProductionSiteOrigin("javascript:alert(1)"));
  check("health: uploads ada & writable", await checkUploadsWritable());
  check("health: uploads hilang = false", !(await checkUploadsWritable(join(process.cwd(), "public", "does-not-exist-xyz"))));
  check("health: database bisa dihubungi", await checkDatabaseReachable());
  check("health: schema lengkap", await checkSchema());
  const health = await runHealthChecks(okEnv);
  check("health: environment lengkap = ok", health.status === "ok", JSON.stringify(health.checks));
  const degraded = await runHealthChecks({ AUTH_SECRET: "short", SITE_URL: "http://example.com" });
  check("health: config rusak = degraded", degraded.status === "degraded");
  check("health: tidak membocorkan nilai rahasia", !JSON.stringify(health).includes("x".repeat(32)));
}

main()
  .then(() => {
    console.log(failures === 0 ? "\nSEMUA TES LOLOS" : `\n${failures} TES GAGAL`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error("\nTes crash:", error);
    process.exit(1);
  });
