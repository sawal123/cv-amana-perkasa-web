/**
 * Read-only production smoke test.
 *
 *   node scripts/production-smoke.mjs https://production-domain.com
 *   npm run production:smoke -- https://production-domain.com
 *
 * Optionally pass the expected canonical origin as a second argument when it
 * differs from the URL being probed (e.g. testing a local server whose SITE_URL
 * is the real production domain):
 *
 *   node scripts/production-smoke.mjs http://localhost:3355 https://amana.example.com
 *
 * Sends GETs only — no login, no quotation insert, no database mutation. Verifies
 * status codes, SEO tags, robots/sitemap, JSON-LD, and security headers, and that
 * a 404 leaks nothing. Exits non-zero on any failure.
 */
import process from "node:process";

const target = process.argv[2];
if (!target) {
  console.error("Pakai: node scripts/production-smoke.mjs https://production-domain.com [expected-origin]");
  process.exit(2);
}

let origin;
try {
  origin = new URL(target).origin;
} catch {
  console.error(`URL tidak valid: ${target}`);
  process.exit(2);
}

// The origin the canonical / robots sitemap / sitemap URLs should point at.
let expectedOrigin = origin;
if (process.argv[3]) {
  try {
    expectedOrigin = new URL(process.argv[3]).origin;
  } catch {
    console.error(`Expected origin tidak valid: ${process.argv[3]}`);
    process.exit(2);
  }
}

const isHttps = origin.startsWith("https://");
let failures = 0;

function check(name, ok, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}
function skip(name, detail = "") {
  console.log(`  SKIP ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path) {
  try {
    const res = await fetch(origin + path, { redirect: "manual" });
    return { ok: true, res };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Builds a case-insensitive attribute map for every <meta> and <link> tag. */
function parseHead(html) {
  const metas = {};
  const links = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = {};
    for (const attr of match[0].matchAll(/([a-zA-Z:-]+)\s*=\s*["']([^"']*)["']/g)) {
      attrs[attr[1].toLowerCase()] = attr[2];
    }
    const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
    if (key) metas[key] = attrs.content ?? "";
  }
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = {};
    for (const attr of match[0].matchAll(/([a-zA-Z:-]+)\s*=\s*["']([^"']*)["']/g)) {
      attrs[attr[1].toLowerCase()] = attr[2];
    }
    links.push(attrs);
  }
  return { metas, links };
}

console.log(
  `\nCV AMANA PERKASA — production smoke test\nTarget: ${origin}` +
    (expectedOrigin !== origin ? `\nExpected canonical origin: ${expectedOrigin}` : "") +
    "\n",
);

// ------------------------------------------------------------ status codes
const home = await get("/");
if (!home.ok) {
  console.error(`  GAGAL menghubungi ${origin}: ${home.error}`);
  process.exit(1);
}
check("GET / → 200", home.res.status === 200, `status=${home.res.status}`);
const homeHtml = home.res.status === 200 ? await home.res.text() : "";

for (const [path, expected] of [
  ["/robots.txt", 200],
  ["/sitemap.xml", 200],
  ["/api/health", 200],
  ["/admin/login", 200],
  ["/definitely-not-found-xyz", 404],
]) {
  const res = await get(path);
  if (!res.ok) {
    check(`GET ${path} → ${expected}`, false, res.error);
    continue;
  }
  check(`GET ${path} → ${expected}`, res.res.status === expected, `status=${res.res.status}`);
}

// --------------------------------------------------------------- homepage SEO
const { metas, links } = parseHead(homeHtml);
const title = homeHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
check("<title> ada", title.length > 0, title.slice(0, 80));
check("meta description ada", (metas.description ?? "").length > 0);

const canonical = links.find((link) => (link.rel ?? "").toLowerCase() === "canonical")?.href ?? "";
check("canonical menunjuk ke origin produksi", canonical.length > 0 && canonical.startsWith(expectedOrigin), canonical || "tidak ada");

check("og:title ada", (metas["og:title"] ?? "").length > 0);
check("og:description ada", (metas["og:description"] ?? "").length > 0);
const ogImage = metas["og:image"] ?? "";
if (ogImage) {
  check("og:image berupa URL absolut", /^https?:\/\//.test(ogImage), ogImage);
} else {
  skip("og:image", "belum dikonfigurasi");
}

// ------------------------------------------------------------------ JSON-LD
const jsonLdBlocks = [...homeHtml.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
check("JSON-LD ada", jsonLdBlocks.length > 0);
const types = new Set();
let jsonLdValid = true;
for (const block of jsonLdBlocks) {
  try {
    const parsed = JSON.parse(block);
    for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
      if (item && typeof item === "object" && typeof item["@type"] === "string") types.add(item["@type"]);
    }
  } catch {
    jsonLdValid = false;
  }
}
check("JSON-LD berupa JSON valid", jsonLdValid);
check("JSON-LD memuat Organization", types.has("Organization"), [...types].join(", "));
check("JSON-LD memuat WebSite", types.has("WebSite"));

// -------------------------------------------------------------------- robots
const robotsRes = await get("/robots.txt");
const robots = robotsRes.ok ? await robotsRes.res.text() : "";
check("robots.txt Allow: /", /allow:\s*\//i.test(robots));
check("robots.txt Disallow admin", /disallow:\s*\/admin/i.test(robots));
check("robots.txt Disallow api", /disallow:\s*\/api/i.test(robots));
check("robots.txt memuat URL sitemap", new RegExp(`sitemap:\\s*${expectedOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\/sitemap\\.xml`, "i").test(robots));

// ------------------------------------------------------------------- sitemap
const sitemapRes = await get("/sitemap.xml");
const sitemap = sitemapRes.ok ? await sitemapRes.res.text() : "";
check("sitemap memuat homepage produksi", sitemap.includes(`${expectedOrigin}/`));
check("sitemap tidak memuat /admin", !sitemap.includes("/admin"));
check("sitemap tidak memuat /api", !sitemap.includes("/api"));

// ---------------------------------------------------------- security headers
const h = home.res.headers;
check("X-Content-Type-Options", (h.get("x-content-type-options") ?? "").toLowerCase() === "nosniff", h.get("x-content-type-options") ?? "tidak ada");
check("Referrer-Policy", (h.get("referrer-policy") ?? "") === "strict-origin-when-cross-origin", h.get("referrer-policy") ?? "tidak ada");
check("X-Frame-Options", (h.get("x-frame-options") ?? "").toUpperCase() === "DENY", h.get("x-frame-options") ?? "tidak ada");
check("Permissions-Policy", (h.get("permissions-policy") ?? "").includes("camera=()"), h.get("permissions-policy") ?? "tidak ada");
if (isHttps) {
  check("Strict-Transport-Security", (h.get("strict-transport-security") ?? "").includes("max-age="), h.get("strict-transport-security") ?? "tidak ada");
} else {
  skip("Strict-Transport-Security", "target bukan https");
}
check("X-Powered-By tidak dibocorkan", h.get("x-powered-by") === null, h.get("x-powered-by") ?? "");

const login = await get("/admin/login");
if (login.ok) {
  const robotsTag = (login.res.headers.get("x-robots-tag") ?? "").toLowerCase();
  check("/admin/login X-Robots-Tag noindex, nofollow", robotsTag.includes("noindex") && robotsTag.includes("nofollow"), robotsTag || "tidak ada");
}

// -------------------------------------------------------------- 404 hygiene
const notFound = await get("/definitely-not-found-xyz");
if (notFound.ok) {
  const body = await notFound.res.text();
  check("404 tidak memuat stack trace", !/\bat\s+\w+\s*\(/.test(body) || !body.includes(".js:"));
  check("404 tidak bocorkan DATABASE_URL", !body.includes("DATABASE_URL"));
  check("404 tidak bocorkan AUTH_SECRET", !body.includes("AUTH_SECRET"));
  check("404 tidak bocorkan error SQL", !/ECONNREFUSED|ER_[A-Z_]+|SELECT .* FROM/i.test(body));
}

console.log("");
if (failures === 0) {
  console.log("SMOKE TEST LOLOS.");
  process.exit(0);
}
console.log(`${failures} pemeriksaan smoke GAGAL.`);
process.exit(1);
