/**
 * Content go-live checklist (read-only).
 *
 *   npm run content:check
 *
 * Flags obvious placeholder content that must be replaced before public launch.
 * It never mutates anything and never invents replacements. Exits non-zero while
 * placeholders remain, so it can gate a release — expected to "fail" on a fresh
 * seed until real company content is entered.
 */
import process from "node:process";
import { loadContent } from "@/lib/content";
import { getSiteOrigin } from "@/lib/site-url";

const PLACEHOLDERS = [
  { marker: "08xx", label: "nomor telepon contoh", field: "contact.phone" },
  { marker: "email@perusahaan.com", label: "email contoh", field: "contact.email" },
  { marker: "Alamat perusahaan dapat diganti", label: "alamat contoh", field: "contact.address" },
  { marker: "Nama Direktur", label: "nama manajemen contoh", field: "team.name" },
  { marker: "Nama Project Manager", label: "nama manajemen contoh", field: "team.name" },
  { marker: "Nama Operations", label: "nama manajemen contoh", field: "team.name" },
  { marker: "Nama Creative Lead", label: "nama manajemen contoh", field: "team.name" },
];

let failures = 0;
function fail(message: string) {
  console.log(`  FAIL ${message}`);
  failures += 1;
}
function warn(message: string) {
  console.log(`  WARN ${message}`);
}
function ok(message: string) {
  console.log(`  ok   ${message}`);
}

async function main() {
  const content = await loadContent();
  const serialized = JSON.stringify(content);

  console.log("\nCV AMANA PERKASA — content go-live check\n");

  // ----------------------------------------------------- placeholder content
  const found = new Set<string>();
  for (const { marker, label, field } of PLACEHOLDERS) {
    if (serialized.includes(marker)) {
      found.add(label);
      fail(`${label} masih ada: "${marker}" (${field})`);
    }
  }
  if (found.size === 0) ok("tidak ada placeholder teks yang terdeteksi");

  // ---------------------------------------------------------- SEO readiness
  const { seo } = content.settings;
  if (!seo.title.trim()) fail("SEO title kosong");
  if (!seo.description.trim()) fail("SEO description kosong");
  else ok("SEO title & description terisi");

  const origin = getSiteOrigin();
  if (!seo.canonical.trim() && !origin) {
    fail("canonical belum diatur dan SITE_URL kosong — canonical tidak akan dirender");
  } else {
    ok("canonical/SITE_URL tersedia");
  }

  if (!seo.ogImage.trim()) warn("OG image kosong — tautan akan tampil tanpa gambar pratinjau");
  else ok("OG image terisi");

  // ---------------------------------------------- bundled concept imagery
  const bundledImages = content.projects.filter((project) => project.image.startsWith("/projects/"));
  if (bundledImages.length > 0) {
    warn(`${bundledImages.length} project masih memakai gambar konsep bawaan (/projects/*) — ganti dengan dokumentasi project asli`);
  } else {
    ok("semua project memakai gambar upload");
  }

  console.log("");
  if (failures === 0) {
    console.log("Konten siap go-live (periksa WARN di atas bila ada).");
    process.exit(0);
  }
  console.log(`${failures} item konten wajib diganti sebelum publikasi.`);
  process.exit(1);
}

main().catch((error) => {
  console.error("\nContent check gagal:", (error as Error).message);
  process.exit(1);
});
