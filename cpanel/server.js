/**
 * Passenger / cPanel startup file.
 *
 * Phusion Passenger does not understand `next start`; it patches
 * http.Server.prototype.listen and hands the socket to Apache. So the app must
 * boot through a real Node server. Point "Application startup file" at this file.
 *
 * Passenger does not guarantee the app root is the working directory, so both
 * protections are required and both must stay:
 *   - `dir: __dirname` pins Next's resolution of .next and public.
 *   - `process.chdir(__dirname)` pins process.cwd() for application code
 *     (media uploads, the health uploads check) that joins paths against cwd.
 *
 * PORT comes from cPanel — never hardcode it.
 */
const { createServer } = require("http");
const { parse } = require("url");

// Must run before any application module is loaded: lib/media.ts captures
// process.cwd() at import time, and app.prepare() is what imports it. So this
// sits above require("next") and app.prepare(), not inside the then().
process.chdir(__dirname);

const next = require("next");

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const port = Number(process.env.PORT) || 3000;

  createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  })
    .once("error", (err) => {
      console.error("[server] failed to start", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`[server] ready on ${port}`);
    });
});
