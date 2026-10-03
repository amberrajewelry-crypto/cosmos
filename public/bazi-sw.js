// Service worker раздела /bazi/: офлайн-работа приложения «Бацзы».
// Страница — сначала сеть, при отсутствии — кэш; ассеты с хэшем, шрифты, города — из кэша.
const CACHE = 'bazi-v1';
const CORE = ['/bazi/', '/cities.json', '/bazi.webmanifest', '/icons/bazi-192.png', '/icons/bazi-512.png', '/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    // ассеты страницы (js/css/шрифты) — из её HTML
    const html = await (await c.match('/bazi/')).text();
    const urls = [...html.matchAll(/(?:href|src)="(\/(?:assets|fonts)\/[^"]+)"/g)].map((m) => m[1]);
    await Promise.all(urls.map((u) => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('bazi-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate' && url.pathname.startsWith('/bazi')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put('/bazi/', res.clone());
        return res;
      } catch {
        return (await caches.match('/bazi/')) || Response.error();
      }
    })());
    return;
  }

  if (/^\/(assets|fonts|icons)\//.test(url.pathname) || url.pathname === '/cities.json' || url.pathname === '/favicon.svg') {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
});
