/**
 * Read-only production preflight.
 *
 *   npm run production:preflight
 *
 * Verifies the environment a production deployment depends on, without touching
 * the database and without ever printing a secret value. Exits non-zero when a
 * required check fails, so it can gate a deploy script.
 */
import process from "node:process";

const REQUIRED_NODE_MAJOR = 20;
const REQUIRED_NODE_MINOR = 9;

let failures = 0;

function line(label, status, detail = "") {
  const dots = ".".repeat(Math.max(2, 24 - label.length));
  console.log(`${label} ${dots} ${status}${detail ? `  (${detail})` : ""}`);
}

function required(label, ok, detail = "") {
  if (!ok) failures += 1;
  line(label, ok ? "PASS" : "FAIL", detail);
  return ok;
}

function warn(label, ok, detail = "") {
  line(label, ok ? "PASS" : "WARN", detail);
  return ok;
}

/** Parse an absolute http(s) URL the same way the app does, without importing TS. */
function parseHttpUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname) return null;
  if (url.username || url.password) return null;
  if (url.search || url.hash) return null;
  return url;
}

console.log("\nCV AMANA PERKASA — production preflight\n");

// -------------------------------------------------------------------- Node
const [major, minor] = process.versions.node.split(".").map(Number);
const nodeOk = major > REQUIRED_NODE_MAJOR || (major === REQUIRED_NODE_MAJOR && minor >= REQUIRED_NODE_MINOR);
required("Node", nodeOk, `v${process.versions.node}, butuh >= ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}`);

// ------------------------------------------------------------ DATABASE_URL
const databaseUrl = process.env.DATABASE_URL ?? "";
let databaseOk = false;
let databaseDetail = "tidak diset";
if (databaseUrl) {
  try {
    const parsed = new URL(databaseUrl.replace(/^mysql:/, "http:"));
    databaseOk = databaseUrl.startsWith("mysql://") && Boolean(parsed.hostname) && parsed.pathname.replace(/^\//, "").length > 0;
    databaseDetail = databaseOk
      ? `host ${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}, db ${parsed.pathname.replace(/^\//, "")}`
      : "URL mysql tidak valid";
  } catch {
    databaseOk = false;
    databaseDetail = "URL mysql tidak valid";
  }
}
required("DATABASE_URL", databaseOk, databaseDetail);

// ------------------------------------------------------------- AUTH_SECRET
const authSecret = process.env.AUTH_SECRET ?? "";
required("AUTH_SECRET", authSecret.length >= 32, `${authSecret.length} karakter, minimal 32`);

// ---------------------------------------------------------------- SITE_URL
const siteUrl = process.env.SITE_URL ?? "";
const siteParsed = parseHttpUrl(siteUrl);
required("SITE_URL", siteParsed !== null, siteParsed ? siteParsed.origin : "harus URL absolut http/https tanpa kredensial/query/hash");

if (siteParsed) {
  const isProduction = process.env.NODE_ENV === "production";
  const httpsOk = siteParsed.protocol === "https:";
  if (isProduction) {
    required("SITE_URL https", httpsOk, httpsOk ? siteParsed.origin : "produksi wajib https");
  } else {
    warn("SITE_URL https", httpsOk, httpsOk ? siteParsed.origin : "http — hanya OK untuk non-produksi");
  }
} else {
  line("SITE_URL https", "SKIP", "SITE_URL belum valid");
}

// -------------------------------------------------------- optional warnings
// ADMIN_PASSWORD is only used by `db:seed`; it is not required at runtime.
warn("ADMIN_PASSWORD", (process.env.ADMIN_PASSWORD ?? "").length >= 8, "hanya diperlukan untuk db:seed");

console.log("");
if (failures === 0) {
  console.log("Preflight LOLOS. Tidak ada nilai rahasia yang ditampilkan.");
  process.exit(0);
}
console.log(`Preflight GAGAL: ${failures} pemeriksaan wajib tidak terpenuhi.`);
process.exit(1);
