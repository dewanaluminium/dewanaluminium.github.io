self.addEventListener('install', e=>{
  self.skipWaiting();
  e.waitUntil(caches.open('pos-cache-v1').then(c=> c.addAll(['./','./index.html'])));
});
self.addEventListener('activate', e=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(res=> res || fetch(e.request).then(r=>{
      const copy = r.clone();
      caches.open('pos-cache-v1').then(c=> c.put(e.request, copy));
      return r;
    }).catch(()=> caches.match('./index.html')))
  );
});