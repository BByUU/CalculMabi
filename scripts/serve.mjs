import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
export function createPreviewServer({built = false, testMode = false} = {}) {
  const publicRoot = fileURLToPath(new URL(built ? '../.pages/' : '../dist/', import.meta.url));
  return http.createServer(async (req, res) => {
  try {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const testing = testMode && requested.startsWith('/__tests__/');
    const root = path.resolve(testing ? fileURLToPath(new URL('../tests/', import.meta.url)) : publicRoot);
    const pathname = testing ? requested.slice('/__tests__'.length) : requested;
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(root + path.sep) && target !== path.join(root, 'index.html')) { res.writeHead(403).end(); return; }
    const contents = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(contents);
  } catch { res.writeHead(404).end('Not found'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const testMode = process.argv.includes('--test');
  const port = testMode ? 4174 : 4173;
  createPreviewServer({testMode, built:process.argv.includes('--built')}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/${testMode ? '__tests__/browser.html' : ''}`));
}
