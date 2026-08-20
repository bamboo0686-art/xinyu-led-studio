const CACHE="xinyu-led-studio-v21-0-5";
const CORE=["./","./index.html","./styles.css","./app.js","./manifest.json","./icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  const critical=u.origin===location.origin && (u.pathname.endsWith("/")||u.pathname.endsWith("/index.html")||u.pathname.endsWith("/app.js")||u.pathname.endsWith("/styles.css"));
  if(critical){
    e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{
      const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));return r;
    }).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
