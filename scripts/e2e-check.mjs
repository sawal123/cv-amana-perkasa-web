/**
 * End-to-end probe against a running server and a real MySQL instance.
 *
 *   npm run build && npm run deploy:pack
 *   (cd deploy && node server.js)
 *   node --env-file=.env scripts/e2e-check.mjs http://localhost:3355
 *
 * Covers what unit tests cannot here: that the public page is genuinely driven
 * by MySQL, and that admin auth accepts real sessions and refuses everything
 * else. Mutates the database, then restores it from a snapshot taken first.
 */
import { SignJWT } from "jose";
import mysql from "mysql2/promise";

const origin = process.argv[2] ?? "http://localhost:3355";
const url = process.env.DATABASE_URL;
const secretValue = process.env.AUTH_SECRET ?? "";

if (secretValue.length < 32) {
  console.error("AUTH_SECRET terlalu pendek — seluruh tes admin akan gagal tanpa arti.");
  process.exit(1);
}
const secret = new TextEncoder().encode(secretValue);

let failures = 0;
function check(name, condition, detail = "") {
  console.log(`${condition ? "  ok  " : "  FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures += 1;
}

const SENTINEL = "SENTINEL-HERO-TITLE-12345";
const connection = await mysql.createConnection(url);

/** Snapshot before touching anything, so restore is not circular. */
const snapshot = async (key) =>
  (await connection.query("SELECT `value` FROM settings WHERE `key` = ?", [key]))[0][0].value;

try {
  // ---- public page really reads MySQL ----------------------------------
  const heroBefore = await snapshot("hero");
  const aboutBefore = await snapshot("about");

  await connection.query("UPDATE settings SET `value` = JSON_SET(`value`, '$.title', ?) WHERE `key` = 'hero'", [SENTINEL]);
  const page = await fetch(`${origin}/`);
  const html = await page.text();
  check("GET / is 200", page.status === 200, `status=${page.status}`);
  check("hero title comes from MySQL", html.includes(SENTINEL));

  await connection.query("UPDATE settings SET `value` = JSON_SET(`value`, '$.heading', ?) WHERE `key` = 'about'", [SENTINEL]);
  check("about heading comes from MySQL", (await (await fetch(`${origin}/`)).text()).includes(SENTINEL));

  await connection.query("UPDATE projects SET published = 0 WHERE id = 1");
  const hidden = await (await fetch(`${origin}/`)).text();
  check("unpublished project disappears", !hidden.includes("Corporate Conference"));
  await connection.query("UPDATE projects SET published = 1 WHERE id = 1");

  await connection.query("UPDATE settings SET `value` = ? WHERE `key` = 'hero'", [heroBefore]);
  await connection.query("UPDATE settings SET `value` = ? WHERE `key` = 'about'", [aboutBefore]);
  const restored = await (await fetch(`${origin}/`)).text();
  check("restore puts the seeded title back", !restored.includes(SENTINEL) && restored.includes("Mewujudkan Event Berkelas"));

  // ---- uploaded images are served --------------------------------------
  // Guards the bug where Next's boot-time public file index made every admin
  // upload 404 until the process restarted. app/uploads/[...file]/route.ts
  // exists precisely to stop that regressing.
  //
  // Note the two legitimate serving paths: a file present when the server boots
  // comes from Next's static middleware (Cache-Control: public, max-age=0),
  // while one written afterwards is streamed by the route handler (immutable).
  // Only the header differs, so this asserts availability and the guards, not
  // which of the two answered.
  const [mediaRows] = await connection.query("SELECT `path` FROM media ORDER BY `id` DESC LIMIT 1");
  const mediaPath = mediaRows[0]?.path;
  if (mediaPath) {
    const served = await fetch(origin + mediaPath);
    check(`uploaded image serves 200 (${mediaPath})`, served.status === 200, `status=${served.status}`);
    check("uploads carry a cache policy", (served.headers.get("cache-control") ?? "").startsWith("public"));
  } else {
    console.log("  SKIP  no media rows — upload one through /admin/media first");
  }

  const missing = await fetch(origin + "/uploads/00000000-0000-4000-8000-000000000000.png");
  check("absent upload is 404, not a directory read", missing.status === 404, `status=${missing.status}`);

  const traversal = await fetch(origin + "/uploads/package.json");
  check("non-UUID upload path is refused", traversal.status === 404, `status=${traversal.status}`);

  // ---- admin auth ------------------------------------------------------
  const sign = (overrides = {}) =>
    new SignJWT({ username: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("1")
      .setIssuer("amana-perkasa-admin")
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

  const validToken = await sign();
  const forgedToken = await new SignJWT({ username: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("1")
    .setIssuer("amana-perkasa-admin")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode("another-secret-value-long-enough-for-tests-9f2"));

  const expiredToken = await new SignJWT({ username: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("1")
    .setIssuer("amana-perkasa-admin")
    .setIssuedAt(Math.floor(Date.now() / 1000) - 86400 * 30)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
    .sign(secret);

  // redirect:"manual" so a login page served after a bounce cannot masquerade
  // as an authenticated 200.
  const grab = async (path, token) => {
    const headers = token ? { cookie: `amana_admin=${token}` } : {};
    const res = await fetch(origin + path, { headers, redirect: "manual" });
    const body = res.status === 200 ? await res.text() : "";
    return { status: res.status, location: res.headers.get("location") ?? "", body };
  };

  for (const path of ["/admin", "/admin/settings/identity", "/admin/content/projects", "/admin/media"]) {
    const anon = await grab(path);
    check(
      `${path} anonymous -> 307 to login`,
      anon.status >= 300 && anon.status < 400 && anon.location.includes("/admin/login"),
      `status=${anon.status} location=${anon.location || "-"}`,
    );

    const authed = await grab(path, validToken);
    check(`${path} valid session -> 200`, authed.status === 200, `status=${authed.status}`);
    check(`${path} renders admin chrome`, authed.body.includes("Ringkasan") && authed.body.includes("Keluar"));

    const forged = await grab(path, forgedToken);
    check(`${path} forged token -> redirect`, forged.status >= 300 && forged.status < 400, `status=${forged.status}`);

    const expired = await grab(path, expiredToken);
    check(`${path} expired token -> redirect`, expired.status >= 300 && expired.status < 400, `status=${expired.status}`);
  }

  // ---- content actually renders in the admin ---------------------------
  const projectsPage = await grab("/admin/content/projects", validToken);
  check("admin project list shows seeded rows", projectsPage.body.includes("Corporate Conference"));
  check("admin media page renders", (await grab("/admin/media", validToken)).body.includes("Pustaka gambar"));
} finally {
  await connection.end();
}

console.log(failures === 0 ? "\nSEMUA TES LOLOS" : `\n${failures} TES GAGAL`);
process.exit(failures === 0 ? 0 : 1);
