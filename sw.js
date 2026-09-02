const C='xinyu-led-studio-v20-8-5';
const CORE=['./','./index.html','./styles.css?v=20.8.5','./app.js?v=20.8.5','./manifest.json?v=20.8.5','./icon.svg?v=20.8.5'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(C);
    for(const url of CORE){try{await cache.add(new Request(url,{cache:'reload'}))}catch(e){console.warn('precache',url,e)}}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==C && (k.startsWith('xinyu-led-studio-')||k.includes('xinyu'))).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

function isCore(url){
  const p=url.pathname;
  return p.endsWith('/app.js')||p.endsWith('/styles.css')||p.endsWith('/index.html')||
         p.endsWith('/manifest.json')||p.endsWith('/icon.svg')||p.endsWith('/xinyu-led-studio/');
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(isCore(url)){
    event.respondWith((async()=>{
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        if(response && response.ok){
          const cache=await caches.open(C);
          cache.put(event.request,response.clone()).catch(()=>{});
        }
        return response;
      }catch(e){
        return (await caches.match(event.request)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    const response=await fetch(event.request);
    if(response && response.ok){
      const cache=await caches.open(C);
      cache.put(event.request,response.clone()).catch(()=>{});
    }
    return response;
  })());
});
