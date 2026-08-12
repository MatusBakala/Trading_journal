/**
 * Minimal static file server for local dev, with a real `Cache-Control: no-store`
 * header on every response.
 *
 * `python3 -m http.server` (the previous dev server) sends no Cache-Control
 * header at all, only Last-Modified – browsers then apply heuristic caching,
 * and Safari in particular will happily serve a stale index.html/app.js from
 * disk cache on a plain navigation without hitting the network at all. The
 * app's own cache-busting (index.html's boot script, ?v= on modules) only
 * works once a request actually reaches the server, so a real no-store
 * header is needed to guarantee that.
 *
 * Run: node tools/dev-server.mjs [port]  (or PORT env var; defaults to 5501)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.argv[2] || process.env.PORT || 5501);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(root, urlPath.endsWith('/') ? urlPath + 'index.html' : urlPath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Cache-Control': 'no-store' });
      res.end('Not found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, () => {
  console.log(`Dev server (no-cache) running at http://localhost:${port}`);
});
