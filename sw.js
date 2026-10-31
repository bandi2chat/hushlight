// Hushlight · archivo de apoyo de la app instalable
// Siempre intenta cargar la versión más nueva; si no hay internet, usa la última guardada.
const CACHE = 'hushlight-v9';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  if (new URL(r.url).origin !== location.origin) return; // Supabase y librerías no se guardan
  e.respondWith(
    fetch(r).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('./index.html')))
  );
});

// Notificaciones push (llegan aunque la app esté cerrada)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch (_) {}
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.some(c => c.visibilityState === 'visible');
    // App abierta y a la vista: aviso mudo que se retira solo. App cerrada o en segundo plano: aviso normal con sonido.
    await self.registration.showNotification(d.title || 'Hushlight', {
      body: d.body || '', tag: d.tag || undefined, icon: 'icon-192.png', badge: 'icon-192.png',
      silent: open, renotify: !open && !!d.tag, data: { url: d.url || './' }
    });
    if (typeof d.badge === 'number' && self.navigator && self.navigator.setAppBadge) { try { await self.navigator.setAppBadge(d.badge); } catch (_) {} }
    if (open) {
      await new Promise(r => setTimeout(r, 700));
      const ns = await self.registration.getNotifications({ tag: d.tag || undefined });
      ns.forEach(n => n.close());
    }
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
