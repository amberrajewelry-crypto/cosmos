// Service worker раздела /bazi/: офлайн-работа приложения «Бацзы».
// Страница — сначала сеть, при отсутствии — кэш; ассеты с хэшем, шрифты, города — из кэша.
const CACHE = 'bazi-v4';
const CORE = ['/bazi/', '/places/core.json', '/bazi.webmanifest', '/icons/bazi-192.png', '/icons/bazi-512.png', '/favicon.svg'];

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

  if (url.pathname.endsWith('.png') && url.pathname.startsWith('/bazi/')) return; // заставка — всегда из сети
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

  // ядро базы мест: сначала сеть (в нём версия шардов), без сети — кэш
  if (url.pathname === '/places/core.json') {
    e.respondWith(fetch(req).then(async (res) => { if (res.ok) (await caches.open(CACHE)).put(req, res.clone()); return res; })
      .catch(async () => (await caches.match(req)) || Response.error()));
    return;
  }

  // хэшированные ассеты, шрифты, иконки, шарды базы мест (путь с версией) — из кэша
  if (/^\/(assets|fonts|icons|places)\//.test(url.pathname) || url.pathname === '/favicon.svg') {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
});

// Утренняя карточка дня (Web Push, /api/push + tools/push_worker.ts на VPS).
self.addEventListener('push', (e) => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch { m = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(m.title || 'Ваш день', {
    body: m.body || '', icon: '/icons/bazi-192.png', badge: '/icons/bazi-192.png', tag: 'bazi-day', renotify: true, data: { url: m.url || '/bazi/' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/bazi/', self.location.origin).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of all) if (w.url.startsWith(self.location.origin + '/bazi')) { await w.focus(); return w.navigate ? w.navigate(url) : undefined; }
    return self.clients.openWindow(url);
  })());
});
