/**
 * Passenger-like startup regression.
 *
 *   node --env-file=.env scripts/passenger-cwd-check.mjs
 *
 * Passenger does not guarantee the app root is the working directory. The
 * ordinary local test (`cd deploy && node server.js`) hides that, because there
 * cwd happens to equal the app root. This launches the deployed server with the
 * PARENT cwd set to an unrelated directory (the OS temp dir, usually on another
 * drive) and proves the app still resolves its own public/uploads and .next:
 * /api/health must report uploads=true, not degraded.
 *
 * Read-only against the database and filesystem. Starts one short-lived server and
 * stops it again. Requires the same .env as the rest of the suite and a packed
 * ./deploy (npm run build && npm run deploy:pack).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const deployDir = resolve(root, "deploy");
const serverPath = join(deployDir, "server.js");
const unrelatedCwd = resolve(tmpdir());
const port = process.env.PASSENGER_TEST_PORT ?? "3357";
const base = `http://127.0.0.1:${port}`;

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

console.log("\nCV AMANA PERKASA — Passenger wrong-cwd startup check\n");

if (!existsSync(serverPath)) {
  console.error("deploy/server.js tidak ada. Jalankan `npm run build && npm run deploy:pack` dulu.");
  process.exit(1);
}
check("deploy/server.js ada", true);
check("launch cwd berbeda dari app root", unrelatedCwd !== deployDir, `cwd=${unrelatedCwd}`);
// If the launch cwd itself had public/uploads, a cwd-dependent health check could
// pass by accident and the test would prove nothing.
check(
  "launch cwd tidak punya public/uploads (tes bermakna)",
  !existsSync(join(unrelatedCwd, "public", "uploads")),
);

const child = spawn(process.execPath, [serverPath], {
  cwd: unrelatedCwd,
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: port,
    SITE_URL: process.env.SITE_URL ?? "https://amana.example.com",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => (output += chunk.toString()));
child.stderr.on("data", (chunk) => (output += chunk.toString()));

let exited = false;
child.on("exit", () => (exited = true));

async function fetchWithTimeout(url, ms = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "manual" });
    return { status: res.status, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHealth(deadlineMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < deadlineMs) {
    if (exited) return null;
    try {
      const res = await fetchWithTimeout(`${base}/api/health`);
      if (res.status === 200 || res.status === 503) {
        let body = null;
        try {
          body = JSON.parse(res.text);
        } catch {
          body = null;
        }
        return { status: res.status, body };
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

function stopChild() {
  return new Promise((done) => {
    if (exited) return done();
    const timer = setTimeout(() => {
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        child.kill("SIGKILL");
      }
      done();
    }, 4000);
    child.once("exit", () => {
      clearTimeout(timer);
      done();
    });
    child.kill();
  });
}

try {
  const health = await waitForHealth();
  if (!health) {
    check("server siap dengan cwd yang tidak terkait", false, output.slice(-600).replace(/\s+/g, " ").trim());
    check("GET /api/health 200", false);
  } else {
    check("server siap dengan cwd yang tidak terkait", true);
    check("GET /api/health 200", health.status === 200, `status=${health.status}`);
    check("health uploads check benar (cwd tidak bocor)", health.body?.checks?.uploads === true, JSON.stringify(health.body?.checks ?? {}));
    check("health database check benar", health.body?.checks?.database === true);

    const home = await fetchWithTimeout(`${base}/`);
    check("GET / 200 (resolusi .next benar)", home.status === 200, `status=${home.status}`);
  }
} finally {
  await stopChild();
}

console.log("");
if (failures === 0) {
  console.log("PASSENGER WRONG-CWD CHECK LOLOS.");
  process.exit(0);
}
console.log(`${failures} pemeriksaan gagal.`);
process.exit(1);
