/**
 * Passenger / cPanel startup file.
 *
 * Phusion Passenger does not understand `next start`; it patches
 * http.Server.prototype.listen and hands the socket to Apache. So the app must
 * boot through a real Node server. Point "Application startup file" at this file.
 *
 * `dir: __dirname` matters: Passenger does not guarantee the app root is the
 * working directory, and Next resolves `.next` relative to `dir`.
 *
 * PORT comes from cPanel — never hardcode it.
 */
const { createServer } = require("http");
const { parse } = require("url");
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
