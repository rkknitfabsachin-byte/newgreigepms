import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT || 4173);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(root, `.${pathname}`);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': types[path.extname(filePath)] || 'application/octet-stream',
    });
    response.end(file);
  } catch (error) {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`PMS preview running at http://localhost:${port}`);
});
