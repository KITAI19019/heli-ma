import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const files = (await readdir('dist', { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name !== 'sw.js')
  .map(entry => `${entry.parentPath}/${entry.name}`.replaceAll('\\', '/'));
const hash = createHash('sha256');
hash.update(await readFile(import.meta.filename));
for (const file of files.sort()) hash.update(await readFile(file));
const version = hash.digest('hex').slice(0, 16);
const assets = files.map(file => './' + file.replace(/^dist\//, ''));
await writeFile('dist/sw.js', `
const CACHE = 'heli-v01-${version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('heli-v01-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') return await cache.match('./index.html') || fetch(request);
    // Generated same-origin assets have identical bytes for every Origin header.
    // Preview hosts may send Vary: Origin; module requests include this header,
    // whereas the install-time precache request does not.
    return await cache.match(request, { ignoreVary: true }) || fetch(request);
  })());
});
`);
console.log(`Offline cache ${version}, ${assets.length} files including SQLite WASM.`);
