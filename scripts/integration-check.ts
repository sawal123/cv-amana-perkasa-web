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
import { eq } from "drizzle-orm";
import { adminUsers } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import * as store from "@/lib/admin/store";
import { loadContent } from "@/lib/content";
import { MAX_UPLOAD_BYTES, listMedia, removeMedia, saveUpload, uploadDir } from "@/lib/media";
import type { Payload } from "@/lib/admin/fields";

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  console.log(`${condition ? "  ok  " : "  FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures += 1;
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
  check("loadContent returns all nine setting groups", Object.keys(content.settings).length === 9);
  check("services came from MySQL", content.services.length > 0 && content.services.every((s) => typeof s.id === "number"));
  check("hero image is populated", content.settings.hero.image.length > 0);
  check("about stats survive the JSON round-trip", Array.isArray(content.settings.about.stats) && content.settings.about.stats.length === 3);
  check(
    "utf8mb4 content is intact",
    content.settings.hero.description.includes("—") && content.settings.about.stats[0].value.includes("°"),
  );
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
