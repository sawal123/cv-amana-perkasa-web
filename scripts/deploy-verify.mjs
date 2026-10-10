/**
 * Verifies the ./deploy artifact before it is zipped and uploaded.
 *
 *   npm run deploy:verify        (runs automatically after `deploy:pack`)
 *
 * Reads only — it never modifies the artifact. Fails when a required file is
 * missing, when the startup file is not the Passenger one, or when a secret file
 * has leaked into the upload.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const deploy = join(process.cwd(), "deploy");
let failures = 0;

function check(label, ok, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

if (!existsSync(deploy)) {
  console.error("\n./deploy tidak ada. Jalankan `npm run deploy:pack` dulu.");
  process.exit(1);
}

console.log("\nCV AMANA PERKASA — deploy artifact verification\n");

// -------------------------------------------------------------- required tree
const required = [
  "server.js",
  ".next",
  join(".next", "static"),
  "public",
  join("public", "uploads"),
  join("drizzle", "import-all.sql"),
  join("drizzle", "migrate-all.sql"),
];
for (const entry of required) {
  check(`ada: ${entry.replace(/\\/g, "/")}`, existsSync(join(deploy, entry)));
}

// ------------------------------------------------- Passenger startup entrypoint
const serverFile = join(deploy, "server.js");
if (existsSync(serverFile)) {
  const server = readFileSync(serverFile, "utf8");
  // The custom file boots through app.getRequestHandler(); the standalone default
  // boots through next/dist/server/lib/start-server. Shipping the wrong one breaks
  // Passenger, which patches http.Server.prototype.listen.
  check("server.js adalah startup Passenger (getRequestHandler)", server.includes("getRequestHandler"));
  check("server.js bukan startup default Next (start-server)", !server.includes("start-server"));
  // Passenger does not guarantee the app root is the working directory, so cwd
  // must be pinned to __dirname before app modules capture it.
  check(
    "server.js mem-pin working directory (process.chdir(__dirname))",
    /process\.chdir\(\s*__dirname\s*\)/.test(server),
  );
}

// ---------------------------------------------------------------- secret files
const FORBIDDEN_ROOT = [".env", ".env.local", ".env.production", ".env.development"];
for (const name of FORBIDDEN_ROOT) {
  check(`tidak ada file rahasia: ${name}`, !existsSync(join(deploy, name)));
}
check(
  "tidak ada .env* di root artefak",
  !readdirSync(deploy).some((name) => name === ".env" || name.startsWith(".env.")),
);

function scanForSecrets(dir) {
  if (!existsSync(dir)) return [];
  const findings = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findings.push(...scanForSecrets(full));
      continue;
    }
    if (/\.(pem|key|p12|pfx)$/i.test(entry.name) || /^id_(rsa|dsa|ecdsa|ed25519)$/.test(entry.name)) {
      findings.push(full);
      continue;
    }
    if (/\.(mjs|js|sql|json|txt|md)$/i.test(entry.name) && statSync(full).size < 2_000_000) {
      const text = readFileSync(full, "utf8");
      if (text.includes("-----BEGIN") && text.includes("PRIVATE KEY-----")) findings.push(`${full} (private key)`);
      // A plaintext ADMIN_PASSWORD assignment with a value is a real leak; the bare
      // identifier `AUTH_SECRET` inside compiled code is not.
      if (/ADMIN_PASSWORD\s*=\s*[^\s"']+/.test(text)) findings.push(`${full} (plaintext ADMIN_PASSWORD)`);
    }
  }
  return findings;
}

const scanTargets = [deploy, join(deploy, "drizzle"), join(deploy, "cpanel")].filter(existsSync);
const secretFindings = [...new Set(scanTargets.flatMap(scanForSecrets))];
check("tidak ada berkas/kunci rahasia", secretFindings.length === 0, secretFindings.slice(0, 5).join(", "));

// --------------------------------------------------- committed SQL credentials
for (const file of ["import-all.sql", "migrate-all.sql"]) {
  const path = join(deploy, "drizzle", file);
  if (!existsSync(path)) continue;
  const sql = readFileSync(path, "utf8");
  check(`${file} tanpa hash kredensial (scrypt:)`, !sql.includes("scrypt:"));
  check(`${file} tanpa INSERT admin`, !/INSERT\s+INTO\s+`admin_users`/i.test(sql));
}

console.log("");
if (failures === 0) {
  console.log("Artefak deploy terverifikasi.");
  process.exit(0);
}
console.log(`${failures} pemeriksaan deploy GAGAL.`);
process.exit(1);
