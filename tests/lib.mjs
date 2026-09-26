/* Shared by the reel's tests and its frame grabber: a static server for the
   repo root (so pages load exactly as Vercel serves them) and a browser. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.glb': 'model/gltf-binary'
};

/** the rewrites from vercel.json, so /reel works here as it does there */
function rewrites() {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    return Object.fromEntries((v.rewrites || []).map(r => [r.source, decodeURIComponent(r.destination)]));
  } catch { return {}; }
}

export function serve(port = 0) {
  const rw = rewrites();
  const server = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch { res.writeHead(400); return res.end('bad request'); }
    if (rw[p]) p = rw[p];
    const file = path.join(ROOT, p);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
      const size = st.size, range = req.headers.range;
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      if (range) {
        const [a, b] = range.replace(/bytes=/, '').split('-');
        const start = parseInt(a, 10) || 0, end = b ? parseInt(b, 10) : size - 1;
        res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
        return fs.createReadStream(file, { start, end }).pipe(res);
      }
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise(res => server.listen(port, '127.0.0.1', () => res({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

export async function playwright() {
  try { return await import('playwright'); }
  catch { return await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
}

export async function browser() {
  const { chromium } = await playwright();
  return chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
}
