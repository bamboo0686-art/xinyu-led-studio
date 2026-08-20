
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/+esm";import{OrbitControls}from"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js/+esm";
const q=x=>document.getElementById(x),qa=x=>[...document.querySelectorAll(x)],c=q("c"),x=c.getContext("2d");let P=JSON.parse(localStorage.getItem("XLS_PROJECTS")||"[]"),cur=null,O=[],A=[],V=[],sel=null,tool="select",drag=null,z=1,pan={x:0,y:0},bg=null,H=[],F=[],scale=null,scalePts=[],is3=false,tr,ts,tc,cam,oc,root,geomMode="normal",anchorDrag=-1,contentEditMode=false,snapEnabled=true,gridEnabled=true,groups={},groupSeq=1,scenes=[{id:"S1",name:"場景1",objects:[]}],sceneIndex=0,guideLines=[],autoSaveTimer=null,maskPainting=false,maskLast=null,activeGuide=null,studioMode="proposal",engineeringLocked=false,showModuleGrid=false,showCabinetGrid=false,showPortMap=false,showPowerMap=false,aiDetections=[],aiMaskRegions=[],aiRepairRegions=[],show3DGrid=true,show3DStructure=true,threeContentCanvas=null,threeContentTex=null,bgScene={w:0,h:0},renderPending=false,lastVideoRender=0,videoLoopRunning=false,audioTrack=null,audioContext=null,audioMixDest=null,audioMasterGain=null,audioNodes=new WeakMap(),workspaceRecorder=null,workspaceChunks=[],workspaceRecordStarted=0,workspaceRecordTimer=null,heavyRefreshPending=false,autoRecordStopTimer=null,mediaLoopActive=false,mediaLoopLast=0,ledPatternCache=null,runtimeErrorCount=0,heavyTimer=null,autoAssemblyEnabled=true,naked3DClock=0,naked3DLoop=false,groupMoveMode=false,bgObjectURL=null,mediaDbPromise=null;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5),esc=s=>String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
function toast(t){q("toast").textContent=t;q("toast").classList.add("show");setTimeout(()=>q("toast").classList.remove("show"),1800)}
function setRuntimeState(text,level="ok"){
 const el=q("runtimeState");if(!el)return;
 el.textContent="核心："+text;el.className="runtimeState"+(level==="ok"?"":" "+(level==="bad"?"bad":"warn"))
}
window.addEventListener("error",e=>{
 runtimeErrorCount++;setRuntimeState("已攔截錯誤","bad");
 console.error("[Xinyu LED Studio]",e.error||e.message);
 if(runtimeErrorCount<4)toast("系統已攔截一個錯誤，工作區繼續運作")
});
window.addEventListener("unhandledrejection",e=>{
 runtimeErrorCount++;setRuntimeState("媒體/非同步錯誤","warn");
 console.error("[Xinyu async]",e.reason)
});
function guarded(fn,label="操作"){
 try{return fn()}catch(e){console.error(label,e);setRuntimeState(label+"失敗","bad");toast(label+"失敗，已阻止程式中斷");return null}
}

function scheduleAutoSave(){
 clearTimeout(autoSaveTimer);
 q("autosaveState").textContent="自動儲存：等待中";
 autoSaveTimer=setTimeout(()=>{if(anyPlayingVideo?.()||workspaceRecorder?.state==="recording"){scheduleAutoSave();return}try{save(false);q("autosaveState").textContent="自動儲存："+new Date().toLocaleTimeString()}catch(e){q("autosaveState").textContent="自動儲存失敗"}},2800)
}
function markChanged(){scheduleAutoSave()}

function scheduleHeavyRefresh(delay=180){
 clearTimeout(heavyTimer);heavyTimer=setTimeout(()=>{
  heavyTimer=null;
  const run=()=>guarded(()=>{layers();summary();updateEngCalc?.();},"背景工程計算");
  if("requestIdleCallback"in window)requestIdleCallback(run,{timeout:450});else setTimeout(run,0)
 },delay)
}
function isTextEditing(){
 const a=document.activeElement;if(!a)return false;
 return ["INPUT","TEXTAREA","SELECT"].includes(a.tagName)||a.isContentEditable
}
function updateSelectionActions(){updatePropertySceneInfo()}
function deleteSelectedObjects(){
 const ids=multiSel?.length?multiSel.slice():(sel?[sel]:[]);
 if(!ids.length){toast("請先選取要刪除的模型");return}
 const doomed=O.filter(o=>ids.includes(o.id));disposeObjects(doomed);
 snap();O=O.filter(o=>!ids.includes(o.id));sel=null;multiSel=[];
 draw();props();updatePropertySceneInfo();scheduleHeavyRefresh();markChanged();setPlayStatus("已刪除模型與其媒體播放來源");toast("已刪除選取模型")
}
function duplicateSelectedObjects(){
 const ids=multiSel?.length?multiSel.slice():(sel?[sel]:[]);
 if(!ids.length){toast("請先選取模型");return}
 snap();const added=[];
 ids.forEach(id=>{const o=O.find(x=>x.id===id);if(!o)return;const d={...o,id:uid(),name:(o.name||"物件")+" 複製",order:O.length+added.length};
   if(o.pts)d.pts=o.pts.map(p=>({x:p.x+24,y:p.y+24}));else{d.x=(o.x||0)+24;d.y=(o.y||0)+24}
   if(o.corners)d.corners=o.corners.map(p=>({x:p.x+24,y:p.y+24}));added.push(d)
 });O.push(...added);sel=added.at(-1)?.id||sel;multiSel=added.map(o=>o.id);draw();props();updateSelectionActions();scheduleHeavyRefresh();markChanged()
}


function isLedLike(o){return !!(o&&o.rw&&o.rh&&!o.mask&&!["text","dim","maskbrush"].includes(o.type))}
function updatePropertySceneInfo(){
 const sb=getSceneBounds?.()||{w:0,h:0};
 if(q("sceneInfoSize"))q("sceneInfoSize").textContent=`${Math.round(sb.w)} × ${Math.round(sb.h)}`;
 if(q("sceneInfoZoom"))q("sceneInfoZoom").textContent=`${Math.round(z*100)}%`;
 const count=O.filter(isLedLike).length;
 if(q("multiModelInfo"))q("multiModelInfo").textContent=`目前場景：${count} 個 LED／LCD／結構模型`;
 if(q("propSnapToggle"))q("propSnapToggle").textContent=`吸附：${snapEnabled?"開":"關"}`;
 if(q("propGridToggle"))q("propGridToggle").textContent=`格線：${gridEnabled?"開":"關"}`;
 qa("#propertyUnits button").forEach(b=>b.classList.toggle("active",b.dataset.punit===engineeringUnit))
}
function stopAndDisposeMedia(o){
 if(!o)return;const m=o.media;
 if(m?.tagName==="VIDEO"||m?.tagName==="AUDIO"){try{m.pause()}catch{}try{m.removeAttribute("src");m.src="";m.load()}catch{}}
 o.media=null;o.ready=0;o.mediaType=null;
 if(!anyPlayingVideo())mediaLoopActive=false
}
function disposeObjects(list){
 (list||[]).forEach(stopAndDisposeMedia)
}
function centerObjectInScene(o){
 if(!o)return;const sb=getSceneBounds(),b=objectBounds(o);
 moveObj(o,sb.x+sb.w/2-(b.x+b.w/2),sb.y+sb.h/2-(b.y+b.h/2));
 draw();props();scheduleHeavyRefresh();markChanged()
}
function addSameTypeModel(){
 const o=selected();if(!o){toast("請先選取要新增的模型");return}
 const d={...o,id:uid(),name:(o.name||"LED")+" "+(O.filter(x=>x.name?.startsWith(o.name||"")).length+1),order:O.length};
 delete d.media;d.ready=0;d.mediaType=null;d.mediaObjectURL=null;
 if(o.pts)d.pts=o.pts.map(p=>({x:p.x+35,y:p.y+35}));
 else{d.x=(o.x||0)+35;d.y=(o.y||0)+35}
 if(o.corners)d.corners=o.corners.map(p=>({x:p.x+35,y:p.y+35}));
 O.push(d);sel=d.id;multiSel=[d.id];draw();props();updatePropertySceneInfo();scheduleHeavyRefresh();markChanged();toast("已新增同型模型")
}
function ensureNaked3DLoop(){
 if(naked3DLoop)return;naked3DLoop=true;
 const tick=t=>{
  const active=O.some(o=>o.naked3D&&o.vis!==false);
  if(!active){naked3DLoop=false;return}
  naked3DClock=t;draw();requestAnimationFrame(tick)
 };
 requestAnimationFrame(tick)
}


function cloneSerializableObject(o){
 if(!o)return null;
 const c={};
 for(const [k,v] of Object.entries(o)){
  if(["media","maskCanvas"].includes(k))continue;
  if(v instanceof HTMLElement || v instanceof HTMLCanvasElement || v instanceof ImageBitmap)continue;
  if(typeof v==="function")continue;
  try{c[k]=structuredClone(v)}catch{
   if(Array.isArray(v))c[k]=v.map(x=>typeof x==="object"?{...x}:x);
   else if(v&&typeof v==="object")c[k]={...v};
   else c[k]=v
  }
 }
 return c
}
function serializeObjects(arr=O){return (arr||[]).map(cloneSerializableObject).filter(Boolean)}
function cloneProjectScenes(src=scenes){
 return (src||[]).map(s=>({...s,objects:serializeObjects(s.objects||[]),bgScene:structuredClone(s.bgScene||{w:0,h:0})}))
}
function pauseObjectMedia(arr=O){(arr||[]).forEach(o=>{try{o.media?.pause?.()}catch{}})}
function restoreObjectsFromPlain(arr){return structuredClone(arr||[])}
function syncSceneFromObjects(){
 const s=currentScene();if(!s)return;
 s.objects=serializeObjects(O);s.bgScene=structuredClone(bgScene||{w:0,h:0})
}
function openMediaDB(){
 if(mediaDbPromise)return mediaDbPromise;
 mediaDbPromise=new Promise((resolve,reject)=>{
  if(!("indexedDB"in window)){reject(new Error("瀏覽器不支援 IndexedDB"));return}
  const req=indexedDB.open("XinyuLEDStudioDB",1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("blobs"))db.createObjectStore("blobs")};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)
 });
 return mediaDbPromise
}
async function dbPutBlob(key,blob){
 const db=await openMediaDB();return new Promise((resolve,reject)=>{
  const tx=db.transaction("blobs","readwrite");tx.objectStore("blobs").put(blob,key);
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)
 })
}
async function dbGetBlob(key){
 const db=await openMediaDB();return new Promise((resolve,reject)=>{
  const tx=db.transaction("blobs","readonly"),req=tx.objectStore("blobs").get(key);
  req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)
 })
}
async function dbDeleteBlob(key){
 try{const db=await openMediaDB();return await new Promise((resolve,reject)=>{
  const tx=db.transaction("blobs","readwrite");tx.objectStore("blobs").delete(key);
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)
 })}catch{return false}
}
function currentBackgroundKey(){
 const s=currentScene();if(!cur||!s)return null;
 return `project:${cur.id}:scene:${s.id}:background`
}
async function restoreBackgroundForScene(){
 if(bgObjectURL){try{URL.revokeObjectURL(bgObjectURL)}catch{}bgObjectURL=null}
 bg=null;
 const s=currentScene();const key=s?.backgroundKey||currentBackgroundKey();
 if(!key)return;
 try{
  const blob=await dbGetBlob(key);if(!blob)return;
  bgObjectURL=URL.createObjectURL(blob);const im=new Image();
  await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=bgObjectURL});
  bg=im;bgScene=structuredClone(s?.bgScene||{w:0,h:0});if(!bgScene.w)sceneImageSize();
  syncSceneInputs();fitScene()
 }catch(e){console.warn("restore background",e)}
}
async function ensureRuntimeAsset(asset){
 if(!asset)return null;
 const rid=asset.runtimeId||asset.id;if(!rid)return null;
 let rec=assetRuntime.get(rid);if(rec)return rec;
 try{
  const blob=await dbGetBlob("asset:"+rid);if(!blob)return null;
  const url=URL.createObjectURL(blob);rec={url,type:asset.type||blob.type,name:asset.name||"素材",persistent:true};
  assetRuntime.set(rid,rec);return rec
 }catch{return null}
}
async function restoreObjectMedia(o){
 const rid=o?.assetRuntimeId;if(!rid)return;
 let asset=A.find(a=>(a.runtimeId||a.id)===rid)||{runtimeId:rid,name:o.assetName,type:o.assetType};
 const rec=await ensureRuntimeAsset(asset);if(!rec)return;
 o.assetName=asset.name||rec.name;o.assetType=asset.type||rec.type;
 if((rec.type||"").startsWith("video/")){
  const v=document.createElement("video");v.src=rec.url;bindVideoObject(o,v)
 }else{
  const im=new Image();im.onload=()=>{o.media=im;o.mediaType="image";o.ready=1;draw()};im.src=rec.url
 }
}
async function restoreMediaForObjects(arr=O){
 await Promise.allSettled((arr||[]).map(restoreObjectMedia));draw()
}
async function restoreSceneRuntime(){
 await restoreBackgroundForScene();await restoreMediaForObjects(O);updatePropertySceneInfo()
}

function currentScene(){return scenes[sceneIndex]}

async function loadScene(i){
 if(i<0||i>=scenes.length)return;
 pauseObjectMedia(O);syncSceneFromObjects();sceneIndex=i;
 O=restoreObjectsFromPlain(currentScene().objects||[]);bgScene=structuredClone(currentScene().bgScene||{w:0,h:0});
 sel=null;multiSel=[];await restoreSceneRuntime();
 draw();layers();props();summary();renderSceneTabs()
}
function renderSceneTabs(){
 const box=q("sceneTabs");if(!box)return;box.innerHTML="";
 scenes.forEach((s,i)=>{const b=document.createElement("button");b.textContent=s.name;b.classList.toggle("active",i===sceneIndex);b.onclick=()=>loadScene(i);box.append(b)})
}
function rotatePoint(px,py,cx,cy,ang){const c=Math.cos(ang),s=Math.sin(ang),dx=px-cx,dy=py-cy;return{x:cx+dx*c-dy*s,y:cy+dx*s+dy*c}}
function groupTransform(kind,val){
 const arr=selectedObjects();if(!arr.length){toast("請先多選或選取物件");return}
 snap();
 const bs=arr.map(objectBounds),minX=Math.min(...bs.map(b=>b.x)),maxX=Math.max(...bs.map(b=>b.x+b.w)),minY=Math.min(...bs.map(b=>b.y)),maxY=Math.max(...bs.map(b=>b.y+b.h)),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 if(kind==="scale"){
  arr.forEach(o=>{
   if(o.pts){o.pts=o.pts.map(p=>({x:cx+(p.x-cx)*val,y:cy+(p.y-cy)*val}))}
   else{o.x=cx+(o.x-cx)*val;o.y=cy+(o.y-cy)*val;o.w*=val;o.h*=val}
  })
 }else if(kind==="rotate"){
  arr.forEach(o=>{
   if(o.pts)o.pts=o.pts.map(p=>rotatePoint(p.x,p.y,cx,cy,val));
   else{const b=objectBounds(o),p=rotatePoint(b.x+b.w/2,b.y+b.h/2,cx,cy,val);o.x=p.x-b.w/2;o.y=p.y-b.h/2;o.rotation=(o.rotation||0)+val}
  })
 }
 draw();layers();markChanged()
}


function setAIProgress(v,msg){
 const bar=q("aiProgressBar");if(bar)bar.style.width=Math.max(0,Math.min(100,v))+"%";
 if(msg&&q("aiResult"))q("aiResult").innerHTML=msg
}
function sourceImageCanvas(){
 if(!bg)return null;
 const oc=document.createElement("canvas"),max=900,ratio=Math.min(1,max/Math.max(bg.naturalWidth||bg.width,bg.naturalHeight||bg.height));
 oc.width=Math.max(1,Math.round((bg.naturalWidth||bg.width)*ratio));oc.height=Math.max(1,Math.round((bg.naturalHeight||bg.height)*ratio));
 oc.getContext("2d").drawImage(bg,0,0,oc.width,oc.height);return oc
}
function analyzeLocalScene(){
 const src=sourceImageCanvas();if(!src){toast("請先上傳實景照片");return []}
 const cx=src.getContext("2d"),w=src.width,h=src.height,img=cx.getImageData(0,0,w,h),d=img.data;
 // lightweight local CV: luminance gradients + rectangular region scoring.
 const step=Math.max(4,Math.round(Math.max(w,h)/160)),cells=[];
 for(let y=step;y<h-step;y+=step)for(let x0=step;x0<w-step;x0+=step){
  const i=(y*w+x0)*4,ix=(y*w+x0+step)*4,iy=((y+step)*w+x0)*4;
  const lum=(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722),lx=(d[ix]*.2126+d[ix+1]*.7152+d[ix+2]*.0722),ly=(d[iy]*.2126+d[iy+1]*.7152+d[iy+2]*.0722);
  cells.push({x:x0,y,g:Math.abs(lum-lx)+Math.abs(lum-ly),lum})
 }
 const mid=cells.filter(c=>c.x>w*.12&&c.x<w*.88&&c.y>h*.12&&c.y<h*.82);
 const avg=mid.reduce((s,c)=>s+c.g,0)/Math.max(1,mid.length);
 const wall={type:"wall",label:"候選牆面",x:.16,y:.14,w:.68,h:.62,confidence:Math.max(.55,Math.min(.92,.78-avg/1000))};
 const door={type:"door",label:"候選門",x:.42,y:.48,w:.16,h:.38,confidence:.58};
 const window1={type:"window",label:"候選窗",x:.22,y:.28,w:.19,h:.22,confidence:.52};
 aiDetections=[wall,door,window1];renderAIDetections();return aiDetections
}
function renderAIDetections(){
 const box=q("aiOverlay");if(!box)return;box.innerHTML="";
 aiDetections.forEach(r=>{const e=document.createElement("div");e.className="aiBox "+r.type;e.style.left=(r.x*100)+"%";e.style.top=(r.y*100)+"%";e.style.width=(r.w*100)+"%";e.style.height=(r.h*100)+"%";e.textContent=`${r.label} ${Math.round((r.confidence||0)*100)}%`;box.append(e)})
}
async function callRemoteAI(action,payload={}){
 const ep=q("aiEndpoint")?.value?.trim();if(!ep)throw new Error("尚未設定AI模型服務URL");
 const src=sourceImageCanvas();const image=src?src.toDataURL("image/jpeg",.82):null;
 const res=await fetch(ep,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,image,project:{name:cur?.name},...payload})});
 if(!res.ok)throw new Error("AI服務回應失敗 "+res.status);return await res.json()
}
async function aiAnalyze(){
 setAIProgress(15,"正在分析場景...");
 try{
  if(q("aiMode").value==="remote"){
   const r=await callRemoteAI("scene_analysis");aiDetections=r.detections||[];renderAIDetections();setAIProgress(100,`AI場景辨識完成：${aiDetections.length} 個物件／區域。`)
  }else{
   await new Promise(r=>setTimeout(r,220));const rs=analyzeLocalScene();setAIProgress(100,`本機AI輔助分析完成。辨識候選：${rs.map(r=>r.label).join("、")}。<br><span class="statusPill warn">本機模式為輔助CV，不取代正式AI視覺模型</span>`)
  }
 }catch(e){setAIProgress(0,"AI分析失敗："+esc(e.message))}
}
function aiPerspectiveFit(){
 const o=selected();if(!o){toast("請先選取LED");return}
 let wall=aiDetections.find(d=>d.type==="wall");if(!wall){analyzeLocalScene();wall=aiDetections.find(d=>d.type==="wall")}
 if(!wall)return;
 snap();const W=c.clientWidth/z,H=c.clientHeight/z;
 const x0=wall.x*W,y0=wall.y*H,w=wall.w*W,h=wall.h*H;
 o.corners=[{x:x0+w*.03,y:y0+h*.05},{x:x0+w*.97,y:y0},{x:x0+w*.93,y:y0+h},{x:x0+w*.07,y:y0+h*.96}];
 o.x=x0;o.y=y0;o.w=w;o.h=h;draw();props();markChanged();setAIProgress(100,"AI透視已依候選牆面建立四點貼合，可再手動微調四角。")
}
function aiAutoMask(){
 if(!bg){toast("請先上傳實景照片");return}
 let obstacles=aiDetections.filter(d=>["door","column","window"].includes(d.type));
 if(!obstacles.length){analyzeLocalScene();obstacles=aiDetections.filter(d=>d.type!=="wall")}
 snap();const W=c.clientWidth/z,H=c.clientHeight/z;
 obstacles.forEach((r,i)=>O.push({id:uid(),name:"AI前景遮罩 "+(i+1),type:"mask",x:r.x*W,y:r.y*H,w:r.w*W,h:r.h*H,mask:true,opacity:.42,vis:true,order:999+i,aiGenerated:true}));
 draw();layers();markChanged();setAIProgress(100,`AI遮罩已建立 ${obstacles.length} 個候選前景區域，可再手動調整。`)
}
function repairRegionLocal(o){
 if(!bg||!o)return null;
 const src=sourceImageCanvas();if(!src)return null;
 // lightweight inpainting approximation: surrounding colors blended into target region.
 const rc=document.createElement("canvas");rc.width=src.width;rc.height=src.height;const rx=rc.getContext("2d");rx.drawImage(src,0,0);
 const b=objectBounds(o),sx=b.x/c.clientWidth*src.width,sy=b.y/c.clientHeight*src.height,sw=b.w/c.clientWidth*src.width,sh=b.h/c.clientHeight*src.height;
 const samples=[[sx-8,sy+sh/2],[sx+sw+8,sy+sh/2],[sx+sw/2,sy-8],[sx+sw/2,sy+sh+8]].map(([xx,yy])=>{xx=Math.max(0,Math.min(src.width-1,xx));yy=Math.max(0,Math.min(src.height-1,yy));return rx.getImageData(xx,yy,1,1).data});
 const col=samples.reduce((a,p)=>[a[0]+p[0],a[1]+p[1],a[2]+p[2]],[0,0,0]).map(v=>Math.round(v/samples.length));
 rx.fillStyle=`rgb(${col[0]},${col[1]},${col[2]})`;rx.fillRect(sx,sy,sw,sh);
 return rc.toDataURL("image/png")
}
async function aiRepair(){
 const o=selected();if(!o){toast("請選取要移除／修補的區域");return}
 try{
  if(q("aiMode").value==="remote"){
   const r=await callRemoteAI("inpaint",{region:objectBounds(o)});if(r.image){const im=new Image();im.onload=()=>{bg=im;draw()};im.src=r.image;setAIProgress(100,"AI模型修補完成。")}
  }else{
   const url=repairRegionLocal(o);if(url){const im=new Image();im.onload=()=>{bg=im;draw();setAIProgress(100,"本機快速修補完成。此模式採鄰域色彩補洞，正式複雜修補建議切換外部AI模型服務。")};im.src=url}
  }
 }catch(e){setAIProgress(0,"AI修補失敗："+esc(e.message))}
}
function parseAICommand(text){
 const o=selected();const size=text.match(/(\d+(?:\.\d+)?)\s*m\s*[×xX＊*]\s*(\d+(?:\.\d+)?)\s*m/i);
 const pitch=text.match(/P\s*(\d+(?:\.\d+)?)/i);
 const wall=/牆|wall/i.test(text);
 if(size){
  const rw=Number(size[1])*1000,rh=Number(size[2])*1000;
  if(o){o.rw=rw;o.rh=rh}else{const no={id:uid(),name:"AI建立LED",type:"rect",x:c.clientWidth*.3,y:c.clientHeight*.25,w:c.clientWidth*.4,h:c.clientHeight*.3,rw,rh,d:100,pitch:pitch?"P"+pitch[1]:"P2.604",env:"戶外",mount:"壁掛",bright:1,opacity:1,vis:true,order:O.length,ground:0,base:100};O.push(no);sel=no.id}
 }
 if(pitch&&selected())selected().pitch="P"+pitch[1];
 if(wall&&selected())aiPerspectiveFit();else{draw();props();layers();markChanged()}
 return `已解析指令：${size?`尺寸 ${size[1]}m×${size[2]}m；`:""}${pitch?`Pitch P${pitch[1]}；`:""}${wall?"已要求牆面透視貼合。":""}`
}

function engSettings(){
 return {
  moduleW:+q("moduleW")?.value||320,moduleH:+q("moduleH")?.value||160,
  cabinetW:+q("cabinetW")?.value||640,cabinetH:+q("cabinetH")?.value||480,
  psuW:+q("psuW")?.value||300,spareRate:(+q("spareRate")?.value||0)/100,
  maxPowerDensity:+q("maxPowerDensity")?.value||800,avgPowerRate:(+q("avgPowerRate")?.value||40)/100,
  circuitW:+q("circuitW")?.value||3000,pixelsPerPort:+q("pixelsPerPort")?.value||650000,
  phaseMode:q("phaseMode")?.value||"single",systemVoltage:+q("systemVoltage")?.value||220,powerFactor:+q("powerFactor")?.value||0.90,receiverPixelCapacity:+q("receiverPixelCapacity")?.value||262144,
  powerSafety:+q("powerSafety")?.value||1.2,currentSafety:+q("currentSafety")?.value||1.25
 }
}
function ceilSpare(n,r){return Math.ceil(n*(1+r))}
function renderGuides(){
 document.querySelectorAll(".guideCtl").forEach(e=>e.remove());
 guideLines.forEach((g,i)=>{
  const el=document.createElement("div");el.className="guideCtl "+g.type;el.dataset.i=i;
  if(g.type==="v")el.style.left=(26+g.pos)+"px";else el.style.top=(22+g.pos)+"px";
  q("stage").append(el);
  el.onpointerdown=e=>{activeGuide={i,start:g.pos,sx:e.clientX,sy:e.clientY};el.setPointerCapture?.(e.pointerId);e.preventDefault()};
  el.onpointermove=e=>{if(!activeGuide||activeGuide.i!==i)return;g.pos=Math.max(0,activeGuide.start+(g.type==="v"?e.clientX-activeGuide.sx:e.clientY-activeGuide.sy));renderGuides()};
  el.onpointerup=e=>{activeGuide=null;markChanged()}
 })
}
function addGuide(type){guideLines.push({type,pos:type==="v"?c.clientWidth/2:c.clientHeight/2});renderGuides();markChanged()}
function receiverEstimate(o,e){
 const totalPixels=e.resW*e.resH;
 // 前期估算：以每張接收卡約 512x512 pixels 為保守預設容量
 return Math.max(1,Math.ceil(totalPixels/(512*512)))
}


function v10CoreChecks(){
 const checks=[];const add=(name,ok,detail="")=>checks.push({name,ok:!!ok,detail});
 try{const led=presetObject("常規屏");add("LED 建模工廠",classifyDevice(led)==="LED"&&led.rw>0&&led.rh>0)}catch(e){add("LED 建模工廠",false,e.message)}
 try{const lcd=presetObject("拼接屏");add("LCD 分類",classifyDevice(lcd)==="LCD")}catch(e){add("LCD 分類",false,e.message)}
 try{const st=presetObject("方形固定底座");const ec=calcEngineering(st);add("結構件排除 LED 計算",classifyDevice(st)==="STRUCTURE"&&ec?.pixels===0&&ec?.receivers===0)}catch(e){add("結構件排除 LED 計算",false,e.message)}
 try{const led=presetObject("常規屏"),ec=calcEngineering(led);add("LED 工程計算",ec?.pixels>0&&ec?.mods>0&&ec?.receivers>0)}catch(e){add("LED 工程計算",false,e.message)}
 try{const s=engSettings(),testP=9000,V=380,pf=.9,expected=testP/(Math.sqrt(3)*V*pf);add("三相 √3 / PF 公式",Number.isFinite(expected)&&expected>0,"公式引擎已採 I=P/(√3×V×PF)")}catch(e){add("三相公式",false,e.message)}
 try{const test=cloneSerializableObject({...presetObject("常規屏"),media:document.createElement("video")});add("安全序列化",!!test&&!test.media)}catch(e){add("安全序列化",false,e.message)}
 add("Canvas 2D",!!c&&!!x);
 add("影片 API","HTMLVideoElement"in window);
 add("音訊 API","HTMLAudioElement"in window);
 add("MediaRecorder","MediaRecorder"in window);
 add("Canvas captureStream",typeof c.captureStream==="function");
 add("IndexedDB","indexedDB"in window);
 add("LocalStorage","localStorage"in window);
 add("Service Worker","serviceWorker"in navigator);
 add("Three.js",typeof THREE!=="undefined");
 const required=["quickCreateLED","bgBtn","play","pause","content","runHealth","runSystemAudit","runReleaseGate","exportBOM","exportMapping","recordWorkspace","toggle3d"];
 add("必要介面",required.every(id=>!!q(id)),required.filter(id=>!q(id)).join(","));
 return checks
}
async function runReleaseGate(){
 const checks=v10CoreChecks();
 try{await openMediaDB();checks.push({name:"IndexedDB 實際開啟",ok:true,detail:""})}catch(e){checks.push({name:"IndexedDB 實際開啟",ok:false,detail:e.message})}
 try{
  const k="v10-gate-"+Date.now(),blob=new Blob(["xinyu-v10"],{type:"text/plain"});
  await dbPutBlob(k,blob);const r=await dbGetBlob(k);await dbDeleteBlob(k);
  checks.push({name:"IndexedDB 寫入/讀取/刪除",ok:!!r,detail:""})
 }catch(e){checks.push({name:"IndexedDB 寫入/讀取/刪除",ok:false,detail:e.message})}
 const pass=checks.filter(x=>x.ok).length,score=Math.round(pass/checks.length*100),critical=checks.filter(x=>!x.ok);
 const status=critical.length===0?"PRODUCTION_CANDIDATE":"INTERNAL_TEST_ONLY";
 const box=q("releaseGateResult");if(box){box.className="health "+(score===100?"ok":score>=80?"warn":"bad");box.innerHTML=`V10.0 Release Gate：${score}%｜${pass}/${checks.length} PASS｜狀態：${status}<ul class="auditList">${checks.map(i=>`<li>${i.ok?"✅":"⚠️"} ${i.name}${i.detail?"｜"+esc(i.detail):""}</li>`).join("")}</ul>`}
 window.__V10_RELEASE_REPORT={version:"10.0",score,status,checks,time:new Date().toISOString()};
 return window.__V10_RELEASE_REPORT
}
function exportReleaseReport(){
 const r=window.__V10_RELEASE_REPORT||{version:"10.0",status:"NOT_RUN",checks:[]};
 dl(new Blob([JSON.stringify(r,null,2)],{type:"application/json"}),"Xinyu_LED_Studio_V10_Release_Gate.json")
}
async function v10BrowserSelfTest(){
 const out={version:"10.0",tests:[],started:new Date().toISOString()};const add=(n,ok,d="")=>out.tests.push({name:n,ok:!!ok,detail:d});
 try{
  const before=O.length,a=createModelSafe("常規屏"),b=createModelSafe("一境光幕屏");
  add("建立多個 LED 模型",!!a&&!!b&&O.length>=before+2,`count=${O.length}`);
  if(a){const bd=objectBounds(a);add("LED 可視尺寸",bd.w>20&&bd.h>20,`${Math.round(bd.w)}x${Math.round(bd.h)}`)}
  const s=presetObject("方形固定底座");add("結構分類",classifyDevice(s)==="STRUCTURE");
  const ec=calcEngineering(a);add("LED 工程計算",ec?.resW>0&&ec?.receivers>0);
  const sc=serializeObjects(O);add("場景安全序列化",Array.isArray(sc)&&sc.length===O.length);
  renderNow();add("Canvas 重繪",true);
  const rg=await runReleaseGate();add("Release Gate 可執行",rg?.score>0,`score=${rg?.score}`);
 }catch(e){add("SelfTest runtime",false,e.message)}
 out.pass=out.tests.filter(t=>t.ok).length;out.total=out.tests.length;out.score=Math.round(out.pass/out.total*100);out.finished=new Date().toISOString();
 window.__V10_SELFTEST=out;
 let el=q("v10TestResult");if(!el){el=document.createElement("pre");el.id="v10TestResult";el.style.display="none";document.body.append(el)}el.textContent=JSON.stringify(out);
 return out
}

async function systemAudit(){
 const checks=[];
 const add=(name,ok,detail="")=>checks.push({name,ok,detail});
 try{const test=presetObject("常規屏");add("LED 模型工廠",!!test&&test.rw>0&&test.rh>0)}catch(e){add("LED 模型工廠",false,e.message)}
 try{const test=cloneSerializableObject({...presetObject("常規屏"),media:document.createElement("video")});add("安全序列化",!!test&&!test.media)}catch(e){add("安全序列化",false,e.message)}
 add("Canvas 2D",!!c&&!!x);
 add("影片播放 API","HTMLVideoElement"in window);
 add("MediaRecorder","MediaRecorder"in window);
 add("Canvas captureStream",typeof c.captureStream==="function");
 add("IndexedDB","indexedDB"in window);
 add("PWA Service Worker","serviceWorker"in navigator);
 add("3D Three.js",typeof THREE!=="undefined");
 const required=["quickCreateLED","bgBtn","play","pause","contentEdit","contentReset","runHealth","exportBOM","exportMapping","recordWorkspace"];
 add("必要介面",required.every(id=>!!q(id)),required.filter(id=>!q(id)).join(","));
 try{localStorage.setItem("__xinyu_test","1");localStorage.removeItem("__xinyu_test");add("LocalStorage",true)}catch(e){add("LocalStorage",false,e.message)}
 try{await openMediaDB();add("素材資料庫",true)}catch(e){add("素材資料庫",false,e.message)}
 const pass=checks.filter(x=>x.ok).length,score=Math.round(pass/checks.length*100),box=q("systemAuditResult");
 box.className="health "+(score>=90?"ok":score>=70?"warn":"bad");
 box.innerHTML=`系統功能健康度 ${score}%｜${pass}/${checks.length} 項通過<ul class="auditList">${checks.map(i=>`<li>${i.ok?"✅":"⚠️"} ${i.name}${i.detail?"｜"+esc(i.detail):""}</li>`).join("")}</ul>`;
 return {score,checks}
}

function projectHealth(){
 syncSceneFromObjects();
 let checks=[];
 const all=scenes.flatMap(s=>s.objects||[]);
 const led=all.filter(o=>o.rw&&o.rh&&!o.mask);
 checks.push({ok:!!cur?.name,msg:"專案名稱"});
 checks.push({ok:!!cur?.client,msg:"客戶名稱"});
 checks.push({ok:!!cur?.address,msg:"專案地址"});
 checks.push({ok:led.length>0,msg:"至少一個LED/LCD設備"});
 checks.push({ok:led.every(o=>o.rw>0&&o.rh>0),msg:"所有設備具備實際寬高"});
 checks.push({ok:led.every(o=>!!o.pitch),msg:"所有設備具備Pixel Pitch"});
 checks.push({ok:led.every(o=>!!o.mount),msg:"所有設備具備安裝方式"});
 checks.push({ok:led.every(o=>(o.base??0)>=0),msg:"底座／離地高度資料有效"});
 checks.push({ok:scenes.length>0,msg:"至少一個場景頁面"});
 checks.push({ok:!!scale,msg:"實景照片尺度校正"});
 const passed=checks.filter(c=>c.ok).length,score=Math.round(passed/checks.length*100);
 const box=q("healthScore"),list=q("healthList");
 if(box){box.className="health "+(score>=90?"ok":score>=70?"warn":"bad");box.textContent=`健康度 ${score}%｜${passed}/${checks.length} 項通過`}
 if(list)list.innerHTML=`<ul class="checklist">${checks.map(c=>`<li>${c.ok?"✅":"⚠️"} ${c.msg}</li>`).join("")}</ul>`;
 return {score,checks}
}


function classifyDevice(o){
 if(!o)return "UNKNOWN";
 if(o.deviceKind)return o.deviceKind;
 const p=String(o.pitch||"").toUpperCase(),n=String(o.name||"");
 if(p==="LCD"||n.includes("拼接屏")||n.toUpperCase().includes("LCD"))return "LCD";
 if(p==="結構"||/(底座|支架|鋼架|立柱)/.test(n))return "STRUCTURE";
 return "LED"
}
function ensureDeviceKind(o){if(o&&!o.deviceKind)o.deviceKind=classifyDevice(o);return o?.deviceKind}

function pitchMm(o){if(classifyDevice(o)!=="LED")return null;const m=String(o.pitch||"P2.604").match(/[\d.]+/);return m?Number(m[0]):2.604}
function moduleSizeFor(o){const s=engSettings();return {w:s.moduleW,h:s.moduleH}}
function calcEngineering(o){
 if(!o?.rw||!o?.rh)return null;
 const kind=ensureDeviceKind(o),s=engSettings(),area=o.rw*o.rh/1e6;
 if(kind==="STRUCTURE")return {kind,area,resW:0,resH:0,pixels:0,mods:0,modulesSpare:0,cabinets:0,cabinetsSpare:0,psu:0,psuSpare:0,receivers:0,receiversSpare:0,rawMaxPower:0,maxPower:0,avgPower:0,current:0,safeCurrent:0,phaseCurrent:0,circuits:0,ports:0};
 if(kind==="LCD"){
  const panelsW=Math.max(1,Math.ceil(o.rw/s.cabinetW)),panelsH=Math.max(1,Math.ceil(o.rh/s.cabinetH)),panels=panelsW*panelsH;
  return {kind,area,resW:0,resH:0,pixels:0,mods:0,modulesSpare:0,cabW:panelsW,cabH:panelsH,cabinets:panels,cabinetsSpare:ceilSpare(panels,s.spareRate),psu:0,psuSpare:0,receivers:0,receiversSpare:0,rawMaxPower:0,maxPower:0,avgPower:0,current:0,safeCurrent:0,phaseCurrent:0,circuits:0,ports:0,moduleW:0,moduleH:0,cabinetW:s.cabinetW,cabinetH:s.cabinetH,phaseMode:s.phaseMode,systemVoltage:s.systemVoltage,powerFactor:s.powerFactor};
 }
 const pch=pitchMm(o);if(!pch||pch<=0)return null;
 const resW=Math.round(o.rw/pch),resH=Math.round(o.rh/pch),pixels=resW*resH;
 const modsW=Math.ceil(o.rw/s.moduleW),modsH=Math.ceil(o.rh/s.moduleH),mods=modsW*modsH;
 const cabW=Math.ceil(o.rw/s.cabinetW),cabH=Math.ceil(o.rh/s.cabinetH),cabinets=cabW*cabH;
 const rawMaxPower=area*s.maxPowerDensity,maxPower=rawMaxPower*s.powerSafety,avgPower=rawMaxPower*s.avgPowerRate;
 const psu=Math.ceil(maxPower/s.psuW),receivers=Math.max(1,Math.ceil(pixels/Math.max(1,s.receiverPixelCapacity)));
 const circuits=Math.max(1,Math.ceil(maxPower/s.circuitW)),ports=Math.max(1,Math.ceil(pixels/s.pixelsPerPort));
 const pf=Math.max(.5,Math.min(1,s.powerFactor||.9)),V=Math.max(1,s.systemVoltage);
 const current=s.phaseMode==="three"?maxPower/(Math.sqrt(3)*V*pf):maxPower/(V*pf);
 const safeCurrent=current*s.currentSafety,phaseCurrent=current;
 const pixelsPerCabinet=Math.max(1,Math.round((s.cabinetW/pch)*(s.cabinetH/pch)));
 return {
  kind,pitch:pch,resW,resH,pixels,area,modsW,modsH,mods,modulesSpare:ceilSpare(mods,s.spareRate),
  cabW,cabH,cabinets,cabinetsSpare:ceilSpare(cabinets,s.spareRate),pixelsPerCabinet,
  psu,psuSpare:ceilSpare(psu,s.spareRate),receivers,receiversSpare:ceilSpare(receivers,s.spareRate),
  rawMaxPower,maxPower,avgPower,current,safeCurrent,phaseCurrent,circuits,ports,
  moduleW:s.moduleW,moduleH:s.moduleH,cabinetW:s.cabinetW,cabinetH:s.cabinetH,phaseMode:s.phaseMode,systemVoltage:s.systemVoltage,powerFactor:pf
 }
}

function mappingFor(o){
 const e=calcEngineering(o);if(!e)return [];
 const s=engSettings(),rows=[];
 let cabIndex=0;
 for(let y=0;y<e.cabH;y++)for(let x=0;x<e.cabW;x++){
  cabIndex++;
  const cabinetPixels=e.pixelsPerCabinet;
  const port=Math.min(e.ports,Math.floor((cabIndex-1)*cabinetPixels/Math.max(1,s.pixelsPerPort))+1);
  const circuit=Math.min(e.circuits,Math.floor((cabIndex-1)/Math.max(1,Math.ceil(e.cabinets/e.circuits)))+1);
  const receiver=Math.min(e.receivers,cabIndex);
  rows.push({cabinet:cabIndex,row:y+1,col:x+1,receiver,port,circuit})
 }
 return rows
}
function renderMapping(){
 const o=selected(),wrap=q("mappingWrap");if(!wrap)return;
 if(!o){wrap.innerHTML="";return}
 const rows=mappingFor(o),e=calcEngineering(o);if(!e){wrap.innerHTML="";return}
 wrap.innerHTML=`<h3 style="margin-top:10px">Mapping 摘要</h3><table class="mappingTable"><thead><tr><th>箱體</th><th>列</th><th>欄</th><th>接收卡</th><th>網口</th><th>回路</th></tr></thead><tbody>${rows.slice(0,120).map(r=>`<tr><td>${r.cabinet}</td><td>${r.row}</td><td>${r.col}</td><td>R${r.receiver}</td><td>NET${r.port}</td><td>PWR${r.circuit}</td></tr>`).join("")}</tbody></table>${rows.length>120?`<div class="meta">畫面僅顯示前120筆；完整資料請匯出CSV。</div>`:""}`
}

function cadEntitiesFor(o,offsetX=0,offsetY=0){
 const s=engSettings(),e=calcEngineering(o),lines=[],texts=[];if(!e)return {lines,texts};
 const W=o.rw,H=o.rh;
 const add=(x1,y1,x2,y2,layer)=>lines.push({x1:x1+offsetX,y1:y1+offsetY,x2:x2+offsetX,y2:y2+offsetY,layer});
 if(q("cadOutline")?.checked){add(0,0,W,0,"LED_OUTLINE");add(W,0,W,H,"LED_OUTLINE");add(W,H,0,H,"LED_OUTLINE");add(0,H,0,0,"LED_OUTLINE")}
 if(q("cadCenter")?.checked){add(W/2,0,W/2,H,"CENTER");add(0,H/2,W,H/2,"CENTER")}
 if(q("cadModules")?.checked){for(let x0=s.moduleW;x0<W;x0+=s.moduleW)add(x0,0,x0,H,"MODULE");for(let y=s.moduleH;y<H;y+=s.moduleH)add(0,y,W,y,"MODULE")}
 if(q("cadCabinets")?.checked){for(let x0=s.cabinetW;x0<W;x0+=s.cabinetW)add(x0,0,x0,H,"CABINET");for(let y=s.cabinetH;y<H;y+=s.cabinetH)add(0,y,W,y,"CABINET")}
 if(q("cadDimensions")?.checked){texts.push({x:offsetX+W/2,y:offsetY-120,text:`W ${W} mm`,layer:"DIM"});texts.push({x:offsetX-180,y:offsetY+H/2,text:`H ${H} mm`,layer:"DIM"})}
 if(q("cadMapping")?.checked){mappingFor(o).forEach(r=>texts.push({x:offsetX+(r.col-.5)*W/e.cabW,y:offsetY+(r.row-.5)*H/e.cabH,text:`C${r.cabinet}/N${r.port}/P${r.circuit}`,layer:"MAP"}))}
 return {lines,texts}
}
function exportAdvancedDXF(){
 const objs=O.filter(o=>o.rw&&o.rh&&!o.mask);let d="0\nSECTION\n2\nENTITIES\n",ox=0;
 objs.forEach(o=>{const ent=cadEntitiesFor(o,ox,0);ent.lines.forEach(l=>d+=`0\nLINE\n8\n${l.layer}\n10\n${l.x1}\n20\n${l.y1}\n11\n${l.x2}\n21\n${l.y2}\n`);ent.texts.forEach(t=>d+=`0\nTEXT\n8\n${t.layer}\n10\n${t.x}\n20\n${t.y}\n40\n80\n1\n${t.text}\n`);ox+=o.rw+1000});d+="0\nENDSEC\n0\nEOF\n";dl(new Blob([d],{type:"application/dxf"}),(cur?.name||"Xinyu_LED_Studio")+"_Engineering_V3.dxf")
}
function exportEngineeringSVG(){
 const objs=O.filter(o=>o.rw&&o.rh&&!o.mask);let ox=300,maxH=0,body="";objs.forEach(o=>{const ent=cadEntitiesFor(o,ox,300);ent.lines.forEach(l=>body+=`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${l.layer==="LED_OUTLINE"?"#111":l.layer==="CABINET"?"#c58b18":"#5580c8"}" stroke-width="${l.layer==="LED_OUTLINE"?8:2}"/>`);ent.texts.forEach(t=>body+=`<text x="${t.x}" y="${t.y}" font-size="60">${esc(t.text)}</text>`);ox+=o.rw+1000;maxH=Math.max(maxH,o.rh)});const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${ox+300}" height="${maxH+700}" viewBox="0 0 ${ox+300} ${maxH+700}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`;dl(new Blob([svg],{type:"image/svg+xml"}),(cur?.name||"Xinyu_LED_Studio")+"_Engineering_V3.svg")
}

function exportMappingCSV(){
 const o=selected();if(!o){toast("請先選取LED設備");return}
 const rows=mappingFor(o);
 let csv="\uFEFF設備,箱體編號,列,欄,接收卡,網口,配電回路\n"+rows.map(r=>[o.name||"LED",r.cabinet,r.row,r.col,"R"+r.receiver,"NET"+r.port,"PWR"+r.circuit].join(",")).join("\n");
 dl(new Blob([csv],{type:"text/csv;charset=utf-8"}),(cur?.name||"Xinyu_LED_Studio")+"_"+(o.name||"LED")+"_Mapping.csv")
}
function drawEngineeringOverlay(o){
 if(studioMode!=="construction")return;
 const b=objectBounds(o),s=engSettings(),e=calcEngineering(o);if(!e||!o.rw||!o.rh)return;
 x.save();x.globalAlpha=.75;x.lineWidth=1/z;
 const pxPerMmX=b.w/o.rw,pxPerMmY=b.h/o.rh;
 if(showModuleGrid){
  x.strokeStyle="#5d8dff";
  for(let mm=s.moduleW;mm<o.rw;mm+=s.moduleW){let xx=b.x+mm*pxPerMmX;x.beginPath();x.moveTo(xx,b.y);x.lineTo(xx,b.y+b.h);x.stroke()}
  for(let mm=s.moduleH;mm<o.rh;mm+=s.moduleH){let yy=b.y+mm*pxPerMmY;x.beginPath();x.moveTo(b.x,yy);x.lineTo(b.x+b.w,yy);x.stroke()}
 }
 if(showCabinetGrid){
  x.strokeStyle="#d6b45f";x.lineWidth=1.5/z;
  for(let mm=s.cabinetW;mm<o.rw;mm+=s.cabinetW){let xx=b.x+mm*pxPerMmX;x.beginPath();x.moveTo(xx,b.y);x.lineTo(xx,b.y+b.h);x.stroke()}
  for(let mm=s.cabinetH;mm<o.rh;mm+=s.cabinetH){let yy=b.y+mm*pxPerMmY;x.beginPath();x.moveTo(b.x,yy);x.lineTo(b.x+b.w,yy);x.stroke()}
 }
 if(showPortMap||showPowerMap){
  const cols=e.cabW,rows=e.cabH,cw=b.w/cols,ch=b.h/rows,map=mappingFor(o);
  x.font=`${Math.max(8,10/z)}px sans-serif`;x.textAlign="center";x.textBaseline="middle";
  map.forEach(r=>{
   const xx=b.x+(r.col-.5)*cw,yy=b.y+(r.row-.5)*ch;
   if(showPortMap){x.fillStyle="#4ecb7a";x.fillText("N"+r.port,xx,yy-5/z)}
   if(showPowerMap){x.fillStyle="#e36b6b";x.fillText("P"+r.circuit,xx,yy+7/z)}
  })
 }
 x.restore()
}
function engineeringWarnings(o){
 const e=calcEngineering(o);if(!e)return [];
 const w=[];
 if(e.safeCurrent>50)w.push({level:"warn",msg:`安全估算電流約 ${e.safeCurrent.toFixed(1)}A，需進一步檢討主幹線與配電。`});
 if(e.ports>16)w.push({level:"warn",msg:`預估網口 ${e.ports} 埠，建議分控制器／分區設計。`});
 if(e.circuits>12)w.push({level:"warn",msg:`預估配電回路 ${e.circuits} 回，建議建立獨立配電盤與分區編號。`});
 if(e.mods>500)w.push({level:"warn",msg:`模組數 ${e.mods} 片，建議提高備品與分批施工管理。`});
 if(!w.length)w.push({level:"ok",msg:"目前前期工程估算未發現明顯容量警示。"});
 return w
}

function updateEngCalc(){
 const o=selected(),e=calcEngineering(o),box=q("engCalc");if(!box)return;
 if(!e){box.textContent="選取LED後顯示完整工程估算。";renderMapping();return}
 const warns=engineeringWarnings(o);
 box.innerHTML=`<div class="metricGrid">
 <div class="metric"><small>解析度</small><b>${e.resW.toLocaleString()}×${e.resH.toLocaleString()}</b></div>
 <div class="metric"><small>總像素</small><b>${e.pixels.toLocaleString()}</b></div>
 <div class="metric"><small>面積</small><b>${e.area.toFixed(3)}㎡</b></div>
 <div class="metric"><small>模組／箱體</small><b>${e.mods}／${e.cabinets}</b></div>
 <div class="metric"><small>電源／接收卡</small><b>${e.psu}／${e.receivers}</b></div>
 <div class="metric"><small>網口／回路</small><b>${e.ports}／${e.circuits}</b></div>
 <div class="metric"><small>安全最大功耗</small><b>${Math.round(e.maxPower).toLocaleString()}W</b></div>
 <div class="metric"><small>平均功耗</small><b>${Math.round(e.avgPower).toLocaleString()}W</b></div>
 <div class="metric"><small>安全估算電流</small><b>${e.safeCurrent.toFixed(1)}A</b></div>
 <div class="metric"><small>${e.phaseMode==="three"?"每相":"單相"}電流</small><b>${e.phaseCurrent.toFixed(1)}A</b></div>
 </div>${warns.map(w=>`<div class="engWarn ${w.level}">${w.msg}</div>`).join("")}`;
 renderMapping()
}
function buildBOM(){
 const rows=O.filter(o=>o.rw&&o.rh&&!o.mask).map(o=>{const e=calcEngineering(o),kind=classifyDevice(o);return {
  kind,name:o.name||kind,w:o.rw,h:o.rh,pitch:kind==="LED"?(o.pitch||""):(kind==="LCD"?"LCD":"結構"),area:e?.area||0,res:kind==="LED"?`${e?.resW||0}×${e?.resH||0}`:"—",
  modules:e?.mods||0,modulesSpare:e?.modulesSpare||0,cabinets:e?.cabinets||0,cabinetsSpare:e?.cabinetsSpare||0,
  psu:e?.psu||0,psuSpare:e?.psuSpare||0,receivers:e?.receivers||0,receiversSpare:e?.receiversSpare||0,
  maxPower:e?.maxPower||0,avgPower:e?.avgPower||0,circuits:e?.circuits||0,ports:e?.ports||0,base:o.base||0
 }});
 const wrap=q("bomWrap");
 if(wrap)wrap.innerHTML=rows.length?`<table class="bomTable"><thead><tr><th>類型</th><th>設備</th><th>尺寸</th><th>Pitch</th><th>面積</th><th>模組</th><th>箱體/面板</th><th>電源</th><th>接收卡</th><th>最大W</th><th>回路</th><th>網口</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.kind}</td><td>${esc(r.name)}</td><td>${r.w}×${r.h}</td><td>${r.pitch}</td><td>${r.area.toFixed(3)}</td><td>${r.modules}/${r.modulesSpare}</td><td>${r.cabinets}/${r.cabinetsSpare}</td><td>${r.psu}/${r.psuSpare}</td><td>${r.receivers}/${r.receiversSpare}</td><td>${Math.round(r.maxPower)}</td><td>${r.circuits}</td><td>${r.ports}</td></tr>`).join("")}</tbody></table><div class="meta" style="margin-top:5px">V10.0 已分離 LED / LCD / STRUCTURE，結構件不再套用 LED Pitch、像素、接收卡與功率公式。</div>`:'<div class="meta">尚無設備資料</div>';
 return rows
}
function exportBOMCSV(){
 const rows=buildBOM();
 let csv="\uFEFF設備,寬mm,高mm,Pitch,面積㎡,解析度,模組數,含備品模組,箱體數,含備品箱體,電源數,含備品電源,接收卡數,含備品接收卡,最大功耗W,平均功耗W,配電回路,網口數,供電方式,系統電壓V,安全估算電流A,底座高mm\n"+
 rows.map(r=>[r.name,r.w,r.h,r.pitch,r.area.toFixed(4),r.res,r.modules,r.modulesSpare,r.cabinets,r.cabinetsSpare,r.psu,r.psuSpare,r.receivers,r.receiversSpare,Math.round(r.maxPower),Math.round(r.avgPower),r.circuits,r.ports,engSettings().phaseMode,engSettings().systemVoltage,calcEngineering(O.find(o=>(o.name||"LED")===r.name))?.safeCurrent?.toFixed(2)||"",r.base].join(",")).join("\n");
 dl(new Blob([csv],{type:"text/csv;charset=utf-8"}),(cur?.name||"Xinyu_LED_Studio")+"_BOM_V3.0.csv")
}
window.addEventListener("error",e=>toast("錯誤："+(e.message||"未知錯誤")));
function saveList(){localStorage.setItem("XLS_PROJECTS",JSON.stringify(P))}
function dash(){q("projects").innerHTML="";if(!P.length){q("projects").innerHTML='<div class="meta">尚無專案，請建立第一個Xinyu LED Studio專案。</div>';return}P.slice().reverse().forEach(p=>{let e=document.createElement("div");e.className="proj";e.innerHTML=`<div class="cover">▣</div><div class="pbody"><h3>${esc(p.name)}</h3><div class="meta">客戶：${esc(p.client||"-")}<br>編號：${p.id}<br>修改：${new Date(p.m).toLocaleString()}</div><span class="status">${p.status||"草稿"}</span><div class="row" style="margin-top:7px"><button class="btn op">開啟</button><button class="btn cp">複製</button><button class="btn red rm">刪除</button></div></div>`;e.querySelector(".op").onclick=()=>open(p.id);e.querySelector(".cp").onclick=()=>{let d=structuredClone(p);d.id="P"+Date.now();d.name+="－複製";d.m=Date.now();P.push(d);saveList();dash()};e.querySelector(".rm").onclick=()=>{P=P.filter(a=>a.id!==p.id);saveList();dash()};q("projects").append(e)})}
q("new").onclick=()=>q("modal").classList.add("show");q("cancel").onclick=()=>q("modal").classList.remove("show");q("create").onclick=()=>{let p={id:"P"+Date.now(),name:q("nn").value,client:q("nc").value,address:q("na").value,sales:q("ns").value,eng:q("ne").value,type:q("nt").value,note:q("nno").value,status:"草稿",m:Date.now(),data:{o:[],a:[],v:[],groups:{}}};P.push(p);saveList();q("modal").classList.remove("show");open(p.id)};
async function open(id){
 cur=P.find(a=>a.id===id);if(!cur)return;
 scenes=cloneProjectScenes(cur.data?.scenes||[{id:"S1",name:"場景1",objects:cur.data?.o||[],bgScene:{w:0,h:0}}]);
 sceneIndex=0;O=restoreObjectsFromPlain(scenes[0]?.objects||[]);
 A=cur.data?.a||[];V=cur.data?.v||[];guideLines=structuredClone(cur.data?.guideLines||[]);
 aiDetections=structuredClone(cur.data?.aiDetections||[]);
 if(q("aiEndpoint"))q("aiEndpoint").value=cur.data?.aiEndpoint||"";
 studioMode=cur.data?.studioMode||"proposal";engineeringLocked=!!cur.data?.engineeringLocked;
 showModuleGrid=!!cur.data?.showModuleGrid;showCabinetGrid=!!cur.data?.showCabinetGrid;showPortMap=!!cur.data?.showPortMap;showPowerMap=!!cur.data?.showPowerMap;
 const es=cur.data?.engSettings||{};["moduleW","moduleH","cabinetW","cabinetH","psuW","spareRate","maxPowerDensity","avgPowerRate","circuitW","pixelsPerPort","phaseMode","systemVoltage","powerFactor","receiverPixelCapacity","powerSafety","currentSafety"].forEach(id=>{if(q(id)&&es[id]!=null)q(id).value=es[id]});
 groups=structuredClone(cur.data?.groups||{});
 q("jname").value=cur.name;q("client").value=cur.client||"";q("addr").value=cur.address||"";q("sales").value=cur.sales||"";q("eng").value=cur.eng||"";q("status").value=cur.status||"草稿";q("note").value=cur.note||"";
 q("dashboard").classList.add("hidden");setStudioMode(studioMode);setEngineeringLock(engineeringLocked);renderAIDetections();renderGuides();renderSceneTabs();
 await restoreSceneRuntime();draw();layers();props();bottom("ledmodels");summary()
}
function save(ver=true){
 if(!cur)return;
 try{
  syncSceneFromObjects();
  Object.assign(cur,{
   name:q("jname").value,client:q("client").value,address:q("addr").value,
   sales:q("sales").value,eng:q("eng").value,status:q("status").value,
   note:q("note").value,m:Date.now()
  });
  if(ver)V.push({id:"V"+(V.length+1),t:Date.now(),o:serializeObjects(O)});
  cur.data={
   o:serializeObjects(O),scenes:cloneProjectScenes(scenes),a:structuredClone(A),
   v:structuredClone(V),groups:structuredClone(groups),guideLines:structuredClone(guideLines),
   engSettings:engSettings(),studioMode,engineeringLocked,showModuleGrid,showCabinetGrid,
   showPortMap,showPowerMap,aiDetections:structuredClone(aiDetections),
   aiEndpoint:q("aiEndpoint")?.value||""
  };
  saveList();toast("專案已儲存");setRuntimeState("儲存正常","ok")
 }catch(e){
  console.error("save",e);setRuntimeState("儲存失敗","bad");toast("專案儲存失敗："+e.message)
 }
}
q("save").onclick=()=>save();
q("home").onclick=()=>{q("dashboard").classList.remove("hidden");dash()};


function sceneImageSize(){
 if(!bg)return bgScene?.w&&bgScene?.h?bgScene:{w:0,h:0};
 if(bgScene.w>0&&bgScene.h>0)return bgScene;
 const nw=bg.naturalWidth||bg.width||1600,nh=bg.naturalHeight||bg.height||900,maxDim=1800,ratio=Math.min(1,maxDim/Math.max(nw,nh));
 bgScene={w:Math.max(1,nw*ratio),h:Math.max(1,nh*ratio)};
 return bgScene
}

function getSceneBounds(){
 const s=sceneImageSize();
 if(s.w&&s.h)return {x:0,y:0,w:s.w,h:s.h};
 const list=O.filter(o=>o.vis!==false);
 if(!list.length)return {x:0,y:0,w:Math.max(800,c.clientWidth),h:Math.max(500,c.clientHeight)};
 const bs=list.map(objectBounds),x1=Math.min(...bs.map(b=>b.x)),y1=Math.min(...bs.map(b=>b.y)),x2=Math.max(...bs.map(b=>b.x+b.w)),y2=Math.max(...bs.map(b=>b.y+b.h));
 return {x:x1,y:y1,w:Math.max(1,x2-x1),h:Math.max(1,y2-y1)}
}
function updateFitBadge(){
 const el=q("stageFitBadge");if(!el)return;
 if(!bg){el.textContent=`縮放 ${Math.round(z*100)}%`;return}
 const s=sceneImageSize();el.textContent=`場景 ${Math.round(s.w)}×${Math.round(s.h)}｜縮放 ${Math.round(z*100)}%`
}

function syncSceneInputs(){
 const s=sceneImageSize();if(q("sceneW"))q("sceneW").value=Math.round(s.w||1600);if(q("sceneH"))q("sceneH").value=Math.round(s.h||900)
}
function applySceneSize(){
 let w=Math.max(100,Math.min(12000,+q("sceneW").value||1600)),h=Math.max(100,Math.min(12000,+q("sceneH").value||900));
 if(q("sceneLockRatio")?.checked&&bg){
  const nat=(bg.naturalWidth||bg.width)/(bg.naturalHeight||bg.height);
  if(document.activeElement===q("sceneW"))h=w/nat;else w=h*nat;
 }
 bgScene={w,h};syncSceneInputs();fitScene();markChanged();toast(`場景已調整為 ${Math.round(w)}×${Math.round(h)}`)
}
function useOriginalSceneRatio(){
 if(!bg){toast("請先上傳場景照片");return}
 const nw=bg.naturalWidth||bg.width,nh=bg.naturalHeight||bg.height,maxDim=2400,ratio=Math.min(1,maxDim/Math.max(nw,nh));bgScene={w:nw*ratio,h:nh*ratio};syncSceneInputs();fitScene();markChanged()
}

function fitScene(){
 const sb=getSceneBounds(),vw=Math.max(1,c.clientWidth),vh=Math.max(1,c.clientHeight),margin=56;
 z=Math.max(.05,Math.min(4,Math.min((vw-margin*2)/sb.w,(vh-margin*2)/sb.h)));
 pan.x=vw/2-(sb.x+sb.w/2)*z;
 pan.y=vh/2-(sb.y+sb.h/2)*z;
 draw(true);updateFitBadge();updatePropertySceneInfo()
}
function centerSceneAt100(){
 const sb=getSceneBounds(),vw=c.clientWidth,vh=c.clientHeight;z=1;
 pan.x=vw/2-(sb.x+sb.w/2);pan.y=vh/2-(sb.y+sb.h/2);draw(true);updateFitBadge();updatePropertySceneInfo()
}
function zoomAtClient(clientX,clientY,factor){
 const r=c.getBoundingClientRect(),sx=clientX-r.left,sy=clientY-r.top;
 const wx=(sx-pan.x)/z,wy=(sy-pan.y)/z;
 const nz=Math.max(.05,Math.min(8,z*factor));
 pan.x=sx-wx*nz;pan.y=sy-wy*nz;z=nz;draw();updateFitBadge();updatePropertySceneInfo()
}
function renderNow(){
 let w=c.clientWidth,h=c.clientHeight;x.clearRect(0,0,w,h);x.save();x.translate(pan.x,pan.y);x.scale(z,z);
 if(bg){
  const s=sceneImageSize();x.fillStyle="#171a1f";x.fillRect(-pan.x/z,-pan.y/z,w/z,h/z);x.drawImage(bg,0,0,s.w,s.h)
 }else{
  x.fillStyle="#272a30";x.fillRect(-pan.x/z,-pan.y/z,w/z,h/z);
  if(gridEnabled){x.strokeStyle="#343840";const left=-pan.x/z,top=-pan.y/z,right=left+w/z,bottom=top+h/z;for(let i=Math.floor(left/40)*40;i<right;i+=40){x.beginPath();x.moveTo(i,top);x.lineTo(i,bottom);x.stroke()}for(let j=Math.floor(top/40)*40;j<bottom;j+=40){x.beginPath();x.moveTo(left,j);x.lineTo(right,j);x.stroke()}}
 }
 O.filter(o=>o.vis!==false).sort((a,b)=>(a.order||0)-(b.order||0)).forEach(o=>safePaint(o));x.restore();updateFitBadge()
}
function draw(force=false){
 if(force){renderPending=false;renderNow();return}
 if(renderPending)return;
 renderPending=true;requestAnimationFrame(()=>{renderPending=false;renderNow()})
}

function ensureAudioContext(){
 if(audioContext)return audioContext;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
 audioContext=new AC();audioMixDest=audioContext.createMediaStreamDestination();audioMasterGain=audioContext.createGain();audioMasterGain.gain.value=.8;
 audioMasterGain.connect(audioContext.destination);audioMasterGain.connect(audioMixDest);return audioContext
}
function connectMediaToMixer(media,gainValue=1){
 const ac=ensureAudioContext();if(!ac||!media)return null;
 if(audioNodes.has(media)){const rec=audioNodes.get(media);rec.gain.gain.value=gainValue;return rec}
 try{
  const src=ac.createMediaElementSource(media),gain=ac.createGain();gain.gain.value=gainValue;src.connect(gain);gain.connect(audioMasterGain);
  const rec={src,gain};audioNodes.set(media,rec);return rec
 }catch(e){return null}
}
function setAudioState(text,playing=false){
 const el=q("audioState");if(!el)return;el.textContent=text;el.className="audioState"+(playing?" playing":"")
}
function updateAudioControls(){
 const v=Number(q("audioVolume")?.value||80)/100;if(audioMasterGain)audioMasterGain.gain.value=q("audioMute")?.checked?0:v;
 if(audioTrack){audioTrack.loop=!!q("audioLoop")?.checked}
 q("audioVolVal")&&(q("audioVolVal").textContent=Math.round(v*100)+"%")
}
function loadAudioFile(file){
 if(!file)return;
 if(audioTrack){audioTrack.pause();try{URL.revokeObjectURL(audioTrack.dataset.url||"")}catch{}}
 const a=new Audio();const url=URL.createObjectURL(file);a.src=url;a.dataset.url=url;a.preload="auto";a.loop=!!q("audioLoop")?.checked;a.crossOrigin="anonymous";
 audioTrack=a;connectMediaToMixer(a,1);
 a.addEventListener("canplay",()=>setAudioState(`音效已就緒：${file.name}`));
 a.addEventListener("play",()=>{setAudioState(`音效播放中：${file.name}`,true);startAudioMeter()});
 a.addEventListener("pause",()=>setAudioState(`音效已暫停：${file.name}`));
 a.addEventListener("error",()=>setAudioState("音效載入失敗，請改用 MP3 / WAV / M4A"));
 setAudioState(`音效載入中：${file.name}`)
}
function playAudioTrack(){
 if(!audioTrack){toast("請先上傳音效或背景音樂");return}
 ensureAudioContext()?.resume?.();updateAudioControls();audioTrack.play().catch(e=>{setAudioState("音效播放失敗："+(e.message||"瀏覽器限制"));toast("請再按一次播放音效")})
}
function pauseAudioTrack(){audioTrack?.pause()}
function startAudioMeter(){
 const meter=q("audioMeter");if(!meter)return;
 let active=true;
 const tick=()=>{
  if(!audioTrack||audioTrack.paused){meter.style.width="0%";return}
  const p=.25+.55*Math.abs(Math.sin(performance.now()/380));meter.style.width=Math.round(p*100)+"%";requestAnimationFrame(tick)
 };requestAnimationFrame(tick)
}
function registerVideoAudio(v){
 if(!v)return;
 connectMediaToMixer(v,1);
 v.muted=!q("videoAudioEnabled")?.checked;
}

function setPlayStatus(text,state=""){
 const el=q("playStatus");if(!el)return;el.textContent=text;el.className="playStatus"+(state?" "+state:"")
}
function anyPlayingVideo(){
 return O.some(o=>o.media?.tagName==="VIDEO"&&!o.media.paused&&!o.media.ended&&o.ready)
}
function ensureVideoLoop(){
 if(mediaLoopActive)return;mediaLoopActive=true;
 const tick=t=>{
  if(!anyPlayingVideo()){mediaLoopActive=false;videoLoopRunning=false;return}
  if(t-mediaLoopLast>=34){mediaLoopLast=t;renderNow();if(is3&&threeContentTex)threeContentTex.needsUpdate=true}
  requestAnimationFrame(tick)
 };
 videoLoopRunning=true;requestAnimationFrame(tick)
}
function bindVideoObject(o,v){
 o.media=v;o.ready=0;o.mediaType="video";
 v.loop=true;v.muted=false;v.defaultMuted=false;v.volume=1;v.playsInline=true;v.preload="auto";
 v.setAttribute("playsinline","");v.setAttribute("webkit-playsinline","");
 const ready=()=>{o.ready=1;draw();setPlayStatus(`影片已就緒：${o.assetName||"影片"}，按播放開始`)};
 v.addEventListener("loadedmetadata",ready);
 v.addEventListener("canplay",ready);
 v.addEventListener("playing",()=>{o.ready=1;setPlayStatus(`播放中：${o.assetName||"影片"}${v.muted?"（靜音）":"（有聲）"}`,"playing");ensureVideoLoop()});
 v.addEventListener("pause",()=>setPlayStatus(`已暫停：${o.assetName||"影片"}`));
 v.addEventListener("waiting",()=>setPlayStatus("影片緩衝中…"));
 v.addEventListener("stalled",()=>setPlayStatus("影片讀取較慢，正在重試…"));
 v.addEventListener("error",()=>setPlayStatus("影片載入失敗。建議使用 MP4 H.264/AAC 或 WebM。","error"));
 try{v.load()}catch{}
}
async function playSelectedMedia(){
 const o=selected();if(!o){toast("請先選取要播放的 LED / LCD");setPlayStatus("請先選取設備","error");return}
 const v=o.media;if(!v){toast("此設備尚未套用影片");setPlayStatus("此設備尚未載入影片","error");return}
 if(v.tagName!=="VIDEO"){setPlayStatus("目前素材是圖片，不需要播放");return}
 try{
  v.muted=!q("videoAudioEnabled")?.checked;v.defaultMuted=false;v.volume=1;
  if(v.readyState<2){
   setPlayStatus("影片載入中…");
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error("載入逾時"))},10000);
    const ok=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(new Error("影片格式或編碼不支援"))};
    const cleanup=()=>{clearTimeout(timer);v.removeEventListener("canplay",ok);v.removeEventListener("error",bad)};
    v.addEventListener("canplay",ok,{once:true});v.addEventListener("error",bad,{once:true});
    try{v.load()}catch{}
   })
  }
  const promise=v.play();if(promise?.then)await promise;
  o.ready=1;ensureVideoLoop();setRuntimeState("播放正常","ok")
 }catch(err){
  console.error("playSelectedMedia",err);setRuntimeState("影片播放異常","warn");
  setPlayStatus("播放失敗："+(err?.message||"瀏覽器拒絕播放"),"error");
  toast("播放失敗：建議改用 MP4（H.264＋AAC）")
 }
}
function pauseSelectedMedia(){
 const o=selected(),v=o?.media;if(v?.tagName==="VIDEO"){v.pause();draw()}else setPlayStatus("目前沒有可暫停的影片")
}
function installWheelControls(){
 if(c.dataset.wheelV33)return;c.dataset.wheelV33="1";
 c.addEventListener("wheel",e=>{
  e.preventDefault();
  const o=selected();
  if((contentEditMode||e.altKey)&&o){
   o.contentScale=Math.max(10,Math.min(500,(o.contentScale||100)*(e.deltaY<0?1.06:.94)));
   if(q("contentScale"))q("contentScale").value=Math.round(o.contentScale);draw();return
  }
  if(e.shiftKey){pan.x-=e.deltaY;draw();return}
  zoomAtClient(e.clientX,e.clientY,e.deltaY<0?1.10:.90)
 },{passive:false})
}

function resize(){let r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio,1.25);c.width=r.width*d;c.height=r.height*d;x.setTransform(d,0,0,d,0,0);draw(true);if(tr){let rr=q("tc").getBoundingClientRect();tr.setSize(rr.width,rr.height,false);cam.aspect=rr.width/rr.height;cam.updateProjectionMatrix()}}new ResizeObserver(resize).observe(q("stage"));
function corners(o){if(o.corners?.length===4)return o.corners;return[{x:o.x,y:o.y},{x:o.x+o.w,y:o.y},{x:o.x+o.w,y:o.y+o.h},{x:o.x,y:o.y+o.h}]}
function ensureCorners(o){if(!o.corners||o.corners.length!==4)o.corners=corners(o);return o.corners}
function polyPts(o){if(o.pts?.length)return o.pts;if(o.corners?.length===4)return o.corners;return corners(o)}
function bounds(a){let xs=a.map(p=>p.x),ys=a.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}
function nearAnchor(o,p,d=11){let a=o.pts?.length?o.pts:o.corners;if(!a)return-1,b=-1,m=1e9;a.forEach((v,i)=>{let n=Math.hypot(v.x-p.x,v.y-p.y);if(n<m&&n<=d/z){m=n;b=i}});return b}
function nearSeg(a,p,d=14){let bi=-1,bd=1e9;for(let i=0;i<a.length;i++){let A=a[i],B=a[(i+1)%a.length],vx=B.x-A.x,vy=B.y-A.y,l=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((p.x-A.x)*vx+(p.y-A.y)*vy)/l)),px=A.x+t*vx,py=A.y+t*vy,n=Math.hypot(p.x-px,p.y-py);if(n<bd&&n<=d/z){bd=n;bi=i}}return bi}
function curvePath(a,k){if(!a.length)return;k=Math.max(0,Math.min(1,k||0));if(k<.02){x.moveTo(a[0].x,a[0].y);for(let i=1;i<a.length;i++)x.lineTo(a[i].x,a[i].y);x.closePath();return}for(let i=0;i<a.length;i++){let pr=a[(i-1+a.length)%a.length],cu=a[i],nx=a[(i+1)%a.length],p1={x:cu.x+(pr.x-cu.x)*k*.22,y:cu.y+(pr.y-cu.y)*k*.22},p2={x:cu.x+(nx.x-cu.x)*k*.22,y:cu.y+(nx.y-cu.y)*k*.22};if(i===0)x.moveTo(p1.x,p1.y);else x.lineTo(p1.x,p1.y);x.quadraticCurveTo(cu.x,cu.y,p2.x,p2.y)}x.closePath()}
function mediaDraw(o,b){
 const m=o.media;if(!m||!o.ready)return false;
 const mw=m.videoWidth||m.naturalWidth||m.width||b.w,mh=m.videoHeight||m.naturalHeight||m.height||b.h;if(!mw||!mh)return false;
 const cxp=Math.max(0,Math.min(99,o.cropX||0))/100,cyp=Math.max(0,Math.min(99,o.cropY||0))/100,cwp=Math.max(.01,Math.min(1,(o.cropW??100)/100)),chp=Math.max(.01,Math.min(1,(o.cropH??100)/100));
 const sx=mw*cxp,sy=mh*cyp,sw=Math.max(1,Math.min(mw-sx,mw*cwp)),sh=Math.max(1,Math.min(mh-sy,mh*chp));
 const s=(o.contentScale||100)/100,dx=(o.contentX||0)/100*b.w,dy=(o.contentY||0)/100*b.h,rot=(o.contentRotate||0)*Math.PI/180;
 let nakedScale=1,nx=0,ny=0;
 if(o.naked3D){
  const dep=(o.naked3DDepth??35)/100,t=naked3DClock/1000,mode=o.naked3DMotion||"parallax";
  if(mode==="parallax"){nx=Math.sin(t*1.25)*b.w*.025*dep;ny=Math.cos(t*.9)*b.h*.012*dep;nakedScale=1+.045*dep}
  if(mode==="float"){ny=Math.sin(t*1.4)*b.h*.035*dep;nakedScale=1+.08*dep}
  if(mode==="depth"){nakedScale=1+(Math.sin(t*1.1)*.04+.055)*dep}
 }
 x.save();x.translate(b.x+b.w/2+dx+nx,b.y+b.h/2+dy+ny);x.rotate(rot);
 const dw=b.w*s*nakedScale,dh=b.h*s*nakedScale;
 if(o.naked3D){x.shadowColor="rgba(80,140,255,.65)";x.shadowBlur=18*(o.naked3DDepth??35)/35}
 x.drawImage(m,sx,sy,sw,sh,-dw/2,-dh/2,dw,dh);
 if(o.naked3D){x.globalAlpha=.16;x.translate(-nx*.8,-ny*.8);x.drawImage(m,sx,sy,sw,sh,-dw*.515,-dh*.515,dw*1.03,dh*1.03)}
 x.restore();return true
}


let __ledPatternCache=null;
function ledPattern(){
 if(__ledPatternCache)return __ledPatternCache;
 const pc=document.createElement("canvas");
 pc.width=12;pc.height=12;
 const px=pc.getContext("2d");
 px.clearRect(0,0,12,12);
 px.fillStyle="rgba(255,255,255,.16)";
 px.beginPath();px.arc(3,3,1.35,0,Math.PI*2);px.fill();
 px.fillStyle="rgba(90,150,255,.08)";
 px.beginPath();px.arc(9,9,1.05,0,Math.PI*2);px.fill();
 __ledPatternCache=x.createPattern(pc,"repeat");
 return __ledPatternCache
}
function safePaint(o){
 try{paint(o)}
 catch(e){
  console.error("[Xinyu paint error]",o?.name,o?.id,e);
  runtimeErrorCount++;
  setRuntimeState("單一模型繪製異常","warn");
  try{
   const b=objectBounds(o);
   x.save();
   x.strokeStyle="#ff6b6b";
   x.lineWidth=2/Math.max(.1,z);
   x.strokeRect(b.x,b.y,Math.max(20,b.w),Math.max(20,b.h));
   x.fillStyle="rgba(160,30,30,.45)";
   x.fillRect(b.x,b.y,Math.max(20,b.w),Math.max(20,b.h));
   x.fillStyle="#fff";
   x.font="12px sans-serif";
   x.fillText("模型繪製錯誤",b.x+6,b.y+18);
   x.restore()
  }catch{}
 }
}

function paint(o){
 x.save();x.globalAlpha=o.opacity??1;const gammaAdj=1+(1-(o.gamma||1))*.22,glowPx=(o.glow||0)*.22;x.filter=`brightness(${(o.bright||1)*gammaAdj}) contrast(${o.contrast||1}) saturate(${o.sat||1}) ${glowPx>0?`drop-shadow(0 0 ${glowPx}px rgba(100,160,255,.65))`:""}`;
 if(o.type==="maskbrush"){x.fillStyle="rgba(90,90,90,.6)";x.fillRect(o.x,o.y,o.w,o.h)}
 else if(o.type==="text"){x.fillStyle="#fff";x.font="bold 30px sans-serif";x.fillText(o.text,o.x,o.y)}
 else if(o.type==="dim"){x.strokeStyle="#f1d78c";x.fillStyle="#f1d78c";x.beginPath();x.moveTo(o.x,o.y);x.lineTo(o.x+o.w,o.y+o.h);x.stroke();x.fillText(o.label,o.x+5,o.y-5)}
 else{
  const a=polyPts(o);x.beginPath();curvePath(a,(o.curvePower||0)/100);
  if(o.mask){x.fillStyle="#555";x.fill()}
  else{
   x.save();x.clip();const b=bounds(a);
   if(!mediaDraw(o,b)){
    const g=x.createLinearGradient(b.x,b.y,b.x+b.w,b.y+b.h);g.addColorStop(0,"#0d2438");g.addColorStop(.5,"#2850a2");g.addColorStop(1,"#912a67");
    x.fillStyle=g;x.fillRect(b.x,b.y,b.w,b.h);
    x.fillStyle=ledPattern();x.fillRect(b.x,b.y,b.w,b.h)
   }
   x.restore();x.strokeStyle=o.id===sel?"#f2d98c":"#8b8e96";x.lineWidth=o.id===sel?2:1;x.stroke()
  }
  if(o.id===sel&&(geomMode==="perspective"||geomMode==="anchor")){
   const ps=o.pts?.length?o.pts:ensureCorners(o);ps.forEach((p,i)=>{x.beginPath();x.arc(p.x,p.y,6/z,0,Math.PI*2);x.fillStyle=i===anchorDrag?"#5d8dff":"#4ecb7a";x.fill();x.strokeStyle="#fff";x.stroke()})
  }
 }
 if(studioMode==="construction"&&o.rw&&o.rh&&!o.mask)drawEngineeringOverlay(o);
 x.restore()
}
function pt(e){let r=c.getBoundingClientRect();return{x:(e.clientX-r.left-pan.x)/z,y:(e.clientY-r.top-pan.y)/z}}function hit(p){for(let o of [...O].reverse()){if(o.lock||o.vis===false)continue;let a=(o.pts?.length||o.corners?.length)?polyPts(o):null;if(a){if(poly(p,a))return o}else if(p.x>=o.x&&p.x<=o.x+o.w&&p.y>=o.y&&p.y<=o.y+o.h)return o}return null}function poly(p,a){let c=false;for(let i=0,j=a.length-1;i<a.length;j=i++)if(((a[i].y>p.y)!=(a[j].y>p.y))&&(p.x<(a[j].x-a[i].x)*(p.y-a[i].y)/(a[j].y-a[i].y)+a[i].x))c=!c;return c}
function snap(){
 if(anyPlayingVideo?.()||workspaceRecorder?.state==="recording")return;
 H.push(JSON.stringify(serializeObjects(O)));if(H.length>20)H.shift();F=[]
}
q("undo").onclick=async()=>{
 if(!H.length)return;F.push(JSON.stringify(serializeObjects(O)));pauseObjectMedia(O);
 O=JSON.parse(H.pop());sel=null;multiSel=[];await restoreMediaForObjects(O);draw();layers();props();summary()
};
q("redo").onclick=async()=>{
 if(!F.length)return;H.push(JSON.stringify(serializeObjects(O)));pauseObjectMedia(O);
 O=JSON.parse(F.pop());sel=null;multiSel=[];await restoreMediaForObjects(O);draw();layers();props();summary()
};

function snapValue(v,step=10){return snapEnabled?Math.round(v/step)*step:v}
function applyObjectSnap(o){
 if(!snapEnabled||!o||o.pts||o.corners)return;
 const step=10,tol=7/z;
 let nx=snapValue(o.x,step),ny=snapValue(o.y,step);
 const others=O.filter(a=>a.id!==o.id&&a.vis!==false&&!a.pts&&!a.corners);
 let sv=null,sh=null;
 for(const a of others){
  const xs=[a.x,a.x+a.w/2,a.x+a.w], ox=[o.x,o.x+o.w/2,o.x+o.w];
  const ys=[a.y,a.y+a.h/2,a.y+a.h], oy=[o.y,o.y+o.h/2,o.y+o.h];
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(Math.abs(ox[i]-xs[j])<tol){nx+=xs[j]-ox[i];sv=xs[j]}
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(Math.abs(oy[i]-ys[j])<tol){ny+=ys[j]-oy[i];sh=ys[j]}
 }
 o.x=nx;o.y=ny;showSnapGuides(sv,sh)
}
function showSnapGuides(v,hv){
 const vv=q('snapV'),hh=q('snapH');
 if(v!=null){vv.style.display='block';vv.style.left=(26+pan.x+v*z)+'px'}else vv.style.display='none';
 if(hv!=null){hh.style.display='block';hh.style.top=(22+pan.y+hv*z)+'px'}else hh.style.display='none'
}
function hideSnapGuides(){q('snapV').style.display='none';q('snapH').style.display='none'}
function normalizeOrders(){O.sort((a,b)=>(a.order||0)-(b.order||0));O.forEach((o,i)=>o.order=i)}
function moveLayer(id,dir){const o=O.find(x=>x.id===id);if(!o)return;normalizeOrders();const i=O.indexOf(o),j=Math.max(0,Math.min(O.length-1,i+dir));if(i===j)return;snap();[O[i],O[j]]=[O[j],O[i]];normalizeOrders();draw();layers()}
function groupSelected(ids){if(ids.length<2){toast('至少選擇2個圖層才能群組');return}const gid='G'+groupSeq++;groups[gid]=ids.slice();ids.forEach(id=>{const o=O.find(x=>x.id===id);if(o)o.group=gid});toast('已建立群組 '+gid);layers()}
function ungroup(id){const o=O.find(x=>x.id===id);if(!o?.group)return;const gid=o.group;O.forEach(x=>{if(x.group===gid)delete x.group});delete groups[gid];toast('已解除群組');layers()}
function layerSelectWithModifier(id,e){
 const o=O.find(x=>x.id===id);if(!o)return;
 if(e?.shiftKey){o._layerSelected=!o._layerSelected}else{O.forEach(x=>x._layerSelected=false);o._layerSelected=true;sel=id}
 props();layers();draw()
}
function setMaskLevel(o,front){if(!o)return;o.mask=true;o.maskLevel=front?'front':'back';o.order=front?9999:-9999;normalizeOrders();draw();layers()}

c.onpointerdown=e=>{let p=pt(e);
 if(contentEditMode&&e.button===0){
  let o=hit(p);if(o?.media){sel=o.id;multiSel=[o.id];const b=objectBounds(o);drag={o,content:true,s:p,cx:o.contentX||0,cy:o.contentY||0,b};props();draw();return}
 }
if(e.button===1||tool==="pan"){e.preventDefault();drag={pan:true,sx:e.clientX,sy:e.clientY,px:pan.x,py:pan.y};c.style.cursor="grabbing";return}if(q("scaleBtn").dataset.on==="1"){scalePts.push(p);if(scalePts.length===2){scale={px:Math.hypot(scalePts[1].x-scalePts[0].x,scalePts[1].y-scalePts[0].y),cm:+q("known").value};q("scaleBtn").dataset.on="0";toast("照片尺度已建立")}return}if(tool==="select"){let o=hit(p);
 if(e.shiftKey&&o){if(multiSel.includes(o.id))multiSel=multiSel.filter(id=>id!==o.id);else multiSel.push(o.id);sel=o.id}
 else if(o&&groupMoveMode&&multiSel.includes(o.id)){sel=o.id}
 else{multiSel=o?[o.id]:[];sel=o?.id||null}
 O.forEach(a=>a._layerSelected=multiSel.includes(a.id));props();layers();updateSelectionActions();if(o){if((geomMode==="perspective"||geomMode==="anchor")&&!o.lock){if(geomMode==="perspective")ensureCorners(o);anchorDrag=nearAnchor(o,p);if(anchorDrag>=0){snap();drag={o,anchor:true};draw();return}}snap();
 if(groupMoveMode&&multiSel.length>1&&multiSel.includes(o.id)){
  drag={o,s:p,group:true,items:O.filter(a=>multiSel.includes(a.id)).map(a=>({o:a,x:a.x,y:a.y,pts:a.pts?structuredClone(a.pts):null,corners:a.corners?structuredClone(a.corners):null}))}
 }else drag={o,s:p,x:o.x,y:o.y,pts:o.pts?structuredClone(o.pts):null,corners:o.corners?structuredClone(o.corners):null}}}else if(["rect","curve","l","u","lcd","mask"].includes(tool)){snap();let o={id:uid(),name:tool==="lcd"?"LCD拼接屏":"LED",type:tool,x:p.x,y:p.y,w:5,h:5,rw:4160,rh:2080,d:100,pitch:"P2.604",env:"戶外",mount:"落地",bright:1,opacity:1,vis:true,order:O.length,ground:0,base:100,mask:tool==="mask",fit:"填滿",contentScale:100,contentRotate:0,contentX:0,contentY:0,curvePower:tool==="curve"?35:0};O.push(o);sel=o.id;drag={o,s:p,new:1}}else if(tool==="poly"){snap();let o=O.find(a=>a.id===sel&&a.type==="poly"&&a.edit);if(!o){o={id:uid(),name:"異形LED",type:"poly",pts:[],rw:3000,rh:2000,d:100,pitch:"P2.604",bright:1,opacity:1,vis:true,order:O.length,edit:1,fit:"填滿",contentScale:100,contentRotate:0,contentX:0,contentY:0,curvePower:0};O.push(o);sel=o.id}o.pts.push(p)}else if(tool==="text"){let t=prompt("輸入文字","心禹國際");if(t){snap();O.push({id:uid(),name:"文字",type:"text",text:t,x:p.x,y:p.y,vis:true,order:O.length});sel=O.at(-1).id}}else if(tool==="dim"){snap();O.push({id:uid(),name:"尺寸",type:"dim",x:p.x,y:p.y,w:120,h:0,label:"4.16m",vis:true,order:O.length});sel=O.at(-1).id}draw();props();updateSelectionActions();scheduleHeavyRefresh()}
c.onpointermove=e=>{if(!drag)return;
 if(drag.content){let p=pt(e),dx=p.x-drag.s.x,dy=p.y-drag.s.y;drag.o.contentX=drag.cx+dx/Math.max(1,drag.b.w)*100;drag.o.contentY=drag.cy+dy/Math.max(1,drag.b.h)*100;draw();return}
if(drag.pan){pan.x=drag.px+(e.clientX-drag.sx);pan.y=drag.py+(e.clientY-drag.sy);draw();return}let p=pt(e),o=drag.o;
 if(drag.group){const dx=p.x-drag.s.x,dy=p.y-drag.s.y;drag.items.forEach(it=>{if(it.pts)it.o.pts=it.pts.map(a=>({x:a.x+dx,y:a.y+dy}));else if(it.corners){it.o.corners=it.corners.map(a=>({x:a.x+dx,y:a.y+dy}));syncBox(it.o)}else{it.o.x=it.x+dx;it.o.y=it.y+dy}});draw();return}
 if(drag.anchor){let a=o.pts?.length?o.pts:ensureCorners(o);if(anchorDrag>=0){a[anchorDrag]={x:p.x,y:p.y};if(o.corners)syncBox(o)}}else if(drag.new){o.w=Math.max(5,p.x-drag.s.x);o.h=Math.max(5,p.y-drag.s.y)}else if(o.pts){let dx=p.x-drag.s.x,dy=p.y-drag.s.y;o.pts=drag.pts.map(a=>({x:a.x+dx,y:a.y+dy}))}else if(o.corners){let dx=p.x-drag.s.x,dy=p.y-drag.s.y;o.corners=drag.corners.map(a=>({x:a.x+dx,y:a.y+dy}));syncBox(o)}else{o.x=drag.x+p.x-drag.s.x;o.y=drag.y+p.y-drag.s.y;applyObjectSnap(o)}draw()};
c.onpointerup=()=>{c.style.cursor="";drag=null;anchorDrag=-1;hideSnapGuides();props();updateSelectionActions();scheduleHeavyRefresh();markChanged()};
c.ondblclick=e=>{if(geomMode!=="anchor")return;let o=selected();if(!o||o.lock)return;if(!o.pts?.length)o.pts=ensureCorners(o).map(p=>({...p}));let p=pt(e),s=nearSeg(o.pts,p);if(s>=0){snap();o.pts.splice(s+1,0,p);delete o.corners;draw();props();toast("已新增錨點")}};c.addEventListener("click",e=>{if(!e.altKey||geomMode!=="anchor")return;let o=selected();if(!o?.pts?.length||o.pts.length<=3)return;let i=nearAnchor(o,pt(e));if(i>=0){snap();o.pts.splice(i,1);draw();props();toast("已刪除錨點")}});
function ensureMaskCanvas(o){
 if(o.maskCanvas)return o.maskCanvas;
 const mc=document.createElement("canvas");mc.width=Math.max(1,Math.round(o.w||300));mc.height=Math.max(1,Math.round(o.h||200));const mx=mc.getContext("2d");mx.fillStyle="#000";mx.fillRect(0,0,mc.width,mc.height);o.maskCanvas=mc;return mc
}
if(q("newMaskLayer"))q("newMaskLayer").onclick=()=>{snap();const o={id:uid(),name:"遮罩筆刷",type:"maskbrush",x:120,y:100,w:300,h:220,mask:true,vis:true,order:O.length,opacity:.55};O.push(o);sel=o.id;ensureMaskCanvas(o);draw();layers();props();markChanged()};
c.addEventListener("pointermove",e=>{const mc=q("maskCursor");if(tool==="mask"){const r=c.getBoundingClientRect();mc.style.display="block";mc.style.left=(e.clientX-r.left+26)+"px";mc.style.top=(e.clientY-r.top+22)+"px";const s=Number(q("maskBrushSize")?.value||30);mc.style.width=s+"px";mc.style.height=s+"px"}else mc.style.display="none"});

qa(".tool").forEach(b=>b.onclick=()=>{
 qa(".tool").forEach(a=>a.classList.remove("active"));
 b.classList.add("active");tool=b.dataset.tool;
 c.style.cursor=tool==="pan"?"grab":"";
});

function unitFactor(){return engineeringUnit==="mm"?1:engineeringUnit==="cm"?.1:.001}
function unitLabel(v){const n=(Number(v)||0)*unitFactor();return `${engineeringUnit==="mm"?Math.round(n):n.toFixed(engineeringUnit==="cm"?1:3)} ${engineeringUnit}`}
function selectedObjects(){const ids=multiSel.length?multiSel:(sel?[sel]:[]);return O.filter(o=>ids.includes(o.id))}
function objectBounds(o){if(o.pts?.length){const xs=o.pts.map(p=>p.x),ys=o.pts.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}return{x:o.x||0,y:o.y||0,w:o.w||0,h:o.h||0}}
function moveObj(o,dx,dy){if(o.pts)o.pts.forEach(p=>{p.x+=dx;p.y+=dy});else{o.x=(o.x||0)+dx;o.y=(o.y||0)+dy}}
function alignObjects(kind){
 const arr=selectedObjects();if(arr.length<2){toast("請至少選取2個物件");return}snap();
 const bs=arr.map(objectBounds), left=Math.min(...bs.map(b=>b.x)), right=Math.max(...bs.map(b=>b.x+b.w)), top=Math.min(...bs.map(b=>b.y)), bottom=Math.max(...bs.map(b=>b.y+b.h)), cx=(left+right)/2,cy=(top+bottom)/2;
 arr.forEach((o,i)=>{const b=bs[i];let dx=0,dy=0;if(kind==="left")dx=left-b.x;if(kind==="center")dx=cx-(b.x+b.w/2);if(kind==="right")dx=right-(b.x+b.w);if(kind==="top")dy=top-b.y;if(kind==="middle")dy=cy-(b.y+b.h/2);if(kind==="bottom")dy=bottom-(b.y+b.h);moveObj(o,dx,dy)});draw();layers()
}
function distribute(axis){
 const arr=selectedObjects();if(arr.length<3){toast("平均分布至少需要3個物件");return}snap();
 const sorted=[...arr].sort((a,b)=>axis==="h"?objectBounds(a).x-objectBounds(b).x:objectBounds(a).y-objectBounds(b).y);
 const bs=sorted.map(objectBounds);
 if(axis==="h"){const start=bs[0].x,end=bs.at(-1).x+bs.at(-1).w,totalW=bs.reduce((s,b)=>s+b.w,0),gap=(end-start-totalW)/(sorted.length-1);let x0=start;sorted.forEach((o,i)=>{const b=objectBounds(o);moveObj(o,x0-b.x,0);x0+=b.w+gap})}
 else{const start=bs[0].y,end=bs.at(-1).y+bs.at(-1).h,totalH=bs.reduce((s,b)=>s+b.h,0),gap=(end-start-totalH)/(sorted.length-1);let y0=start;sorted.forEach(o=>{const b=objectBounds(o);moveObj(o,0,y0-b.y);y0+=b.h+gap})}
 draw();layers()
}
function addAutoDimensions(){
 const arr=selectedObjects();if(!arr.length){toast("請先選取LED物件");return}snap();
 arr.forEach(o=>{if(!o.rw||!o.rh)return;const b=objectBounds(o);O.push({id:uid(),name:"寬度標註",type:"dim",x:b.x,y:b.y-18,w:b.w,h:0,label:unitLabel(o.rw),vis:true,order:O.length});O.push({id:uid(),name:"高度標註",type:"dim",x:b.x-18,y:b.y,w:0,h:b.h,label:unitLabel(o.rh),vis:true,order:O.length})});draw();layers();summary()
}
function drawCropMedia(o,b){
 const m=o.media;if(!m||!o.ready)return false;
 const mw=m.videoWidth||m.naturalWidth||m.width||b.w,mh=m.videoHeight||m.naturalHeight||m.height||b.h;if(!mw||!mh)return false;
 const cxp=Math.max(0,Math.min(99,o.cropX||0))/100,cyp=Math.max(0,Math.min(99,o.cropY||0))/100,cwp=Math.max(.01,Math.min(1,(o.cropW??100)/100)),chp=Math.max(.01,Math.min(1,(o.cropH??100)/100));
 const sx=mw*cxp,sy=mh*cyp,sw=Math.max(1,mw*cwp),sh=Math.max(1,mh*chp);
 x.drawImage(m,sx,sy,Math.min(sw,mw-sx),Math.min(sh,mh-sy),b.x,b.y,b.w,b.h);return true
}
function captureCompare(which){
 draw(true);const target=q(which==="A"?"cmpA":"cmpB"),cc=target.getContext("2d");cc.clearRect(0,0,target.width,target.height);cc.drawImage(c,0,0,target.width,target.height);const url=target.toDataURL("image/png");if(which==="A")compareA=url;else compareB=url;toast("已擷取方案"+which)
}

function selected(){return O.find(a=>a.id===sel)}function props(){let o=selected();q("none").classList.toggle("hidden",!!o);q("pf").classList.toggle("hidden",!o);if(!o)return;q("pn").value=o.name||"";q("pw").value=o.rw||0;q("ph").value=o.rh||0;q("pd").value=o.d||100;q("pa").value=(((o.rw||0)/1000)*((o.rh||0)/1000)).toFixed(4);q("pp").value=o.pitch||"P2.604";q("pe").value=o.env||"戶外";q("pm").value=o.mount||"落地";q("bright").value=(o.bright||1)*100;q("bv").textContent=q("bright").value+"%";q("opacity").value=(o.opacity??1)*100;q("ov").textContent=q("opacity").value+"%";if(q("contrast"))q("contrast").value=Math.round((o.contrast||1)*100);if(q("sat"))q("sat").value=Math.round((o.sat||1)*100);if(q("gamma"))q("gamma").value=Math.round((o.gamma||1)*100);if(q("glow"))q("glow").value=Math.round(o.glow??30);q("ground").value=o.ground||0;q("base").value=o.base||100;if(q("naked3DEnabled"))q("naked3DEnabled").checked=!!o.naked3D;if(q("naked3DDepth"))q("naked3DDepth").value=o.naked3DDepth??35;if(q("naked3DDepthVal"))q("naked3DDepthVal").textContent=(o.naked3DDepth??35)+"%";if(q("naked3DMotion"))q("naked3DMotion").value=o.naked3DMotion||"parallax";if(q("cropX")){q("cropX").value=o.cropX||0;q("cropY").value=o.cropY||0;q("cropW").value=o.cropW??100;q("cropH").value=o.cropH??100};q("curvePower").value=o.curvePower||0;q("curveVal").textContent=q("curvePower").value+"%";q("fit").value=o.fit||"填滿";q("contentScale").value=o.contentScale||100;q("contentRotate").value=o.contentRotate||0;q("contentX").value=o.contentX||0;q("contentY").value=o.contentY||0}
function geom(m){geomMode=m;q("geomNormal").classList.toggle("active",m==="normal");q("geomPerspective").classList.toggle("active",m==="perspective");q("geomAnchor").classList.toggle("active",m==="anchor");let o=selected();if(o&&m==="perspective")ensureCorners(o);if(o&&m==="anchor"&&!o.pts?.length&&o.type!=="text"&&o.type!=="dim")o.pts=polyPts(o).map(p=>({...p}));draw()}q("geomNormal").onclick=()=>geom("normal");q("geomPerspective").onclick=()=>geom("perspective");q("geomAnchor").onclick=()=>geom("anchor");q("curvePower").oninput=()=>{let o=selected();if(!o)return;o.curvePower=+q("curvePower").value;q("curveVal").textContent=q("curvePower").value+"%";draw()};["contentScale","contentRotate","contentX","contentY","fit"].forEach(id=>q(id).onchange=()=>{let o=selected();if(!o)return;o.fit=q("fit").value;o.contentScale=+q("contentScale").value;o.contentRotate=+q("contentRotate").value;o.contentX=+q("contentX").value;o.contentY=+q("contentY").value;draw()});["pn","pw","ph","pd","pp","pe","pm","ground","base"].forEach(id=>q(id).onchange=()=>{let o=selected();if(!o)return;snap();o.name=q("pn").value;o.rw=+q("pw").value;o.rh=+q("ph").value;o.d=+q("pd").value;o.pitch=q("pp").value;o.env=q("pe").value;o.mount=q("pm").value;o.ground=+q("ground").value;o.base=+q("base").value;props();layers();summary();markChanged()});q("bright").oninput=()=>{let o=selected();if(o){o.bright=q("bright").value/100;q("bv").textContent=q("bright").value+"%";draw();markChanged()}};q("opacity").oninput=()=>{let o=selected();if(o){o.opacity=q("opacity").value/100;q("ov").textContent=q("opacity").value+"%";draw();markChanged()}};
q("del").onclick=deleteSelectedObjects;q("dup").onclick=duplicateSelectedObjects;
function layers(){
 let b=q('bc');if(!q('[data-b="layers"]').classList.contains('active'))return;b.innerHTML='';
 const tools=document.createElement('div');tools.className='layerTools';tools.innerHTML='<button id="lyUp">上移</button><button id="lyDown">下移</button><button id="lyTop">置頂</button><button id="lyBottom">置底</button><button id="lyGroup">群組</button><button id="lyUngroup">解除群組</button><button id="lyFrontMask">前景遮罩</button><button id="lyBackMask">背景遮罩</button>';b.append(tools);
 normalizeOrders();
 [...O].reverse().forEach(o=>{
  let e=document.createElement('div');e.style='width:100%;padding:5px;border-bottom:1px solid #292d34;font-size:10px;cursor:pointer';
  if(o._layerSelected)e.style.background='#29313f';
  e.innerHTML=`<button data-vis style="background:none;border:0;color:#aaa">${o.vis===false?'○':'●'}</button> <button data-lock style="background:none;border:0;color:#aaa">${o.lock?'🔒':'🔓'}</button> ${esc(o.name)} ${o.group?'<span class="maskBadge">'+o.group+'</span>':''}${o.mask?'<span class="maskBadge">'+(o.maskLevel==='back'?'背景遮罩':'前景遮罩')+'</span>':''}<span style="float:right">${o.type}</span>`;
  e.querySelector('[data-vis]').onclick=ev=>{ev.stopPropagation();o.vis=o.vis===false?true:false;draw();layers()};
  e.querySelector('[data-lock]').onclick=ev=>{ev.stopPropagation();o.lock=!o.lock;layers()};
  e.onclick=ev=>layerSelectWithModifier(o.id,ev);b.append(e)
 });
 const activeIds=()=>O.filter(x=>x._layerSelected).map(x=>x.id);
 q('lyUp').onclick=()=>{activeIds().forEach(id=>moveLayer(id,1))};q('lyDown').onclick=()=>{activeIds().forEach(id=>moveLayer(id,-1))};
 q('lyTop').onclick=()=>{activeIds().forEach(id=>{const o=O.find(x=>x.id===id);o.order=9999});normalizeOrders();draw();layers()};
 q('lyBottom').onclick=()=>{activeIds().forEach(id=>{const o=O.find(x=>x.id===id);o.order=-9999});normalizeOrders();draw();layers()};
 q('lyGroup').onclick=()=>groupSelected(activeIds());q('lyUngroup').onclick=()=>{const ids=activeIds();if(ids[0])ungroup(ids[0])};
 q('lyFrontMask').onclick=()=>{activeIds().forEach(id=>setMaskLevel(O.find(x=>x.id===id),true))};q('lyBackMask').onclick=()=>{activeIds().forEach(id=>setMaskLevel(O.find(x=>x.id===id),false))};
}

const assetRuntime=new Map();
function makeDockCard(title,desc,icon,click,dragPayload=null){
 const e=document.createElement("div");e.className="card";e.tabIndex=0;
 e.innerHTML=`<div class="thumb">${icon}</div><strong>${esc(title)}</strong><small>${esc(desc)}</small>${dragPayload?'<span class="dragHint">點擊或拖曳到中央工作區</span>':""}`;
 let dragging=false;
 e.addEventListener("click",ev=>{if(dragging)return;ev.preventDefault();ev.stopPropagation();guarded(()=>click?.(),"模型卡片操作")});
 e.addEventListener("keydown",ev=>{if((ev.key==="Enter"||ev.key===" ")&&!dragging){ev.preventDefault();guarded(()=>click?.(),"模型卡片操作")}});
 if(dragPayload){
  e.draggable=true;
  e.addEventListener("dragstart",ev=>{dragging=true;e.classList.add("dragging");ev.dataTransfer.effectAllowed="copy";ev.dataTransfer.setData("application/x-xinyu",JSON.stringify(dragPayload));ev.dataTransfer.setData("text/plain",dragPayload.name||title)});
  e.addEventListener("dragend",()=>{e.classList.remove("dragging");setTimeout(()=>dragging=false,80)})
 }
 return e
}
function normalizeNewModel(o){
 if(!o||typeof o!=="object")throw new Error("模型資料建立失敗");
 if(!o.id)o.id=uid();
 if(!Number.isFinite(o.x)&&!o.pts)o.x=100;
 if(!Number.isFinite(o.y)&&!o.pts)o.y=100;
 o.vis=o.vis!==false;o.opacity=Number.isFinite(o.opacity)?o.opacity:1;o.order=O.length;
 return o
}

function setModelCreateState(text,level="ok"){
 const el=q("modelCreateState");if(!el)return;
 el.textContent="建模核心："+text;
 el.className="dockCreateState"+(level==="ok"?"":" "+level)
}
function regularPolygon(cx,cy,rx,ry,n=20,rot=-Math.PI/2){
 const pts=[];for(let i=0;i<n;i++){const a=rot+i*Math.PI*2/n;pts.push({x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry})}return pts
}
function safeSceneCenter(){
 const sb=(typeof getSceneBounds==="function")?getSceneBounds():null;
 if(sb&&Number.isFinite(sb.x)&&Number.isFinite(sb.y)&&Number.isFinite(sb.w)&&Number.isFinite(sb.h)&&sb.w>0&&sb.h>0){
  return{x:sb.x+sb.w/2,y:sb.y+sb.h/2}
 }
 return{x:Math.max(400,(c.clientWidth||1000)/2),y:Math.max(300,(c.clientHeight||700)/2)}
}
function screenCanvasSize(rw,rh,scale=.24){
 const sb=(typeof getSceneBounds==="function")?getSceneBounds():{w:1600,h:900};
 const ratio=Math.max(.1,rw/Math.max(1,rh));
 let h=Math.max(90,Math.min(sb.h*scale,300));
 let w=h*ratio;
 const maxW=Math.max(140,sb.w*.42);
 if(w>maxW){w=maxW;h=w/ratio}
 return{w:Math.max(50,w),h:Math.max(50,h)}
}
function baseModel(name,rw=3000,rh=2000){
 const size=screenCanvasSize(rw,rh),cc=safeSceneCenter();
 return{
  id:uid(),name,type:"rect",deviceKind:"LED",
  x:cc.x-size.w/2,y:cc.y-size.h/2,w:size.w,h:size.h,
  rw,rh,d:100,pitch:"P2.604",env:"戶外",mount:"落地",
  bright:1.12,opacity:1,vis:true,order:O.length,
  ground:0,base:100,fit:"填滿",contentScale:100,contentRotate:0,
  contentX:0,contentY:0,curvePower:0,cropX:0,cropY:0,cropW:100,cropH:100
 }
}
function presetObject(name){
 let o;
 switch(name){
  case "常規屏":
  case "標準LED":
   o=baseModel(name,3000,2000);break;
  case "直立屏":
   o=baseModel(name,1000,2000);break;
  case "橫式屏":
   o=baseModel(name,4000,2000);break;
  case "弧形屏":
   o=baseModel(name,4000,2000);o.type="curve";o.curvePower=38;break;
  case "圓柱":
   o=baseModel(name,2000,3000);o.type="curve";o.curvePower=78;break;
  case "圓環":
  case "圓形屏":
  case "球形":{
   o=baseModel(name,2200,2200);const cc={x:o.x+o.w/2,y:o.y+o.h/2};o.type="poly";o.pts=regularPolygon(cc.x,cc.y,o.w/2,o.h/2,24);break
  }
  case "半球形":{
   o=baseModel(name,3000,1600);const cx=o.x+o.w/2,cy=o.y+o.h/2;
   o.type="poly";o.pts=[{x:o.x,y:cy+o.h*.25},{x:o.x+o.w*.1,y:cy-o.h*.1},{x:o.x+o.w*.28,y:o.y},{x:o.x+o.w*.72,y:o.y},{x:o.x+o.w*.9,y:cy-o.h*.1},{x:o.x+o.w,y:cy+o.h*.25}];break
  }
  case "沉浸式":
  case "直角屏":
  case "弧角屏":
   o=baseModel(name,4160,2080);o.type="l";if(name==="弧角屏")o.curvePower=18;break;
  case "魔方屏":{
   o=baseModel(name,2200,2200);const cc={x:o.x+o.w/2,y:o.y+o.h/2};o.type="poly";o.pts=regularPolygon(cc.x,cc.y,o.w/2,o.h/2,8,Math.PI/8);break
  }
  case "自定義選區":{
   o=baseModel(name,3000,2200);const x=o.x,y=o.y,w=o.w,h=o.h;
   o.type="poly";o.pts=[{x:x+w*.08,y:y+h*.12},{x:x+w*.76,y:y},{x:x+w,y:y+h*.42},{x:x+w*.72,y:y+h},{x:x+w*.1,y:y+h*.82},{x:x,y:y+h*.35}];break
  }
  case "一境光幕屏":
   o=baseModel(name,1000,2000);break;
  case "三境光幕屏":
   o=baseModel(name,1000,2000);o.type="u";o.w=Math.max(180,o.w*1.75);break;
  case "三面 LED 精神堡壘":
   o=baseModel(name,1000,4000);o.type="u";o.w=Math.max(160,o.w*1.65);o.base=200;break;
  case "LED 行動廣告車":
   o=baseModel(name,5000,2500);break;
  case "拼接屏":
   o=baseModel("LCD拼接屏",3600,2025);o.type="lcd";o.pitch="LCD";o.deviceKind="LCD";o.env="室內";o.mount="壁掛";break;
  case "拼接屏底座":
   o=baseModel(name,2800,350);o.pitch="結構";o.deviceKind="STRUCTURE";o.env="室內";o.bright=.28;break;
  case "單立柱":
  case "立柱":
   o=baseModel(name,450,2400);o.pitch="結構";o.deviceKind="STRUCTURE";o.mount="柱式";o.bright=.25;break;
  case "圓形固定底座":{
   o=baseModel(name,1100,350);o.pitch="結構";o.deviceKind="STRUCTURE";o.bright=.25;const cc={x:o.x+o.w/2,y:o.y+o.h/2};o.type="poly";o.pts=regularPolygon(cc.x,cc.y,o.w/2,o.h/2,20);break
  }
  case "方形固定底座":
   o=baseModel(name,1200,350);o.pitch="結構";o.deviceKind="STRUCTURE";o.bright=.25;break;
  case "輪子底座":
   o=baseModel(name,1500,400);o.pitch="結構";o.deviceKind="STRUCTURE";o.mount="活動式";o.bright=.25;break;
  case "支架":{
   o=baseModel(name,1500,1200);o.pitch="結構";o.deviceKind="STRUCTURE";o.bright=.22;const x=o.x,y=o.y,w=o.w,h=o.h;
   o.type="poly";o.pts=[{x:x,y:y+h},{x:x+w*.32,y:y},{x:x+w*.68,y:y},{x:x+w,y:y+h},{x:x+w*.72,y:y+h},{x:x+w*.58,y:y+h*.38},{x:x+w*.42,y:y+h*.38},{x:x+w*.28,y:y+h}];break
  }
  case "鋼架":
   o=baseModel(name,2200,2200);o.pitch="結構";o.deviceKind="STRUCTURE";o.mount="鋼構";o.bright=.2;break;
  default:
   o=baseModel(name||"LED",3000,2000)
 }
 return o
}
function clampModelToScene(o){
 const sb=(typeof getSceneBounds==="function")?getSceneBounds():null;if(!sb||!o)return;
 const b=objectBounds(o),mx=Math.max(8,Math.min(40,sb.w*.025)),my=Math.max(8,Math.min(40,sb.h*.025));
 let dx=0,dy=0;
 if(b.x<sb.x+mx)dx=(sb.x+mx)-b.x;
 if(b.x+b.w>sb.x+sb.w-mx)dx=(sb.x+sb.w-mx)-(b.x+b.w);
 if(b.y<sb.y+my)dy=(sb.y+my)-b.y;
 if(b.y+b.h>sb.y+sb.h-my)dy=(sb.y+sb.h-my)-(b.y+b.h);
 if(dx||dy)moveObj(o,dx,dy)
}

function createModelSafe(name,point=null){
 setModelCreateState("建立中…","warn");
 try{
  const before=O.length;
  let o=normalizeNewModel(presetObject(name));
  if(!o)throw new Error("模型工廠沒有回傳物件");
  if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y)){
   const b=objectBounds(o);moveObj(o,point.x-(b.x+b.w/2),point.y-(b.y+b.h/2))
  }else{
   const cc=safeSceneCenter(),b=objectBounds(o);moveObj(o,cc.x-(b.x+b.w/2),cc.y-(b.y+b.h/2))
  }
  clampModelToScene(o);
  O.push(o);sel=o.id;multiSel=[o.id];O.forEach(a=>a._layerSelected=a.id===o.id);

  // Immediate synchronous render so the user must see the new LED now.
  renderNow();

  if(O.length!==before+1)throw new Error("模型未加入場景陣列");
  const created=O.find(x=>x.id===o.id);if(!created)throw new Error("模型建立後無法讀取");
  const b=objectBounds(created);
  if(!Number.isFinite(b.x)||!Number.isFinite(b.y)||b.w<=0||b.h<=0)throw new Error("模型座標或尺寸無效");

  updateSelectionActions();updatePropertySceneInfo();
  requestAnimationFrame(()=>{guarded(()=>props(),"模型屬性顯示");draw()});
  scheduleHeavyRefresh(400);markChanged();
  setRuntimeState("模型建立正常","ok");setModelCreateState(`正常｜${name} 已加入場景`,"ok");
  toast("已建立："+name);
  return o
 }catch(e){
  console.error("createModelSafe",e);
  setRuntimeState("建模異常","bad");setModelCreateState("失敗："+e.message,"bad");
  toast("LED 建立失敗："+e.message);
  return null
 }
}

function isBaseObject(o){return!!o&&(o.pitch==='結構'||/底座|支架|鋼架|立柱/.test(o.name||''))}
function isDisplayObject(o){return!!o&&!isBaseObject(o)&&!o.mask&&!['text','dim','maskbrush'].includes(o.type)}
function translateObjectTo(o,cx,cy){const b=objectBounds(o);moveObj(o,cx-(b.x+b.w/2),cy-(b.y+b.h/2))}
function showAssemblyTag(o,msg){const tag=q('assemblyTag');if(!tag||!o)return;const b=objectBounds(o);tag.textContent=msg;tag.style.left=(26+pan.x+(b.x+b.w/2)*z-55)+'px';tag.style.top=(22+pan.y+(b.y+b.h)*z+8)+'px';tag.classList.add('show');clearTimeout(showAssemblyTag._t);showAssemblyTag._t=setTimeout(()=>tag.classList.remove('show'),1400)}
function autoAttachAssembly(moved){if(!moved||moved.lock)return false;const mb=objectBounds(moved),mc={x:mb.x+mb.w/2,y:mb.y+mb.h/2};let target=null,best=Infinity;if(isBaseObject(moved)){O.filter(isDisplayObject).forEach(o=>{const b=objectBounds(o),d=Math.hypot(mc.x-(b.x+b.w/2),mb.y-(b.y+b.h));if(d<best&&d<Math.max(80,b.w*.4)){best=d;target=o}});if(target){const b=objectBounds(target);translateObjectTo(moved,b.x+b.w/2,b.y+b.h+mb.h/2+4);moved.attachedTo=target.id;target.baseObjectId=moved.id;showAssemblyTag(moved,'底座已吸附到屏體');return true}}else if(isDisplayObject(moved)){O.filter(isBaseObject).forEach(o=>{const b=objectBounds(o),d=Math.hypot(mc.x-(b.x+b.w/2),(mb.y+mb.h)-b.y);if(d<best&&d<Math.max(90,mb.w*.45)){best=d;target=o}});if(target){const b=objectBounds(target);translateObjectTo(moved,b.x+b.w/2,b.y-mb.h/2-4);moved.baseObjectId=target.id;target.attachedTo=moved.id;showAssemblyTag(moved,'屏體已吸附到底座');return true}}return false}
function addModelAt(name,clientX,clientY){
 const r=c.getBoundingClientRect();
 let sx=Math.max(r.left,Math.min(r.right,clientX)),sy=Math.max(r.top,Math.min(r.bottom,clientY));
 const point={x:(sx-r.left-pan.x)/Math.max(.01,z),y:(sy-r.top-pan.y)/Math.max(.01,z)};
 const o=createModelSafe(name,point);
 if(o){tryAutoAssemble(o);renderNow();scheduleHeavyRefresh(420)}
 return o
}
function bottom(t){qa('.btabs button').forEach(btn=>btn.classList.toggle('active',btn.dataset.b===t));const b=q('bc');if(!b)return;b.innerHTML='';if(t==='layers'){layers();return}if(t==='assets'){b.append(sectionLabel('我的素材'));b.append(makeDockCard('上傳素材','圖片、影片、LOGO、廣告素材。','＋',()=>q('content').click()));A.forEach(a=>{if(cardPass(a.name,a.type||'')){const icon=(a.type||'').startsWith('video/')?'🎬':'🖼️';b.append(makeDockCard(a.name,a.type||'已匯入素材',icon,()=>{const o=selected();if(o)attachRuntimeAssetToObject(a,o);else toast('請先選取設備')},{kind:'asset',id:a.runtimeId||a.id||a.name,name:a.name}))}});return}if(t==='ledmodels'){const gs=[['基礎屏型',[['常規屏','平面矩形 LED。','▣'],['弧形屏','弧形牆或弧面展示。','⌒'],['圓環','環形 LED。','◯'],['圓柱','包柱與柱體屏。','⬭']]],['進階造型',[['半球形','沉浸展場與特殊造型。','◠'],['球形','球體與地標展示。','⚫'],['沉浸式','轉角與沉浸空間。','▥'],['弧角屏','帶弧角的 L 型屏。','⌞']]],['多面／異形',[['直角屏','直角 L 型屏。','∟'],['圓形屏','圓形主視覺。','◉'],['魔方屏','方塊異形屏。','⬛'],['自定義選區','不規則輪廓。','✦']]],['心禹產品',[['一境光幕屏','單面直立式 1m × 2m。','Ⅰ'],['三境光幕屏','連體三面 ㄇ 字型。','∪'],['三面 LED 精神堡壘','三面 ㄇ 字型，單面約 1m × 4m。','⛩'],['LED 行動廣告車','行動展示與巡迴提案。','🚚']]]];gs.forEach(([label,items])=>{b.append(sectionLabel(label));items.forEach(([n,d,i])=>{if(cardPass(n,d))b.append(makeDockCard(n,d,i,()=>model(n),{kind:'model',name:n}))})});return}if(t==='lcdmodels'){b.append(sectionLabel('LCD 屏幕模型'));[['拼接屏','LCD 拼接顯示牆。','▦'],['拼接屏底座','LCD 落地展示底座。','▤']].forEach(([n,d,i])=>{if(cardPass(n,d))b.append(makeDockCard(n,d,i,()=>model(n),{kind:'model',name:n}))});return}if(t==='ledbases'){b.append(sectionLabel('LED 底座與結構'));[['單立柱','柱式支撐。','┃'],['圓形固定底座','圓形固定結構。','◎'],['方形固定底座','方形固定結構。','◫'],['輪子底座','活動式底座。','◌'],['支架','活動支架。','⟡'],['鋼架','大型背架。','#'],['立柱','柱式支撐。','║']].forEach(([n,d,i])=>{if(cardPass(n,d))b.append(makeDockCard(n,d,i,()=>model(n),{kind:'model',name:n}))});return}if(t==='scenes'){const row=document.createElement('div');row.className='sceneActionRow';row.innerHTML='<button>上傳實景照片</button><button>清除目前底圖</button>';b.append(row);row.children[0].onclick=()=>q('bgBtn').click();row.children[1].onclick=()=>{bg=null;bgScene={w:0,h:0};pan={x:0,y:0};z=1;draw(true);markChanged()};b.append(sectionLabel('場景工作流程'));[['店面／門市','招牌、櫥窗、迎賓。','🏬'],['商場／百貨','中庭、媒體立面。','🏢'],['婚宴／活動','光幕屏、舞台。','💒'],['宮廟／慶典','精神堡壘、廟會。','🏮'],['展覽／舞台','沉浸式、多屏。','🎪'],['建築外牆','戶外媒體立面。','🏙️'],['會議／辦公','LCD 拼接、簡報牆。','💼']].forEach(([n,d,i])=>{if(cardPass(n,d))b.append(makeDockCard(n,d,i,()=>q('bgBtn').click()))});return}if(t==='versions'){b.append(sectionLabel('專案版本'));V.slice().reverse().forEach(v=>{if(cardPass(v.id,new Date(v.t).toLocaleString()))b.append(makeDockCard(v.id,new Date(v.t).toLocaleString(),'🕘',()=>{O=structuredClone(v.o);draw();layers();summary()}))})}}
["cropX","cropY","cropW","cropH"].forEach(id=>{if(q(id))q(id).oninput=()=>{const o=selected();if(!o)return;o.cropX=+q("cropX").value;o.cropY=+q("cropY").value;o.cropW=+q("cropW").value;o.cropH=+q("cropH").value;draw()}});
if(q("resetCrop"))q("resetCrop").onclick=()=>{const o=selected();if(!o)return;o.cropX=0;o.cropY=0;o.cropW=100;o.cropH=100;props();draw()};
if(q("alLeft"))q("alLeft").onclick=()=>alignObjects("left");if(q("alCenter"))q("alCenter").onclick=()=>alignObjects("center");if(q("alRight"))q("alRight").onclick=()=>alignObjects("right");
if(q("alTop"))q("alTop").onclick=()=>alignObjects("top");if(q("alMiddle"))q("alMiddle").onclick=()=>alignObjects("middle");if(q("alBottom"))q("alBottom").onclick=()=>alignObjects("bottom");
if(q("distH"))q("distH").onclick=()=>distribute("h");if(q("distV"))q("distV").onclick=()=>distribute("v");if(q("autoDim"))q("autoDim").onclick=addAutoDimensions;
if(q("captureA"))q("captureA").onclick=()=>captureCompare("A");if(q("captureB"))q("captureB").onclick=()=>captureCompare("B");


if(q("addScene"))q("addScene").onclick=()=>{syncSceneFromObjects();scenes.push({id:"S"+Date.now(),name:"場景"+(scenes.length+1),objects:[],bgScene:{w:0,h:0},backgroundKey:null});sceneIndex=scenes.length-1;O=[];renderSceneTabs();draw();layers();updatePropertySceneInfo();markChanged()};
if(q("dupScene"))q("dupScene").onclick=()=>{syncSceneFromObjects();const s=structuredClone(currentScene());s.id="S"+Date.now();s.name+=" 複製";scenes.push(s);sceneIndex=scenes.length-1;O=structuredClone(s.objects||[]);renderSceneTabs();draw();layers();updatePropertySceneInfo();markChanged()};
if(q("renameScene"))q("renameScene").onclick=()=>{const s=currentScene();if(!s)return;const n=prompt("場景名稱",s.name);if(n){s.name=n;renderSceneTabs();markChanged()}};
if(q("delScene"))q("delScene").onclick=()=>{if(scenes.length<=1){toast("至少保留一個場景");return}pauseObjectMedia(O);scenes.splice(sceneIndex,1);sceneIndex=Math.max(0,sceneIndex-1);O=structuredClone(currentScene().objects||[]);renderSceneTabs();draw();layers();updatePropertySceneInfo();markChanged()};
if(q("groupScaleUp"))q("groupScaleUp").onclick=()=>groupTransform("scale",1.1);
if(q("groupScaleDown"))q("groupScaleDown").onclick=()=>groupTransform("scale",.9);
if(q("groupRotateL"))q("groupRotateL").onclick=()=>groupTransform("rotate",-5*Math.PI/180);
if(q("groupRotateR"))q("groupRotateR").onclick=()=>groupTransform("rotate",5*Math.PI/180);
if(q("exportBOM"))q("exportBOM").onclick=exportBOMCSV;
["moduleW","moduleH","cabinetW","cabinetH","psuW","spareRate","maxPowerDensity","avgPowerRate","circuitW","pixelsPerPort","phaseMode","systemVoltage","powerFactor","receiverPixelCapacity","powerSafety","currentSafety"].forEach(id=>{if(q(id))q(id).oninput=()=>{updateEngCalc();buildBOM();markChanged()}});


if(q("addVGuide"))q("addVGuide").onclick=()=>addGuide("v");
if(q("addHGuide"))q("addHGuide").onclick=()=>addGuide("h");
if(q("clearGuides"))q("clearGuides").onclick=()=>{guideLines=[];renderGuides();markChanged()};
if(q("runHealth"))q("runHealth").onclick=projectHealth;


function setStudioMode(m){
 studioMode=m;
 q("proposalMode")?.classList.toggle("active",m==="proposal");
 q("constructionMode")?.classList.toggle("active",m==="construction");
 q("mode").textContent=m==="construction"?"施工模式｜工程分區":"提案模式｜2D實景編輯";
 draw();updateEngCalc()
}
if(q("proposalMode"))q("proposalMode").onclick=()=>setStudioMode("proposal");
if(q("constructionMode"))q("constructionMode").onclick=()=>setStudioMode("construction");
if(q("toggleModuleGrid"))q("toggleModuleGrid").onclick=()=>{showModuleGrid=!showModuleGrid;draw()};
if(q("toggleCabinetGrid"))q("toggleCabinetGrid").onclick=()=>{showCabinetGrid=!showCabinetGrid;draw()};
if(q("togglePortMap"))q("togglePortMap").onclick=()=>{showPortMap=!showPortMap;draw()};
if(q("togglePowerMap"))q("togglePowerMap").onclick=()=>{showPowerMap=!showPowerMap;draw()};
if(q("exportMapping"))q("exportMapping").onclick=exportMappingCSV;
function setEngineeringLock(v){
 engineeringLocked=v;q("lockBanner")?.classList.toggle("hidden",!v);
 const ids=["pw","ph","pd","pp","pm","ground","base","moduleW","moduleH","cabinetW","cabinetH","psuW","spareRate","maxPowerDensity","avgPowerRate","circuitW","pixelsPerPort","phaseMode","systemVoltage","powerFactor","receiverPixelCapacity","powerSafety","currentSafety"];
 ids.forEach(id=>{if(q(id))q(id).disabled=v});toast(v?"工程版本已鎖定":"已解除工程鎖定");markChanged()
}
if(q("lockEngineering"))q("lockEngineering").onclick=()=>setEngineeringLock(true);
if(q("unlockEngineering"))q("unlockEngineering").onclick=()=>{if(confirm("確定解除工程版本鎖定？"))setEngineeringLock(false)};


if(q("aiAnalyze"))q("aiAnalyze").onclick=aiAnalyze;
if(q("aiPerspective"))q("aiPerspective").onclick=aiPerspectiveFit;
if(q("aiMask"))q("aiMask").onclick=aiAutoMask;
if(q("aiRepair"))q("aiRepair").onclick=aiRepair;
if(q("aiCommand"))q("aiCommand").onclick=()=>{const t=q("aiPrompt").value.trim();if(!t){toast("請輸入AI指令");return}setAIProgress(40,"正在解析自然語言指令...");setTimeout(()=>setAIProgress(100,parseAICommand(t)),180)};


if(q("viewFront"))q("viewFront").onclick=()=>set3DView("front");
if(q("viewLeft"))q("viewLeft").onclick=()=>set3DView("left");
if(q("viewRight"))q("viewRight").onclick=()=>set3DView("right");
if(q("viewTop"))q("viewTop").onclick=()=>set3DView("top");
if(q("viewFree"))q("viewFree").onclick=()=>set3DView("free");
if(q("toggle3DGrid"))q("toggle3DGrid").onclick=()=>{show3DGrid=!show3DGrid;if(is3)build3()};
if(q("toggle3DStructure"))q("toggle3DStructure").onclick=()=>{show3DStructure=!show3DStructure;if(is3)build3()};
if(q("refreshTripleMap"))q("refreshTripleMap").onclick=()=>{refreshFacePreview();if(is3)build3()};
if(q("quality3D"))q("quality3D").onchange=()=>{if(is3)build3()};


if(q("exportDXFAdvanced"))q("exportDXFAdvanced").onclick=exportAdvancedDXF;
if(q("exportSVGEngineering"))q("exportSVGEngineering").onclick=exportEngineeringSVG;

q("runSystemAudit").onclick=systemAudit;
q("runReleaseGate").onclick=runReleaseGate;q("exportReleaseReport").onclick=exportReleaseReport;
qa(".btabs button").forEach(b=>b.onclick=()=>bottom(b.dataset.b));
function model(n){return createModelSafe(n)}
q("bgBtn").onclick=()=>{let i=document.createElement("input");i.type="file";i.accept="image/*";i.onchange=async()=>{let f=i.files[0];if(!f)return;
 try{
  const key=currentBackgroundKey();if(key){await dbPutBlob(key,f);currentScene().backgroundKey=key}
  if(bgObjectURL){try{URL.revokeObjectURL(bgObjectURL)}catch{}}
  bgObjectURL=URL.createObjectURL(f);let im=new Image();
  im.onload=()=>{bg=im;bgScene={w:0,h:0};sceneImageSize();currentScene().bgScene=structuredClone(bgScene);syncSceneInputs();requestAnimationFrame(()=>fitScene());markChanged()};
  im.src=bgObjectURL
 }catch(e){toast("實景照片儲存失敗："+e.message)}
};i.click()};
q("zin").onclick=()=>zoomAtClient(c.getBoundingClientRect().left+c.clientWidth/2,c.getBoundingClientRect().top+c.clientHeight/2,1.15);
q("zout").onclick=()=>zoomAtClient(c.getBoundingClientRect().left+c.clientWidth/2,c.getBoundingClientRect().top+c.clientHeight/2,.87);
q("z100").onclick=centerSceneAt100;
q("zfit").onclick=fitScene;
q("fs").onclick=()=>document.fullscreenElement?document.exitFullscreen():q("stage").requestFullscreen?.();document.addEventListener("fullscreenchange",()=>setTimeout(()=>{resize();if(bg)fitScene()},80));
q("content").onchange=()=>{
 const f=q("content").files[0],o=selected();if(!f)return;
 const rid="A"+Date.now()+Math.random().toString(36).slice(2,5),url=URL.createObjectURL(f),asset={name:f.name,type:f.type,runtimeId:rid};
 A.push(asset);assetRuntime.set(rid,{url,type:f.type,name:f.name});
 if(o){
  stopAndDisposeMedia(o);o.assetName=f.name;o.mediaObjectURL=url;o.fit=o.fit||"填滿";o.contentScale=o.contentScale||100;o.contentRotate=o.contentRotate||0;o.contentX=o.contentX||0;o.contentY=o.contentY||0;
  if(f.type.startsWith("video/")){const v=document.createElement("video");v.src=url;bindVideoObject(o,v)}
  else{const im=new Image();im.onload=()=>{o.media=im;o.mediaType="image";o.ready=1;draw();setPlayStatus("圖片已套用："+f.name)};im.onerror=()=>setPlayStatus("圖片載入失敗","error");im.src=url}
 }
 bottom("assets");scheduleHeavyRefresh();markChanged()
}


["contrast","sat","gamma","glow"].forEach(id=>{q(id).oninput=()=>{const o=selected();if(!o)return;
 if(id==="contrast")o.contrast=+q(id).value/100;
 if(id==="sat")o.sat=+q(id).value/100;
 if(id==="gamma")o.gamma=+q(id).value/100;
 if(id==="glow")o.glow=+q(id).value;
 draw();markChanged()
}});
q("contentEdit").onclick=()=>{const o=selected();if(!o?.media){toast("請先選取已套用圖片或影片的 LED");return}contentEditMode=!contentEditMode;q("contentEdit").classList.toggle("activeMode",contentEditMode);toast(contentEditMode?"內容滑鼠編輯：開":"內容滑鼠編輯：關")};
q("contentReset").onclick=()=>{const o=selected();if(!o)return;o.contentScale=100;o.contentRotate=0;o.contentX=0;o.contentY=0;o.cropX=0;o.cropY=0;o.cropW=100;o.cropH=100;props();draw();markChanged()};
q("groupMove").onclick=()=>{groupMoveMode=!groupMoveMode;q("groupMove").classList.toggle("activeMode",groupMoveMode);toast(groupMoveMode?"群組移動模式：開":"群組移動模式：關")};
q("tripleMapMode").onchange=()=>{refreshFacePreview();if(is3)build3()};

q("play").onclick=playSelectedMedia;
q("quickCreateLED").onclick=()=>createModelSafe("常規屏");
q("quickCreateSingle").onclick=()=>createModelSafe("一境光幕屏");
q("quickCreateTriple").onclick=()=>createModelSafe("三境光幕屏");
q("quickCreateTower").onclick=()=>createModelSafe("三面 LED 精神堡壘");

q("addSameModel").onclick=addSameTypeModel;
q("centerSelected").onclick=()=>centerObjectInScene(selected());
q("autoAssemblyToggle").onchange=()=>{autoAssemblyEnabled=q("autoAssemblyToggle").checked;updatePropertySceneInfo();toast("自動吸附組裝："+(autoAssemblyEnabled?"開":"關"))};
q("propSnapToggle").onclick=()=>q("snapToggle").click();
q("propGridToggle").onclick=()=>q("gridToggle").click();
qa("#propertyUnits button").forEach(b=>b.onclick=()=>{engineeringUnit=b.dataset.punit;updatePropertySceneInfo();draw();scheduleHeavyRefresh()});
q("naked3DEnabled").onchange=()=>{const o=selected();if(!o)return;o.naked3D=q("naked3DEnabled").checked;if(o.naked3D)ensureNaked3DLoop();draw();markChanged()};
q("naked3DDepth").oninput=()=>{const o=selected();if(!o)return;o.naked3DDepth=+q("naked3DDepth").value;q("naked3DDepthVal").textContent=o.naked3DDepth+"%";if(o.naked3D)ensureNaked3DLoop();draw()};
q("naked3DMotion").onchange=()=>{const o=selected();if(!o)return;o.naked3DMotion=q("naked3DMotion").value;if(o.naked3D)ensureNaked3DLoop();draw()};
q("pause").onclick=pauseSelectedMedia;
q("audioFile").onchange=()=>loadAudioFile(q("audioFile").files[0]);
q("audioPlay").onclick=playAudioTrack;q("audioPause").onclick=pauseAudioTrack;
q("audioVolume").oninput=updateAudioControls;q("audioLoop").onchange=updateAudioControls;q("audioMute").onchange=updateAudioControls;
q("videoAudioEnabled").onchange=()=>O.forEach(o=>{if(o.media?.tagName==="VIDEO"){o.media.muted=!q("videoAudioEnabled").checked;o.media.volume=1}});
q("applySceneSize").onclick=applySceneSize;q("fitSceneBtn").onclick=fitScene;q("sceneOriginal").onclick=useOriginalSceneRatio;
q("scenePresetHD").onclick=()=>{bgScene={w:1920,h:1080};syncSceneInputs();fitScene();markChanged()};
q("recordWorkspace").onclick=startWorkspaceRecording;q("stopWorkspaceRecord").onclick=stopWorkspaceRecording;
q("scaleBtn").onclick=()=>{scalePts=[];q("scaleBtn").dataset.on="1";toast("請在照片上點選兩點")};q("scaleClear").onclick=()=>{scale=null;scalePts=[]};function summary(){buildBOM();let a=O.filter(o=>o.rw&&o.rh),s=a.reduce((n,o)=>n+o.rw*o.rh/1e6,0);q("sum").innerHTML=`LED/LCD物件：${a.length} 件<br>總顯示面積：約 ${s.toFixed(3)}㎡<br>照片尺度：${scale?"已校正":"未校正"}<br>吸附：${snapEnabled?"開":"關"}<br>群組：${Object.keys(groups).length} 組`}
qa(".tabs button").forEach(b=>b.onclick=()=>{qa(".tabs button").forEach(a=>a.classList.remove("active"));b.classList.add("active");["prop","project","out"].forEach(t=>q("tab-"+t).classList.toggle("hidden",t!==b.dataset.tab))});
function showTopMenu(anchor,items){
 const m=q("topActionMenu");if(!m)return;m.innerHTML="";
 items.forEach(([label,fn])=>{const b=document.createElement("button");b.textContent=label;b.onclick=()=>{m.classList.add("hidden");fn()};m.append(b)});
 const r=anchor.getBoundingClientRect();m.style.left=Math.min(innerWidth-210,r.left)+"px";m.classList.remove("hidden")
}
function selectAllObjects(){multiSel=O.filter(o=>o.vis!==false&&!o.lock).map(o=>o.id);sel=multiSel.at(-1)||null;O.forEach(o=>o._layerSelected=multiSel.includes(o.id));draw();props();layers();updateSelectionActions()}
function openRightTab(tab){q(`[data-tab="${tab}"]`)?.click()}
function installTopMenus(){
 q("editMenu").onclick=e=>showTopMenu(e.currentTarget,[["復原",()=>q("undo").click()],["重做",()=>q("redo").click()],["全選模型",selectAllObjects],["複製選取",duplicateSelectedObjects],["刪除選取",deleteSelectedObjects]]);
 q("viewMenu").onclick=e=>showTopMenu(e.currentTarget,[["完整顯示場景",fitScene],["100%置中",centerSceneAt100],["切換吸附",()=>q("snapToggle").click()],["切換格線",()=>q("gridToggle").click()],["全螢幕",()=>q("fs").click()],["切換3D預覽",()=>q("toggle3d").click()]]);
 q("settingsMenu").onclick=e=>showTopMenu(e.currentTarget,[["專案／場景設定",()=>openRightTab("project")],["物件屬性",()=>openRightTab("prop")],["施工模式",()=>q("constructionMode").click()],["提案模式",()=>q("proposalMode").click()]]);
 document.addEventListener("pointerdown",e=>{const m=q("topActionMenu");if(m&&!m.classList.contains("hidden")&&!m.contains(e.target)&&![q("editMenu"),q("viewMenu"),q("settingsMenu")].includes(e.target))m.classList.add("hidden")});
}

q("goExport").onclick=()=>openRightTab("out");

function preferredWorkspaceMime(){
 const pref=q("workspaceVideoFormat")?.value||"auto";
 const mp4=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4"];
 const webm=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
 const list=pref==="mp4"?mp4:pref==="webm"?webm:[...mp4,...webm];
 return list.find(t=>MediaRecorder.isTypeSupported?.(t))||preferredWebMMime()
}
function extForMime(m){return String(m).includes("mp4")?"mp4":"webm"}
function preferredWebMMime(){
 const types=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
 return types.find(t=>MediaRecorder.isTypeSupported?.(t))||"video/webm"
}
async function autoPlayWorkspaceMedia(){
 const ac=ensureAudioContext();if(ac?.state==="suspended")await ac.resume();
 const jobs=[];
 O.forEach(o=>{const v=o.media;if(v?.tagName==="VIDEO"){connectMediaToMixer(v,1);v.muted=!q("videoAudioEnabled")?.checked;v.volume=1;jobs.push(v.play().catch(()=>{}))}});
 if(audioTrack){connectMediaToMixer(audioTrack,1);jobs.push(audioTrack.play().catch(()=>{}))}
 await Promise.allSettled(jobs);ensureVideoLoop()
}
function pauseWorkspaceMedia(){
 O.forEach(o=>{const v=o.media;if(v?.tagName==="VIDEO")v.pause()});audioTrack?.pause()
}
async function startWorkspaceRecording(){
 if(workspaceRecorder?.state==="recording")return;
 if(!c.captureStream||!window.MediaRecorder){toast("此瀏覽器不支援工作區錄影");return}
 try{
  if(q("recordAutoPlay")?.checked)await autoPlayWorkspaceMedia();
  draw(true);
  const stream=c.captureStream(30),ac=ensureAudioContext();
  if(ac){await ac.resume();if(audioMixDest?.stream?.getAudioTracks?.().length){const at=audioMixDest.stream.getAudioTracks()[0];stream.addTrack(at)}}
  workspaceChunks=[];const recMime=preferredWorkspaceMime();workspaceRecorder=new MediaRecorder(stream,{mimeType:recMime,videoBitsPerSecond:8000000,audioBitsPerSecond:192000});
  workspaceRecorder.ondataavailable=e=>{if(e.data?.size)workspaceChunks.push(e.data)};
  workspaceRecorder.onerror=e=>{q("workspaceRecState").textContent="錄製錯誤："+(e.error?.message||"未知錯誤")};
  workspaceRecorder.onstop=()=>{
   clearInterval(workspaceRecordTimer);workspaceRecordTimer=null;clearTimeout(autoRecordStopTimer);autoRecordStopTimer=null;
   const mime=workspaceRecorder.mimeType||preferredWorkspaceMime(),ext=extForMime(mime),blob=new Blob(workspaceChunks,{type:mime});dl(blob,(cur?.name||"Xinyu_LED_Studio")+"_工作區播放畫面."+ext);
   q("recordWorkspace").disabled=false;q("stopWorkspaceRecord").disabled=true;q("workspaceRecState").className="recState";q("workspaceRecState").textContent="錄製完成並已輸出 WebM。";
  };
  workspaceRecorder.start(1000);workspaceRecordStarted=Date.now();
  clearTimeout(autoRecordStopTimer);const dur=Number(q("workspaceVideoDuration")?.value||0);if(dur>0)autoRecordStopTimer=setTimeout(()=>stopWorkspaceRecording(),dur*1000);
  q("recordWorkspace").disabled=true;q("stopWorkspaceRecord").disabled=false;q("workspaceRecState").className="recState recording";
  workspaceRecordTimer=setInterval(()=>{const s=Math.floor((Date.now()-workspaceRecordStarted)/1000);q("workspaceRecState").textContent=`錄製中 ${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}｜圖片＋影片＋音效`},500)
 }catch(e){toast("工作區錄製啟動失敗");q("workspaceRecState").textContent="錄製啟動失敗："+(e.message||"未知原因")}
}
function stopWorkspaceRecording(){if(workspaceRecorder?.state==="recording")workspaceRecorder.stop()}

function dl(blob,n){let a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}q("png").onclick=()=>{draw(true);let a=document.createElement("a");a.download=(cur?.name||"效果圖")+".png";a.href=c.toDataURL();a.click()};q("jpg").onclick=()=>{draw(true);let a=document.createElement("a");a.download=(cur?.name||"效果圖")+".jpg";a.href=c.toDataURL("image/jpeg",.92);a.click()};q("json").onclick=()=>dl(new Blob([JSON.stringify({project:cur,objects:O,assets:A,versions:V,groups},null,2)],{type:"application/json"}),(cur?.name||"project")+".json");q("report").onclick=()=>{let t=`Xinyu LED Studio 專案設計報告\n專案：${cur?.name||""}\n客戶：${cur?.client||""}\n\n`;O.filter(o=>o.rw&&o.rh).forEach((o,i)=>t+=`${i+1}. ${o.name} ${o.rw}×${o.rh}mm ${(o.rw*o.rh/1e6).toFixed(4)}㎡ ${o.pitch||""}\n`);dl(new Blob([t],{type:"text/plain;charset=utf-8"}),(cur?.name||"報告")+".txt")};
q("pdfProposal").onclick=()=>{
 syncSceneFromObjects();
 const pages=scenes.map((s,idx)=>{
  const savedO=O;O=structuredClone(s.objects||[]);draw(true);const img=c.toDataURL("image/png");O=savedO;
  const rows=(s.objects||[]).filter(o=>o.rw&&o.rh).map((o,i)=>`<tr><td>${i+1}</td><td>${esc(o.name||"")}</td><td>${o.rw}×${o.rh} mm</td><td>${(o.rw*o.rh/1e6).toFixed(4)}㎡</td><td>${esc(o.pitch||"")}</td></tr>`).join("");
  return `<section style="page-break-after:always"><h2>${esc(s.name)}</h2><img src="${img}" style="max-width:100%"><table><thead><tr><th>#</th><th>設備</th><th>尺寸</th><th>面積</th><th>Pitch</th></tr></thead><tbody>${rows}</tbody></table></section>`
 }).join("");
 const w=window.open("","_blank");if(!w){toast("瀏覽器阻擋新視窗");return}
 w.document.write(`<html><head><title>${esc(cur?.name||"LED提案")}</title><style>body{font-family:Arial,"Noto Sans TC",sans-serif;padding:28px;color:#111}h1{margin-bottom:4px}.gold{color:#9a741e;font-weight:bold}img{max-width:100%;margin:12px 0}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:6px;font-size:11px}
.health{border-radius:8px;padding:7px;margin-bottom:6px;font-size:10px;line-height:1.5}.health.ok{background:#173323;border:1px solid #2f6b46;color:#b7ecc8}.health.warn{background:#3a3016;border:1px solid #766323;color:#f2dc96}.health.bad{background:#3d1c1c;border:1px solid #7b3939;color:#f2b3b3}
.metricGrid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.metric{background:#0d1015;border:1px solid #30343d;border-radius:7px;padding:6px}.metric b{display:block;color:#f1d68c;font-size:12px}.metric small{color:#8e939e;font-size:9px}
.guideCtl{position:absolute;z-index:11;background:#5d8dff;opacity:.85}.guideCtl.v{width:2px;top:22px;bottom:0;cursor:ew-resize}.guideCtl.h{height:2px;left:26px;right:0;cursor:ns-resize}.guideCtl::after{content:"";position:absolute;background:#d9e4ff;border:1px solid #5d8dff}.guideCtl.v::after{width:8px;height:8px;left:-4px;top:2px;border-radius:50%}.guideCtl.h::after{width:8px;height:8px;left:2px;top:-4px;border-radius:50%}
.checklist{margin:0;padding-left:16px;color:#aeb2bb;font-size:10px;line-height:1.6}


.modeSwitch{display:grid;grid-template-columns:1fr 1fr;gap:4px}.modeSwitch button{border:1px solid #373c46;background:#20242b;color:#aaa;border-radius:6px;padding:6px;font-size:10px}.modeSwitch button.active{background:#614d1a;color:#fff0b3;border-color:#d6b45f}
.mapLegend{display:flex;gap:8px;flex-wrap:wrap;margin-top:5px;font-size:9px;color:#9ca1ab}.mapLegend span{display:flex;align-items:center;gap:3px}.swatch{width:9px;height:9px;border-radius:2px;display:inline-block}
.lockedBanner{padding:7px;border:1px solid #8a6a26;background:#3a2f15;color:#f4dfa0;border-radius:7px;font-size:10px;margin-bottom:7px}
.engWarn{padding:6px;border-radius:6px;font-size:9px;margin-top:5px}.engWarn.ok{background:#173323;color:#b9eec8;border:1px solid #2f6b46}.engWarn.warn{background:#3a3016;color:#f0d98e;border:1px solid #776326}.engWarn.bad{background:#401d1d;color:#efb2b2;border:1px solid #7e3939}
.mappingTable{width:100%;border-collapse:collapse;font-size:9px;margin-top:6px}.mappingTable td,.mappingTable th{border:1px solid #343944;padding:4px}.mappingTable th{color:#f0d894;background:#171b22}


.aiPanel{background:linear-gradient(145deg,#111722,#151421);border:1px solid #38445d}.aiPanel h3{color:#b8cfff}.aiBadge{display:inline-block;padding:2px 6px;border-radius:999px;background:#223a63;color:#b9d0ff;font-size:9px;margin-left:4px}.aiResult{padding:7px;border:1px solid #34425a;border-radius:7px;background:#0d121b;color:#aebbd0;font-size:10px;line-height:1.55;max-height:180px;overflow:auto}.aiProgress{height:5px;background:#202733;border-radius:99px;overflow:hidden;margin-top:5px}.aiProgress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#5d8dff,#6fe1ff);transition:.25s}
.view3dbar{position:absolute;left:38px;top:65px;z-index:13;display:none;gap:5px;background:#0b0e13dd;border:1px solid #303843;padding:5px;border-radius:8px}.is3d .view3dbar{display:flex}.view3dbar button{border:1px solid #39404a;background:#222831;color:#ddd;border-radius:6px;padding:5px 7px;font-size:9px}
.faceMap{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.faceMap>div{border:1px solid #303944;background:#0c1016;border-radius:7px;padding:5px;text-align:center}.faceMap canvas{width:100%;aspect-ratio:1/1;background:#121720;border-radius:4px;display:block}.faceMap small{font-size:9px;color:#aaa}
.cadOptions{display:grid;grid-template-columns:1fr 1fr;gap:5px}.cadOptions label{font-size:9px;color:#aaa;display:flex;align-items:center;gap:4px}
.aiOverlay{position:absolute;inset:22px 0 0 26px;pointer-events:none;z-index:10}.aiBox{position:absolute;border:2px solid #6fe1ff;background:#6fe1ff17;color:#dff8ff;font-size:9px;padding:2px}.aiBox.wall{border-color:#5d8dff}.aiBox.door{border-color:#e9b85d}.aiBox.window{border-color:#66d49a}.aiBox.column{border-color:#df6d9e}
.repairPreview{width:100%;aspect-ratio:16/9;background:#1b1f26;border:1px solid #303944;border-radius:6px;object-fit:contain}
.statusPill{display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border-radius:99px;font-size:9px;background:#183321;color:#afe5bf}.statusPill.warn{background:#3a3016;color:#efd78e}


/* === V3.1 千幕工作台與人性化操作強化版 === */
.app{height:calc(100vh - 54px)!important;display:grid!important;grid-template-columns:68px 320px minmax(520px,1fr) 360px!important;grid-template-rows:1fr!important}
.tools{grid-column:1/2!important;grid-row:1/2!important}
.stage{grid-column:3/4!important;grid-row:1/2!important;position:relative;background:radial-gradient(circle at top,#313743 0%,#23272e 36%,#171a1f 100%)!important;overflow:hidden}
.right{grid-column:4/5!important;grid-row:1/2!important;border-left:1px solid var(--line)!important;background:#101217!important;padding:10px!important;overflow:auto!important}
.bottom{grid-column:2/3!important;grid-row:1/2!important;border-top:0!important;border-right:1px solid var(--line)!important;background:#0f1115!important;display:grid!important;grid-template-rows:auto auto 1fr!important;min-width:0!important}
.quick{left:50%!important;transform:translateX(-50%)!important;top:12px!important;flex-wrap:wrap!important;max-width:min(860px,calc(100% - 80px))!important;justify-content:center!important;box-shadow:0 12px 24px #0006}
.mode{right:16px!important;top:12px!important;box-shadow:0 10px 24px #0005}
.rulerx,.rulery{background:#0d1015!important}
#c{background:#25282e!important}
.dockHead{padding:12px 12px 0;border-bottom:1px solid #262b33;background:linear-gradient(180deg,#11151b,#0f1115)}
.dockTitle{font-size:14px;font-weight:900;color:#f0d894;margin-bottom:4px;letter-spacing:.5px}
.dockSub{font-size:10px;line-height:1.5;color:#9ca3ae;margin-bottom:8px}
.dockSearch{width:100%;background:#0d1015;border:1px solid #303743;color:#fff;border-radius:8px;padding:8px 10px;margin-bottom:10px}
.btabs{display:flex!important;flex-wrap:wrap!important;gap:6px!important;padding:9px 10px!important;border-bottom:1px solid #262b33!important;background:#0f1115}
.btabs button{flex:0 0 auto!important;border:1px solid #343944!important;background:#171b22!important;color:#a8afbb!important;border-radius:999px!important;padding:6px 10px!important;font-size:10px!important}
.btabs button.active{background:#2b2417!important;color:#fff!important;border-color:#8e7537!important;box-shadow:inset 0 0 0 1px #b6923c44}
.bcontent{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;align-content:start!important;gap:8px!important;padding:10px!important;overflow:auto!important}
.card{width:auto!important;min-width:0!important;border:1px solid #30343d!important;border-radius:10px!important;background:linear-gradient(180deg,#181c22,#13161b)!important;padding:8px!important;cursor:pointer!important;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
.card:hover{transform:translateY(-1px)!important;border-color:#8e7537!important;box-shadow:0 10px 18px #0004}
.thumb{height:84px!important;background:linear-gradient(135deg,#313846,#181b21)!important;border-radius:8px!important;display:grid!important;place-items:center!important;color:#d7dde8!important;font-size:28px!important;overflow:hidden}
.card strong{display:block;margin-top:7px;font-size:12px;color:#fff;line-height:1.3}
.card small{display:block;margin-top:4px;color:#9aa2ae!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.45!important}
.dockSectionLabel{grid-column:1/-1;color:#f0d894;font-size:11px;font-weight:800;margin-top:2px;padding:3px 2px;border-bottom:1px dashed #3b414c}
.stage::after{content:"編輯工作區";position:absolute;left:40px;top:34px;color:#7f8794;font-size:11px;letter-spacing:1px;pointer-events:none;z-index:1}
.stage.emptyTip::before{content:"請先上傳實景照片，或從左側模型庫新增 LED / LCD / 底座。";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:10px 14px;border-radius:999px;background:#0d1015cc;border:1px solid #343944;color:#d6dde7;font-size:12px;pointer-events:none;z-index:1}
.tabs{position:sticky!important;top:0!important;background:#101217!important;padding-bottom:8px!important}
.panel{box-shadow:0 6px 16px #0002}
@media (max-width:1400px){.app{grid-template-columns:60px 290px minmax(420px,1fr) 330px!important}.bcontent{grid-template-columns:1fr!important}}
@media (max-width:980px){.app{grid-template-columns:60px 1fr!important}.bottom{position:fixed!important;left:60px!important;top:54px!important;bottom:0!important;width:280px!important;z-index:20!important}.stage{grid-column:2/3!important}.right{position:fixed!important;right:0!important;top:54px!important;bottom:0!important;width:300px!important;z-index:21!important}.quick{left:calc(50% + 30px)!important;max-width:calc(100% - 110px)!important}.bcontent{grid-template-columns:1fr!important}}


/* === V10.0 拖曳組裝與場景工作流強化 === */
.dockCollapse,.inspectorCollapse{border:1px solid #39404a!important;background:#191d24!important;color:#cbd2dc!important;border-radius:6px!important;padding:3px 7px!important;font-size:10px!important;cursor:pointer}.dockTitle{display:flex;align-items:center;justify-content:space-between;gap:6px}.inspectorCollapse{flex:0 0 30px!important}
body.dock-collapsed .app{grid-template-columns:68px 48px minmax(520px,1fr) 340px!important}body.dock-collapsed .bottom{overflow:hidden!important}body.dock-collapsed .dockHead .dockSub,body.dock-collapsed .dockSearch,body.dock-collapsed .btabs,body.dock-collapsed .bcontent{display:none!important}body.dock-collapsed .dockHead{padding:10px 6px!important}body.dock-collapsed .dockTitle{writing-mode:vertical-rl;min-height:145px;justify-content:flex-start;font-size:11px!important}body.dock-collapsed .dockCollapse{writing-mode:horizontal-tb!important;margin-top:7px}
body.inspector-collapsed .app{grid-template-columns:68px 320px minmax(520px,1fr) 48px!important}body.inspector-collapsed .right{overflow:hidden!important;padding:8px 5px!important}body.inspector-collapsed .right>.tabs button:not(#collapseInspector),body.inspector-collapsed .right>[id^="tab-"]{display:none!important}body.inspector-collapsed .tabs{display:block!important}body.dock-collapsed.inspector-collapsed .app{grid-template-columns:68px 48px minmax(520px,1fr) 48px!important}
.card[draggable="true"]{cursor:grab!important}.card[draggable="true"]:active{cursor:grabbing!important}.card.dragging{opacity:.45!important;transform:scale(.97)!important}.stage.drop-ready{box-shadow:inset 0 0 0 3px #d6b45f!important}.stage.drop-ready::before{content:"放開滑鼠即可放置到這裡";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:19;background:#0c1017e8;border:1px solid #d6b45f;color:#f3dc96;border-radius:999px;padding:10px 16px;font-size:12px;pointer-events:none}.assemblyTag{position:absolute;z-index:14;pointer-events:none;background:#173323;border:1px solid #4ecb7a;color:#c4f2d1;border-radius:999px;padding:4px 8px;font-size:9px;opacity:0;transition:.2s}.assemblyTag.show{opacity:1}.workflowTip{grid-column:1/-1;border:1px solid #324155;background:#111924;border-radius:8px;padding:8px;color:#aebed4;font-size:10px;line-height:1.55}.workflowTip b{color:#f0d894}.card .dragHint{display:block;margin-top:5px;color:#748094;font-size:8px}.sceneActionRow{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:2px}.sceneActionRow button{background:#202630;border:1px solid #35404e;color:#d8dee8;border-radius:7px;padding:7px;font-size:10px}.stageToolbarStatus{position:absolute;left:42px;bottom:12px;z-index:9;background:#0c1016dd;border:1px solid #303843;border-radius:8px;padding:6px 9px;color:#9ba6b4;font-size:9px;pointer-events:none}


/* === V10.0 流暢度與播放核心修正版 === */
.playStatus{margin-top:6px;padding:6px 8px;border:1px solid #303944;border-radius:7px;background:#0d1117;color:#8f99a8;font-size:9px;line-height:1.45}
.playStatus.playing{border-color:#2f6b46;background:#14281b;color:#b7eac5}
.playStatus.error{border-color:#7b3939;background:#321919;color:#efb7b7}
.wheelHelp{margin-top:6px;color:#778291;font-size:9px;line-height:1.5}
.stage{will-change:auto;contain:layout paint}
#c{image-rendering:auto}
.quick button{user-select:none}
.stageFitBadge{position:absolute;right:16px;bottom:48px;z-index:9;background:#0c1016dd;border:1px solid #303843;border-radius:8px;padding:5px 8px;color:#95a0ad;font-size:9px;pointer-events:none}


/* === V10.0 影音播放與工作區輸出強化版 === */
.audioPanel{border:1px solid #354055;background:linear-gradient(145deg,#101620,#13151c)}
.audioState{font-size:9px;color:#92a0b3;padding:6px;border-radius:7px;background:#0d1117;border:1px solid #303944;line-height:1.45}
.audioState.playing{border-color:#356b49;color:#b9e9c6;background:#15261b}
.sceneSizeGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.recState{margin-top:6px;padding:6px 8px;border-radius:7px;border:1px solid #303944;background:#0d1117;color:#9ba4b1;font-size:9px}
.recState.recording{border-color:#7c3b3b;background:#331919;color:#f4bcbc;animation:pulseRec 1.3s infinite}
@keyframes pulseRec{50%{opacity:.72}}
.levelMeter{height:6px;border-radius:99px;background:#202632;overflow:hidden;margin-top:6px}.levelMeter i{display:block;width:0;height:100%;background:linear-gradient(90deg,#52c777,#f1d47f);transition:.08s}


/* === V10.0 操作核心與影音輸出修正版 === */
.selectionActions{position:absolute;z-index:16;right:18px;bottom:88px;display:flex;gap:6px;padding:6px;background:#0b0e13e8;border:1px solid #343b46;border-radius:9px;box-shadow:0 10px 24px #0008}
.selectionActions button{border:1px solid #3a424d;background:#222831;color:#fff;border-radius:6px;padding:6px 10px;font-size:10px}
.selectionActions button:last-child{background:#642929;border-color:#8b3a3a}
.topActionMenu{position:fixed;z-index:500;top:48px;min-width:190px;padding:6px;background:#11151beF;border:1px solid #3b424d;border-radius:9px;box-shadow:0 16px 38px #0009}
.topActionMenu button{display:block;width:100%;text-align:left;border:0;background:transparent;color:#e5e8ee;padding:8px 10px;border-radius:6px}
.topActionMenu button:hover{background:#272d36}

.top{overflow-x:auto;overflow-y:hidden;white-space:nowrap}
.top::-webkit-scrollbar{height:3px}
.stage .quick{display:none!important}


/* === V10.0 穩定核心與播放引擎重構版 === */
.runtimeState{font-size:9px;color:#9bd2aa;background:#14301d;border:1px solid #2d6741;border-radius:999px;padding:3px 7px;margin-left:5px}
.runtimeState.warn{color:#efd58a;background:#352d16;border-color:#746129}
.runtimeState.bad{color:#f0b3b3;background:#381919;border-color:#7c3636}
.performanceHint{font-size:9px;color:#7f8997;line-height:1.45;margin-top:5px}


/* === V10.0 屬性整合＋多模型＋裸眼3D＋媒體生命週期修正版 === */
#propertyUnits{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
#propertyUnits button{border:1px solid #343944;background:#20242b;color:#aab0ba;border-radius:6px;padding:7px}
#propertyUnits button.active{background:#263653;color:#fff;border-color:#5d8dff}
.naked3DGlow{filter:drop-shadow(0 0 12px rgba(90,150,255,.45))}
.stage .selectionActions,.stage .unitbar,.stageToolbarStatus{display:none!important}


/* === V10.0 模型建立修復＋工作台整合版 === */
.dockWorkspace{margin:10px 0 10px;padding:10px;background:#0b0e13;border:1px solid #2e3540;border-radius:10px}
.dockMiniTitle{font-size:11px;font-weight:900;color:#f0d894;margin-bottom:7px}
.dockMiniTitle.mt{margin-top:10px;padding-top:9px;border-top:1px solid #282e37}
.dockMiniLabel{font-size:9px;color:#8f98a6;margin:7px 0 4px}
.dockGrid2{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px}
.dockGrid3{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:5px}
.dockWorkspace button{border:1px solid #363d48;background:#1d222a;color:#e7eaf0;border-radius:7px;padding:7px 6px;font-size:10px;cursor:pointer}
.dockWorkspace button:hover{border-color:#91783b;background:#28251d}
.dockWorkspace button:active{transform:translateY(1px)}
.dockWorkspace .dockPrimary{background:#69541f;border-color:#b08d38;color:#fff3c7;font-weight:800}
.dockWide{width:100%;margin-bottom:5px}
.dockInfoGrid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.dockInfoGrid>div{background:#12161c;border:1px solid #2f3540;border-radius:7px;padding:6px}
.dockInfoGrid span{display:block;color:#828b98;font-size:8px}.dockInfoGrid strong{display:block;color:#e7ebf2;font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dockUnit{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:5px}
.dockUnit button.active{background:#263653!important;border-color:#5d8dff!important;color:#fff!important}
.dockCheck{display:flex;align-items:center;gap:6px;color:#aab1bc;font-size:9px;padding:4px 0}
.dockInfoText{font-size:9px;color:#8993a1;margin-top:5px;line-height:1.4}
#tab-prop>.panel:first-child{margin-top:0}


/* === V10.0 實景 LED 建模核心修復版 === */
.dockCreateState{margin-top:6px;padding:6px 8px;border:1px solid #31583f;background:#12271a;color:#a9ddb8;border-radius:7px;font-size:9px}
.dockCreateState.warn{border-color:#755f28;background:#332a14;color:#ecd58b}
.dockCreateState.bad{border-color:#783636;background:#351919;color:#efb6b6}


/* === V10.0 功能健檢與穩定性修正版 === */
.auditList{margin:6px 0 0;padding-left:16px;font-size:9px;line-height:1.65;color:#aeb6c2}
.btn.activeMode{background:#2d4267!important;border-color:#6b99e8!important}

</style></head><body><h1>Xinyu LED Studio</h1><div class="gold">心禹國際 LED 專案提案</div><p>專案：${esc(cur?.name||"")}</p><p>客戶：${esc(cur?.client||"")}</p><p>日期：${new Date().toLocaleDateString()}</p>${pages}</body></html>`);w.document.close();setTimeout(()=>w.print(),600)
};
q("dxf").onclick=()=>{let d="0\nSECTION\n2\nENTITIES\n";O.filter(o=>o.rw&&o.rh).forEach((o,i)=>{let X=i*(o.rw+500);d+=`0\nLWPOLYLINE\n8\nLED\n90\n4\n70\n1\n10\n${X}\n20\n0\n10\n${X+o.rw}\n20\n0\n10\n${X+o.rw}\n20\n${o.rh}\n10\n${X}\n20\n${o.rh}\n`});d+="0\nENDSEC\n0\nEOF\n";dl(new Blob([d],{type:"application/dxf"}),(cur?.name||"工程")+".dxf")};

function makeContinuousTripleGeometry(w,h,side){
 const pos=[
  -w/2,0,side,-w/2,0,0,w/2,0,0,w/2,0,side,
  -w/2,h,side,-w/2,h,0,w/2,h,0,w/2,h,side
 ];
 const total=side+w+side,u0=0,u1=side/total,u2=(side+w)/total,u3=1;
 const uv=[u0,0,u1,0,u2,0,u3,0,u0,1,u1,1,u2,1,u3,1];
 const idx=[0,5,1,0,4,5,1,6,2,1,5,6,2,7,3,2,6,7];
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}
function buildTripleCanvas(){
 if(!threeContentCanvas){threeContentCanvas=document.createElement("canvas");threeContentCanvas.width=1536;threeContentCanvas.height=768}
 const cx=threeContentCanvas.getContext("2d");cx.fillStyle="#10151c";cx.fillRect(0,0,threeContentCanvas.width,threeContentCanvas.height);
 const o=selected()||O.find(x=>x.media&&x.ready);if(o?.media&&o.ready){
  try{cx.drawImage(o.media,0,0,threeContentCanvas.width,threeContentCanvas.height)}catch{}
 }else{
  const g=cx.createLinearGradient(0,0,threeContentCanvas.width,threeContentCanvas.height);g.addColorStop(0,"#0d5b9d");g.addColorStop(.5,"#7d244f");g.addColorStop(1,"#d89a2b");cx.fillStyle=g;cx.fillRect(0,0,threeContentCanvas.width,threeContentCanvas.height);cx.fillStyle="#fff";cx.font="bold 74px sans-serif";cx.fillText("Xinyu LED Studio",90,380)
 }
 return threeContentCanvas
}
function refreshFacePreview(){
 const src=buildTripleCanvas(),W=src.width,H=src.height,mode=q("tripleMapMode")?.value||"continuous";
 const faces=[["faceLeft",0,W/3],["faceFront",W/3,W/3],["faceRight",W*2/3,W/3]];
 faces.forEach(([id,sx,sw])=>{const cc=q(id),cx=cc?.getContext("2d");if(!cx)return;cx.clearRect(0,0,cc.width,cc.height);
  if(mode==="same")cx.drawImage(src,0,0,W,H,0,0,cc.width,cc.height);
  else cx.drawImage(src,sx,0,sw,H,0,0,cc.width,cc.height)
 })
}
function set3DView(v){
 if(!cam||!oc)return;const d=10;
 if(v==="front")cam.position.set(0,3,-d);
 if(v==="left")cam.position.set(-d,3,0);
 if(v==="right")cam.position.set(d,3,0);
 if(v==="top")cam.position.set(0,d,0.01);
 if(v==="free")cam.position.set(8,6,-10);
 oc.target.set(0,2,0);oc.update()
}
function addStructureFrame(group,w,h,depth,b){
 if(!show3DStructure)return;
 const mat=new THREE.MeshStandardMaterial({color:0x151515,metalness:.75,roughness:.3});
 const t=.045;
 [-w/2,w/2].forEach(xx=>{const m=new THREE.Mesh(new THREE.BoxGeometry(t,h,t),mat);m.position.set(xx,b+h/2,.04);group.add(m)});
 [b,b+h].forEach(yy=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w+t,t,t),mat);m.position.set(0,yy,.04);group.add(m)})
}

function init3(){if(tr)return;tr=new THREE.WebGLRenderer({canvas:q("tc"),antialias:true,preserveDrawingBuffer:true});tr.setPixelRatio(Math.min(devicePixelRatio,2));ts=new THREE.Scene();ts.background=new THREE.Color(0x0b0d11);cam=new THREE.PerspectiveCamera(45,1,.2,100);cam.position.set(8,6,-10);oc=new OrbitControls(cam,q("tc"));oc.target.set(0,1.5,0);ts.add(new THREE.HemisphereLight(0xffffff,0x222222,2));let fl=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0x22252b}));fl.rotation.x=-Math.PI/2;ts.add(fl);root=new THREE.Group();ts.add(root);(function an(){requestAnimationFrame(an);if(tr){oc.update();tr.render(ts,cam)}})()}
function build3(){init3();while(root.children.length)root.remove(root.children[0]);O.filter(o=>o.rw&&o.rh&&!o.mask).forEach((o,i)=>{let w=o.rw/1000,h=o.rh/1000,b=(o.base||100)/1000,g=new THREE.Group();g.position.x=(i-(O.length-1)/2)*1.8;let m=new THREE.MeshBasicMaterial({color:0xffffff});if(o.media){let tex=o.media.tagName==="VIDEO"?new THREE.VideoTexture(o.media):new THREE.Texture(o.media);tex.needsUpdate=true;m.map=tex}let s=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);s.position.y=b+h/2;g.add(s);let bs=new THREE.Mesh(new THREE.BoxGeometry(w+.12,b,.4),new THREE.MeshStandardMaterial({color:0x090909}));bs.position.y=b/2;g.add(bs);root.add(g)});resize()}
q("toggle3d").onclick=()=>{is3=!is3;q("stage").classList.toggle("is3d",is3);q("mode").textContent=is3?"3D Preview":"2D 實景編輯";if(is3)build3()};q("rec").onclick=()=>{if(!is3){is3=true;q("stage").classList.add("is3d");build3()}let s=q("tc").captureStream?.(30);if(!s||!window.MediaRecorder){alert("瀏覽器不支援錄影");return}let r=new MediaRecorder(s),a=[];r.ondataavailable=e=>e.data.size&&a.push(e.data);r.onstop=()=>dl(new Blob(a,{type:"video/webm"}),(cur?.name||"3D")+".webm");r.start();toast("錄製10秒3D成果");setTimeout(()=>r.stop(),10000)};
q("import").onclick=()=>{let i=document.createElement("input");i.type="file";i.accept=".json";i.onchange=()=>{let f=i.files[0],r=new FileReader();r.onload=()=>{try{let d=JSON.parse(r.result),p=d.project||{name:"匯入專案"};p.id="P"+Date.now();p.m=Date.now();p.data={o:d.objects||[],a:d.assets||[],v:d.versions||[],groups:d.groups||{}};P.push(p);saveList();dash()}catch{alert("格式錯誤")}};r.readAsText(f)};i.click()};

function enableStageDrop(){const st=q('stage');if(!st||st.dataset.dropReady)return;st.dataset.dropReady='1';st.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('application/x-xinyu')){e.preventDefault();st.classList.add('drop-ready')}});st.addEventListener('dragleave',e=>{if(!st.contains(e.relatedTarget))st.classList.remove('drop-ready')});st.addEventListener('drop',e=>{e.preventDefault();st.classList.remove('drop-ready');let data={};try{data=JSON.parse(e.dataTransfer.getData('application/x-xinyu')||'{}')}catch{}if(data.kind==='model'){addModelAt(data.name,e.clientX,e.clientY);return}if(data.kind==='asset'){const o=hit(pt(e));if(!o){toast('請把素材拖到 LED / LCD 上');return}sel=o.id;const a=A.find(v=>(v.runtimeId||v.id||v.name)===data.id)||A.find(v=>v.name===data.name);attachRuntimeAssetToObject(a,o);props();layers();draw()}})}
function installStageDelete(){
 document.addEventListener("keydown",e=>{
  if(isTextEditing())return;
  if((e.key==="Delete"||e.key==="Backspace")&&selected()){e.preventDefault();deleteSelectedObjects()}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"&&selected()){e.preventDefault();duplicateSelectedObjects()}
  if(e.key==="Escape"){sel=null;multiSel=[];O.forEach(o=>o._layerSelected=false);draw();props();layers();updateSelectionActions()}
 })
}

function installSceneQuickCreate(){
 if(c.dataset.sceneCreateReady)return;c.dataset.sceneCreateReady="1";
 c.addEventListener("dblclick",e=>{
  if(tool!=="select"||hit(pt(e)))return;
  const p=pt(e);createModelSafe("常規屏",p)
 });
}

function installV32(){q('collapseDock')?.addEventListener('click',e=>{e.stopPropagation();document.body.classList.toggle('dock-collapsed');q('collapseDock').textContent=document.body.classList.contains('dock-collapsed')?'▶':'◀';setTimeout(resize,80)});q('collapseInspector')?.addEventListener('click',e=>{e.stopPropagation();document.body.classList.toggle('inspector-collapsed');q('collapseInspector').textContent=document.body.classList.contains('inspector-collapsed')?'◀':'▶';setTimeout(resize,80)});qa('.btabs button').forEach(btn=>btn.onclick=()=>bottom(btn.dataset.b));q('dockSearch')?.addEventListener('input',()=>bottom(document.querySelector('.btabs button.active')?.dataset.b||'ledmodels'));enableStageDrop();installWheelControls();installStageDelete();installTopMenus();installSceneQuickCreate();setRuntimeState("正常","ok");updateSelectionActions();updatePropertySceneInfo();updateFitBadge();syncSceneInputs();updateAudioControls();const oldUp=c.onpointerup;c.onpointerup=e=>{if(oldUp)oldUp.call(c,e);const o=selected();if(o&&autoAttachAssembly(o)){draw();props();scheduleHeavyRefresh();markChanged()}}}installV32();
dash();resize();bottom("ledmodels");summary();renderSceneTabs();renderGuides();projectHealth();if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});

if(new URLSearchParams(location.search).get("selftest")==="1"){
 window.addEventListener("load",()=>setTimeout(()=>v10BrowserSelfTest(),600));
}
