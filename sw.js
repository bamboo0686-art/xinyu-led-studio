const CACHE="xinyu-led-studio-v21-0";
const CORE=["./","./index.html","./styles.css","./app.js","./core.mjs","./manifest.json","./icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.origin===location.origin && (u.pathname.endsWith("/app.js")||u.pathname.endsWith("/core.mjs")||u.pathname.endsWith("/index.html")||u.pathname.endsWith("/"))){
    e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));return
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))
});
