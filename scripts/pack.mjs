/**
 * Builds the exact tree to upload to cPanel, in ./deploy
 *
 * Next.js standalone output intentionally omits static chunks, public assets and
 * anything it cannot trace — so those have to be copied in by hand or the site
 * 404s on every asset after upload.
 *
 * Usage: npm run build && npm run deploy:pack
 * Then zip the contents of ./deploy and extract them into the cPanel app root.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const standalone = join(root, ".next", "standalone");
const deploy = join(root, "deploy");

function assertExists(path, hint) {
  if (!existsSync(path)) {
    console.error(`\nMissing: ${relative(root, path)}`);
    console.error(hint);
    process.exit(1);
  }
}

assertExists(
  standalone,
  "Run `npm run build` first — standalone output is produced by the build.",
);
assertExists(
  join(root, ".next", "static"),
  "Run `npm run build` first — .next/static is not emitted by standalone output.",
);
assertExists(join(root, "cpanel", "server.js"), "The Passenger startup file must exist.");

console.log("Packing deploy tree -> ./deploy");

// Images uploaded through the admin live in deploy/public/uploads, written by the
// running server. Wiping the tree without carrying them over would delete every
// image the client ever uploaded while MySQL keeps pointing at the dead paths.
const uploadsStash = join(root, ".deploy-uploads-stash");
const existingUploads = join(deploy, "public", "uploads");
let preserved = 0;

rmSync(uploadsStash, { recursive: true, force: true });
if (existsSync(existingUploads)) {
  cpSync(existingUploads, uploadsStash, { recursive: true });
  preserved = readdirSync(uploadsStash).length;
}

rmSync(deploy, { recursive: true, force: true });
mkdirSync(deploy, { recursive: true });

// 1. The standalone bundle: server, traced node_modules, .next server chunks.
cpSync(standalone, deploy, { recursive: true });
console.log("  + standalone bundle");

// 2. Static chunks. Without this every CSS/JS request 404s.
cpSync(join(root, ".next", "static"), join(deploy, ".next", "static"), { recursive: true });
console.log("  + .next/static");

// 3. Public assets (project images, fonts, favicon).
if (existsSync(join(root, "public"))) {
  cpSync(join(root, "public"), join(deploy, "public"), { recursive: true });
  console.log("  + public/");
}

// 4. Uploads: restore what the previous tree held, else create an empty target.
const targetUploads = join(deploy, "public", "uploads");
mkdirSync(targetUploads, { recursive: true });
if (preserved > 0) {
  cpSync(uploadsStash, targetUploads, { recursive: true });
  console.log(`  + public/uploads (${preserved} gambar lama dilestarikan)`);
} else {
  console.log("  + public/uploads (kosong, siap tulis untuk admin)");
}
rmSync(uploadsStash, { recursive: true, force: true });

// 5. Passenger entrypoint, replacing Next's own server.js.
cpSync(join(root, "cpanel", "server.js"), join(deploy, "server.js"));
console.log("  + server.js (cPanel startup file)");

// 6. Migration + seed SQL, so the database can be filled from phpMyAdmin
//    without ever opening a remote MySQL connection to the host.
if (existsSync(join(root, "drizzle"))) {
  cpSync(join(root, "drizzle"), join(deploy, "drizzle"), { recursive: true });
  console.log("  + drizzle/*.sql (import via phpMyAdmin)");
}

// 7. Never ship local env secrets inside the upload.
rmSync(join(deploy, ".env"), { force: true });
rmSync(join(deploy, ".env.local"), { force: true });

function sizeOf(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) total += statSync(full).size;
    }
  }
  return total;
}

const bytes = sizeOf(deploy);
console.log(
  `\nDone. ${deploy}\nSize: ${(bytes / 1024 / 1024).toFixed(1)} MB\n` +
    `Next: zip the CONTENTS of ./deploy (not the folder itself), upload, extract ` +
    `into the cPanel app root, then set NODE_ENV, DATABASE_URL and AUTH_SECRET, ` +
    `import drizzle/import-all.sql via phpMyAdmin, and point "Application startup ` +
    `file" at server.js.`,
);
