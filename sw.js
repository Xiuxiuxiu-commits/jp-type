/* sw.js - offline cache: app shell + word banks */
const VERSION = 'jptype-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/kana.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const DATA = ['./data/n1.json', './data/n2.json', './data/n3.json', './data/n4.json', './data/n5.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then(async (c) => {
      await c.addAll(SHELL).catch(() => {});
      // word banks are large: add one by one, a failure must not block install
      for (const u of DATA) {
        try { await c.add(u); } catch (err) {}
      }
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) {
        // silent background refresh
        fetch(req).then((res) => {
          if (res && res.ok) caches.open(VERSION).then((c) => c.put(req, res));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
