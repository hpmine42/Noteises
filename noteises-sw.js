/* Noteises – Service Worker
   Macht die App offline verfügbar und installierbar (PWA).
   Fängt außerdem "Teilen → Noteises" (Share-Target) ab. */
'use strict';

const CACHE = 'noteises-v24';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './noteises-icon.png',
  './noteises-sw.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Share-Target: POST von anderen Apps (Browser → "Teilen → Noteises").
   FormData auslesen und als Nachricht an die App schicken, dann zur App weiterleiten. */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if(e.request.method === 'POST' && url.pathname.indexOf('index.html') !== -1){
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const data = {
          type: 'noteises-share',
          title: String(fd.get('title') || ''),
          text:  String(fd.get('text') || ''),
          url:   String(fd.get('url') || '')
        };
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach(c => c.postMessage(data));
      } catch(err) { /* ignorieren */ }
      return Response.redirect('./index.html');
    })());
    return;
  }

  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if(hit) return hit;
      return fetch(e.request).then(res => {
        const copy = res.clone();
        try {
          if(res.ok && new URL(e.request.url).origin === location.origin){
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
        } catch(err){}
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
