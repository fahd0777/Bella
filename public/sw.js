// Bella service worker — caches ONLY the static app shell (HTML/JS/CSS/fonts/icons).
// Private data (Supabase API calls, signed photo URLs) is never cached.
const CACHE = 'bella-shell-v1';
const SCOPE = self.registration.scope; // e.g. https://user.github.io/Bella/
const SHELL = ['', 'manifest.webmanifest', 'icon-192.png', 'icon.svg'].map((p) => new URL(p, SCOPE).href);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // never touch API / storage
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { caches.open(CACHE).then((c) => c.put(SCOPE, res.clone())); return res; }).catch(() => caches.match(SCOPE)));
    return;
  }
  if (url.pathname.includes('/assets/') || /\.(png|svg|woff2?|webmanifest)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; })));
  }
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const link = new URL(((e.notification.data && e.notification.data.link) || '/').replace(/^\//, ''), SCOPE).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.navigate(link); return c.focus(); } }
    return self.clients.openWindow(link);
  }));
});
