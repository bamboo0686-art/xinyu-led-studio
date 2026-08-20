window.__XINYU_APP_SCRIPT_LOADED__=true;
window.__XINYU_BOOT_OK__=false;
const DEVICE_PRESETS={
  standard:{name:"一般 LED",w:3000,h:1800,type:"standard",pitch:"P2.604"},
  single:{name:"一境光幕屏",w:1000,h:2000,type:"single",pitch:"P2.604"},
  triple:{name:"三境光幕屏",w:3000,h:2000,type:"triple",pitch:"P2.604"},
  tower:{name:"三面 LED 精神堡壘",w:3000,h:4000,type:"tower",pitch:"P2.604"},
  lshape:{name:"L 型屏",w:2800,h:1900,type:"lshape",pitch:"P2.604"},
  curve:{name:"曲面屏",w:3200,h:1800,type:"curve",pitch:"P2.604"},
  ushape:{name:"ㄇ字型屏",w:3000,h:2000,type:"ushape",pitch:"P2.604"},
  cylinder:{name:"圓柱屏",w:1800,h:2400,type:"cylinder",pitch:"P2.604"},
  irregular:{name:"異形設備",w:2600,h:1800,type:"irregular",pitch:"P2.604",shape:"trapezoid"}
};
const uid=(p="ID")=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
function createProject(name="未命名專案",client=""){
  return {id:uid("PRJ"),name,client,createdAt:Date.now(),updatedAt:Date.now(),
    scene:{assetId:null,rotation:0,scale:1},objects:[],assets:[],ui:{grid:true,snap:true,zoom:1}};
}
function createDevice(kind="standard",x=350,y=220){
  const p=DEVICE_PRESETS[kind]||DEVICE_PRESETS.standard;
  return {id:uid("DEV"),name:p.name,type:p.type,w:p.w,h:p.h,x,y,rotation:0,pitch:p.pitch,brightness:100,assetId:null,shape:p.shape||null,shapePoints:null,mediaX:0,mediaY:0,mediaW:100,mediaH:100,mediaRotation:0,mediaFit:"cover",mediaOpacity:100,mediaBrightness:100,mediaContrast:100,mediaSaturation:100,videoRate:1,videoMuted:false,n3dPerspective:900,n3dDepth:24,n3dRotateY:-12,n3dRotateX:4,n3dOriginX:50,n3dOriginY:50,n3dScale:100,n3dVignette:18};
}
function deepClone(v){return JSON.parse(JSON.stringify(v))}
function pushHistory(history,state,max=60){history.push(deepClone(state));while(history.length>max)history.shift()}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function objectToScreen(o,scale=0.12){return {left:o.x,top:o.y,width:Math.max(55,o.w*scale),height:Math.max(45,o.h*scale)}}
function screenToReal(px,scale=0.12){return Math.round(px/scale)}
function moveDevice(o,dx,dy,snap=false,grid=10){o.x+=dx;o.y+=dy;if(snap){o.x=Math.round(o.x/grid)*grid;o.y=Math.round(o.y/grid)*grid}return o}
function resizeDevice(o,widthPx,heightPx,scale=0.12){o.w=Math.max(100,screenToReal(widthPx,scale));o.h=Math.max(100,screenToReal(heightPx,scale));return o}
function rotateDevice(o,deg){o.rotation=((deg%360)+360)%360;return o}
function validateProject(p){
 const errors=[];
 if(!p||typeof p!=="object")errors.push("project_not_object");
 if(!Array.isArray(p?.objects))errors.push("objects_not_array");
 if(!Array.isArray(p?.assets))errors.push("assets_not_array");
 if(!p?.scene)errors.push("scene_missing");
 return {ok:errors.length===0,errors};
}
function nextStep(p,selectedId=null){
 if(!p.scene?.assetId)return {panel:"scene",label:"上傳實景",reason:"先建立現場背景"};
 if(!p.objects.length)return {panel:"devices",label:"建立 LED",reason:"場景目前沒有設備"};
 if(!selectedId)return {panel:"layers",label:"選取設備",reason:"選取設備後才能調整"};
 const o=p.objects.find(x=>x.id===selectedId);
 if(o&&!o.assetId)return {panel:"media",label:"套用素材",reason:"設備尚未有圖片或影片"};
 return {panel:"preview",label:"3D 預覽",reason:"主要視覺流程已完成"};
}


const q=id=>document.getElementById(id);
const qa=s=>[...document.querySelectorAll(s)];
const STORAGE_KEY="XINYU_LED_STUDIO_V21_PROJECTS";
const DB_NAME="XinyuLEDStudioV21Assets";
const DB_STORE="assets";
const SCREEN_SCALE=.12;

let projects=[];
let project=null;
let selectedId=null;
let history=[],future=[],deletedStack=[];
let stageZoom=1;
let dragState=null;
let activeVideo=null;
let threeCtx=null;
let dirty=false;
let dockCollapsed=false;

const ACTIONS={};

function log(msg,type="info"){
  const line=`${new Date().toLocaleTimeString()}  ${msg}`;
  const div=document.createElement("div");div.textContent=line;div.className=`log-${type}`;
  q("logView")?.prepend(div);
  console[type==="error"?"error":"log"](msg);
}
function toast(msg,type="info"){
  const el=document.createElement("div");el.className=`toast ${type}`;el.textContent=msg;q("toastHost").append(el);
  setTimeout(()=>el.remove(),2800);
}
function setBoot(text){if(q("bootStatus"))q("bootStatus").textContent=text}
function safeJSON(raw,fallback){try{return JSON.parse(raw)}catch{return fallback}}
function loadProjects(){
  projects=safeJSON(localStorage.getItem(STORAGE_KEY)||"[]",[]);
  if(!Array.isArray(projects))projects=[];
}
function saveProjects(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));
}
function persistCurrent(){
  if(!project)return;
  project.updatedAt=Date.now();
  const idx=projects.findIndex(x=>x.id===project.id);
  if(idx>=0)projects[idx]=deepClone(project);else projects.unshift(deepClone(project));
  saveProjects();dirty=false;updateSaveState();
}
function updateSaveState(){q("saveState").textContent=dirty?"尚未儲存":"已儲存"}
function markDirty(){dirty=true;updateSaveState()}
function snapHistory(){
  if(!project)return;
  pushHistory(history,{scene:project.scene,objects:project.objects,assets:project.assets});
  future=[];
  updateActionState();
}
function restoreSnapshot(s){
  if(!project||!s)return;
  project.scene=deepClone(s.scene);project.objects=deepClone(s.objects);project.assets=deepClone(s.assets);
  selectedId=null;renderAll();markDirty();
}
function undo(){
  if(!history.length||!project)return;
  future.push({scene:deepClone(project.scene),objects:deepClone(project.objects),assets:deepClone(project.assets)});
  restoreSnapshot(history.pop());updateActionState();
}
function redo(){
  if(!future.length||!project)return;
  history.push({scene:deepClone(project.scene),objects:deepClone(project.objects),assets:deepClone(project.assets)});
  restoreSnapshot(future.pop());updateActionState();
}

async function db(){
  return await new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(DB_STORE))d.createObjectStore(DB_STORE,{keyPath:"id"})};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function putBlob(id,blob,name,type){
  try{
    const d=await db();const tx=d.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).put({id,blob,name,type});
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});
  }catch(e){log("IndexedDB 儲存失敗："+e.message,"error")}
}
async function getBlob(id){
  try{
    const d=await db();return await new Promise((res,rej)=>{
      const r=d.transaction(DB_STORE).objectStore(DB_STORE).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)
    });
  }catch{return null}
}
async function deleteBlob(id){
  try{const d=await db();d.transaction(DB_STORE,"readwrite").objectStore(DB_STORE).delete(id)}catch{}
}

function showDashboard(){
  q("studio").classList.add("hidden");q("dashboard").classList.remove("hidden");renderRecentProjects()
}
function showStudio(){
  q("dashboard").classList.add("hidden");q("studio").classList.remove("hidden");requestAnimationFrame(()=>fitStage())
}
function renderRecentProjects(){
  const box=q("recentProjects");box.innerHTML="";
  const sorted=[...projects].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,8);
  if(!sorted.length){box.innerHTML='<div class="empty-projects">尚無專案。建立第一個專案後會顯示在這裡。</div>';return}
  sorted.forEach(p=>{
    const card=document.createElement("article");card.className="project-card";
    card.innerHTML=`<h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.client||"未填客戶／案場")}</p><small>${new Date(p.updatedAt||p.createdAt).toLocaleString()}</small>`;
    card.onclick=()=>openProject(p.id);box.append(card)
  });
}
function escapeHTML(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function openProjectModal(){q("projectModal").classList.remove("hidden");setTimeout(()=>q("newProjectName").focus(),50)}
function closeProjectModal(){q("projectModal").classList.add("hidden")}
function newProjectFromForm(e){
  e.preventDefault();const name=q("newProjectName").value.trim()||"未命名專案",client=q("newProjectClient").value.trim();
  project=createProject(name,client);projects.unshift(deepClone(project));saveProjects();history=[];future=[];deletedStack=[];selectedId=null;
  closeProjectModal();q("projectForm").reset();openProject(project.id)
}
async function openProject(id){
  const p=projects.find(x=>x.id===id);if(!p){toast("找不到專案","error");return}
  const valid=validateProject(p);if(!valid.ok){toast("專案資料損壞："+valid.errors.join(","),"error");return}
  project=deepClone(p);history=[];future=[];deletedStack=[];selectedId=null;dirty=false;
  q("projectTitle").textContent=project.name;showStudio();await restoreSceneImage();renderAll();log(`已開啟專案：${project.name}`);updateSaveState()
}

async function handleSceneFile(file){
  if(!project||!file)return;
  snapHistory();
  const id=uid("ASSET");await putBlob(id,file,file.name,file.type);
  project.scene.assetId=id;project.scene.rotation=0;project.scene.scale=1;
  q("sceneRotation").value=0;q("sceneScale").value=100;
  await restoreSceneImage();markDirty();renderWorkflow();toast("實景已載入","success")
}
async function restoreSceneImage(){
  const img=q("sceneImage");
  if(!project?.scene?.assetId){img.src="";img.classList.add("hidden");return}
  const rec=await getBlob(project.scene.assetId);
  if(!rec){img.classList.add("hidden");return}
  const url=URL.createObjectURL(rec.blob);img.onload=()=>{URL.revokeObjectURL(url);applySceneTransform()};img.src=url;img.classList.remove("hidden")
}
function applySceneTransform(){
  const img=q("sceneImage"),sc=project?.scene?.scale||1,rot=project?.scene?.rotation||0;
  if(!img.naturalWidth)return;
  const world=q("stageWorld").getBoundingClientRect(),fit=Math.min(1000/img.naturalWidth,650/img.naturalHeight)*.98;
  img.style.width=`${img.naturalWidth*fit}px`;img.style.height=`${img.naturalHeight*fit}px`;
  img.style.transform=`translate(-50%,-50%) rotate(${rot}deg) scale(${sc})`;
  q("sceneRotationOut").value=`${rot}°`;q("sceneScaleOut").value=`${Math.round(sc*100)}%`
}
async function deleteScene(){
  if(!project?.scene?.assetId)return;
  if(!confirm("確定刪除目前實景？"))return;
  snapHistory();const id=project.scene.assetId;project.scene.assetId=null;await deleteBlob(id);await restoreSceneImage();markDirty();renderWorkflow()
}

function addDevice(kind){
  if(!project)return;
  snapHistory();
  const o=createDevice(kind,330+project.objects.length*18,220+project.objects.length*15);
  project.objects.push(o);selectedId=o.id;renderAll();markDirty();toast(`已新增：${o.name}`,"success")
}
function selected(){return project?.objects?.find(x=>x.id===selectedId)||null}
function duplicateSelected(){
  const o=selected();if(!o)return;
  snapHistory();const c=deepClone(o);c.id=uid("DEV");c.name=o.name+" 複製";c.x+=25;c.y+=25;project.objects.push(c);selectedId=c.id;renderAll();markDirty()
}
function deleteSelected(){
  const o=selected();if(!o)return;
  if(!confirm(`確定刪除「${o.name}」？`))return;
  snapHistory();deletedStack.push(deepClone(o));project.objects=project.objects.filter(x=>x.id!==o.id);selectedId=null;renderAll();markDirty()
}
function restoreDeleted(){
  const o=deletedStack.pop();if(!o)return;snapHistory();o.id=uid("DEV");project.objects.push(o);selectedId=o.id;renderAll();markDirty()
}
function centerSelected(){
  const o=selected();if(!o)return;snapHistory();o.x=500-objectToScreen(o,SCREEN_SCALE).width/2;o.y=325-objectToScreen(o,SCREEN_SCALE).height/2;renderAll();markDirty()
}

async function handleMediaFile(file){
  if(!project||!file)return;
  const id=uid("MEDIA");await putBlob(id,file,file.name,file.type);
  project.assets.push({id,name:file.name,type:file.type});markDirty();renderMediaLibrary();toast("素材已加入","success")
}
async function applyAsset(assetId){
  const o=selected();if(!o){toast("請先選取 LED 設備");return}
  snapHistory();o.assetId=assetId;await renderDevices();markDirty();renderWorkflow()
}


function ensureIrregularPoints(o){
 if(o.type!=="irregular")return [];
 if(o.shapePoints){
   return o.shapePoints.split(",").map(p=>{
     const [x,y]=p.trim().split(/\s+/).map(Number);return{x:Number.isFinite(x)?x:0,y:Number.isFinite(y)?y:0}
   }).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))
 }
 const presets={
  trapezoid:[[8,15],[82,0],[100,100],[0,88]],
  diamond:[[50,0],[100,50],[50,100],[0,50]],
  hexagon:[[25,0],[75,0],[100,50],[75,100],[25,100],[0,50]],
  triangle:[[50,0],[100,100],[0,100]],
  octagon:[[30,0],[70,0],[100,30],[100,70],[70,100],[30,100],[0,70],[0,30]],
  custom:[[0,20],[70,0],[100,30],[90,100],[20,90],[0,60]]
 };
 return (presets[o.shape||"trapezoid"]||presets.trapezoid).map(([x,y])=>({x,y}))
}
function writeIrregularPoints(o,pts){
 o.shape="custom";o.shapePoints=pts.map(p=>`${Math.round(p.x*100)/100} ${Math.round(p.y*100)/100}`).join(", ");
}
function deviceAnchorHTML(o){
 const corners=`<i class="device-anchor nw" data-anchor="nw"></i><i class="device-anchor ne" data-anchor="ne"></i><i class="device-anchor sw" data-anchor="sw"></i><i class="device-anchor se" data-anchor="se"></i>`;
 const verts=o.type==="irregular"?ensureIrregularPoints(o).map((p,i)=>`<i class="vertex-anchor" data-vertex="${i}" style="left:${p.x}%;top:${p.y}%"></i>`).join(""):"";
 return corners+verts
}
function normalizeN3D(o){
 const d={n3dPerspective:900,n3dDepth:24,n3dRotateY:-12,n3dRotateX:4,n3dOriginX:50,n3dOriginY:50,n3dScale:100,n3dVignette:18};
 Object.entries(d).forEach(([k,v])=>{if(o[k]===undefined||o[k]===null)o[k]=v});return o
}
function updateNaked3DInspector(){
 const o=selected(),asset=project?.assets?.find(a=>a.id===o?.assetId),isVideo=asset?.type?.startsWith("video/");
 q("naked3dControls")?.classList.toggle("hidden",!isVideo);
 if(!o||!isVideo)return;normalizeN3D(o);
 ["Perspective","Depth","RotateY","RotateX","OriginX","OriginY","Scale","Vignette"].forEach(k=>{
   const id="n3d"+k;if(q(id))q(id).value=o[id]
 });
 q("n3dPerspectiveOut").value=o.n3dPerspective;q("n3dDepthOut").value=o.n3dDepth;q("n3dScaleOut").value=`${o.n3dScale}%`;q("n3dVignetteOut").value=`${o.n3dVignette}%`;
}
async function buildNaked3DPreview(){
 const o=selected();if(!o?.assetId)return toast("請先選取含影片的設備");
 const asset=project.assets.find(a=>a.id===o.assetId);if(!asset?.type?.startsWith("video/"))return toast("裸眼3D預覽目前針對影片素材");
 const rec=await getBlob(o.assetId);if(!rec)return toast("找不到影片素材","error");
 normalizeN3D(o);
 const host=q("naked3dMediaHost");host.innerHTML="";
 const v=document.createElement("video");v.src=URL.createObjectURL(rec.blob);v.playsInline=true;v.loop=true;v.controls=false;v.muted=o.videoMuted;v.playbackRate=o.videoRate||1;
 host.append(v);host.dataset.assetUrl=v.src;applyNaked3DPreview();q("naked3dModal").classList.remove("hidden");
}
function applyNaked3DPreview(){
 const o=selected(),host=q("naked3dMediaHost");if(!o||!host)return;normalizeN3D(o);
 const media=host.querySelector("video,img");
 host.parentElement.style.perspective=`${o.n3dPerspective}px`;
 host.parentElement.style.perspectiveOrigin=`${o.n3dOriginX}% ${o.n3dOriginY}%`;
 host.style.transform=`rotateX(${o.n3dRotateX}deg) rotateY(${o.n3dRotateY}deg) translateZ(${o.n3dDepth}px) scale(${o.n3dScale/100})`;
 host.style.boxShadow=`0 0 ${Math.max(0,o.n3dVignette*1.5)}px rgba(0,0,0,${Math.min(.85,o.n3dVignette/100+.12)})`;
 if(media)media.style.transform=`translateZ(${o.n3dDepth}px)`;
 q("n3dReadPerspective").textContent=`${o.n3dPerspective}px`;q("n3dReadDepth").textContent=`${o.n3dDepth}px`;q("n3dReadRotateY").textContent=`${o.n3dRotateY}°`;q("n3dReadRotateX").textContent=`${o.n3dRotateX}°`;q("n3dReadOrigin").textContent=`${o.n3dOriginX}% / ${o.n3dOriginY}%`;
}
function bindNaked3DControls(){
 const ids={n3dPerspective:"n3dPerspective",n3dDepth:"n3dDepth",n3dRotateY:"n3dRotateY",n3dRotateX:"n3dRotateX",n3dOriginX:"n3dOriginX",n3dOriginY:"n3dOriginY",n3dScale:"n3dScale",n3dVignette:"n3dVignette"};
 Object.entries(ids).forEach(([id,key])=>{
   const el=q(id);if(!el)return;
   const evt=el.type==="range"?"input":"change";
   el.addEventListener(evt,()=>{const o=selected();if(!o)return;o[key]=Number(el.value);updateNaked3DInspector();applyNaked3DPreview();markDirty()})
 })
}
function resetNaked3D(){
 const o=selected();if(!o)return;snapHistory();
 Object.assign(o,{n3dPerspective:900,n3dDepth:24,n3dRotateY:-12,n3dRotateX:4,n3dOriginX:50,n3dOriginY:50,n3dScale:100,n3dVignette:18});
 updateNaked3DInspector();applyNaked3DPreview();markDirty()
}
function closeNaked3D(){
 const host=q("naked3dMediaHost");const v=host?.querySelector("video");if(v){v.pause();if(v.src?.startsWith("blob:"))URL.revokeObjectURL(v.src)}if(host)host.innerHTML="";q("naked3dModal").classList.add("hidden")
}
function naked3dPlayPause(){const v=q("naked3dMediaHost")?.querySelector("video");if(!v)return;v.paused?v.play().catch(()=>{}):v.pause()}

async function renderDevices(){
  const layer=q("deviceLayer");layer.innerHTML="";activeVideo=null;
  for(const o of project?.objects||[]){
    const s=objectToScreen(o,SCREEN_SCALE);
    const el=document.createElement("div");el.className=`device ${o.type} ${o.id===selectedId?"selected":""}`;
    el.dataset.id=o.id;el.style.left=`${o.x}px`;el.style.top=`${o.y}px`;el.style.width=`${s.width}px`;el.style.height=`${s.height}px`;el.style.transform=`rotate(${o.rotation||0}deg)`;if(o.type==="irregular")el.style.setProperty("--irregular-clip",shapeClip(o));
    el.innerHTML=`<div class="device-screen"></div><div class="device-label">${escapeHTML(o.name)}</div><i class="rotate-stem"></i><i class="rotate-handle" data-handle="rotate"></i>${deviceAnchorHTML(o)}`;
    el.addEventListener("pointerdown",onDevicePointerDown);
    layer.append(el);
    if(o.assetId){
      const rec=await getBlob(o.assetId);
      if(rec){
        const url=URL.createObjectURL(rec.blob),screen=el.querySelector(".device-screen");
        if(rec.type.startsWith("video/")){
          const v=document.createElement("video");v.src=url;v.playsInline=true;v.muted=false;v.loop=false;v.addEventListener("loadedmetadata",()=>{if(o.id===selectedId){activeVideo=v;syncTimeline()}});
          v.addEventListener("timeupdate",()=>{if(o.id===selectedId)syncTimeline()});mediaStyle(o,v);v.playbackRate=Number(o.videoRate)||1;v.muted=!!o.videoMuted;screen.append(v);if(o.id===selectedId)activeVideo=v
        }else{
          const im=document.createElement("img");im.src=url;mediaStyle(o,im);im.onload=()=>URL.revokeObjectURL(url);screen.append(im)
        }
      }
    }
  }
  updateActionState();renderInspector();renderLayers();renderStatus()
}
function onDevicePointerDown(e){
  e.preventDefault();e.stopPropagation();
  const el=e.currentTarget,id=el.dataset.id,o=project.objects.find(x=>x.id===id);if(!o)return;
  if(selectedId!==id){selectedId=id;renderDevices();renderWorkflow()}
  const vertexIndex=e.target.dataset.vertex!==undefined?Number(e.target.dataset.vertex):null;const handle=e.target.dataset.anchor||e.target.dataset.handle||(vertexIndex!==null?"vertex":"move");snapHistory();
  const start={x:e.clientX,y:e.clientY,ox:o.x,oy:o.y,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,rot:o.rotation||0,handle,id,vertexIndex,points:o.type==="irregular"?ensureIrregularPoints(o):null};
  dragState=start;el.setPointerCapture(e.pointerId);
  const move=ev=>{
    if(!dragState)return;const dx=(ev.clientX-start.x)/stageZoom,dy=(ev.clientY-start.y)/stageZoom;
    if(handle==="move"){o.x=start.ox+dx;o.y=start.oy+dy;if(project.ui.snap){o.x=Math.round(o.x/10)*10;o.y=Math.round(o.y/10)*10}}
    if(["nw","ne","sw","se"].includes(handle)){
      let newW=start.w,newH=start.h,newX=start.ox,newY=start.oy;
      if(handle.includes("e"))newW=Math.max(50,start.w+dx);
      if(handle.includes("s"))newH=Math.max(45,start.h+dy);
      if(handle.includes("w")){newW=Math.max(50,start.w-dx);newX=start.ox+(start.w-newW)}
      if(handle.includes("n")){newH=Math.max(45,start.h-dy);newY=start.oy+(start.h-newH)}
      resizeDevice(o,newW,newH,SCREEN_SCALE);o.x=newX;o.y=newY
    }
    if(handle==="vertex"&&o.type==="irregular"&&start.points?.[start.vertexIndex]){
      const r=el.getBoundingClientRect(),pts=start.points.map(p=>({...p}));
      pts[start.vertexIndex].x=clamp(((e.clientX-r.left)/Math.max(1,r.width))*100,0,100);
      pts[start.vertexIndex].y=clamp(((e.clientY-r.top)/Math.max(1,r.height))*100,0,100);
      writeIrregularPoints(o,pts);el.style.setProperty("--irregular-clip",shapeClip(o));
      const va=el.querySelector(`[data-vertex="${start.vertexIndex}"]`);if(va){va.style.left=`${pts[start.vertexIndex].x}%`;va.style.top=`${pts[start.vertexIndex].y}%`}
      q("customShapePoints")&&(q("customShapePoints").value=o.shapePoints||"")
    }
    if(handle==="rotate"){
      const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
      o.rotation=Math.round(Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI+90)
    }
    const s=objectToScreen(o,SCREEN_SCALE);el.style.left=`${o.x}px`;el.style.top=`${o.y}px`;el.style.width=`${s.width}px`;el.style.height=`${s.height}px`;el.style.transform=`rotate(${o.rotation}deg)`;
    updateInspectorValues();renderStatus();markDirty()
  };
  const up=()=>{dragState=null;el.removeEventListener("pointermove",move);el.removeEventListener("pointerup",up);el.removeEventListener("pointercancel",up);renderLayers();renderWorkflow()};
  el.addEventListener("pointermove",move);el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up)
}

const SHAPE_TEMPLATES={
 trapezoid:"polygon(8% 15%,82% 0%,100% 100%,0% 88%)",
 diamond:"polygon(50% 0%,100% 50%,50% 100%,0% 50%)",
 hexagon:"polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)",
 triangle:"polygon(50% 0%,100% 100%,0% 100%)",
 octagon:"polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%)",
 custom:"polygon(0% 20%,70% 0%,100% 30%,90% 100%,20% 90%,0% 60%)"
};
function shapeClip(o){
 if(!o||o.type!=="irregular")return "";
 if(o.shapePoints)return `polygon(${o.shapePoints.split(",").map(p=>{const [x,y]=p.trim().split(/\s+/);return `${Number(x)||0}% ${Number(y)||0}%`}).join(",")})`;
 return SHAPE_TEMPLATES[o.shape||"trapezoid"]||SHAPE_TEMPLATES.trapezoid
}
function normalizeMedia(o){
 const d={mediaX:0,mediaY:0,mediaW:100,mediaH:100,mediaRotation:0,mediaFit:"cover",mediaOpacity:100,mediaBrightness:100,mediaContrast:100,mediaSaturation:100,videoRate:1,videoMuted:false};
 Object.entries(d).forEach(([k,v])=>{if(o[k]===undefined||o[k]===null)o[k]=v});return o
}
function mediaStyle(o,el){
 normalizeMedia(o);
 el.style.width=`${o.mediaW}%`;el.style.height=`${o.mediaH}%`;
 el.style.objectFit=o.mediaFit||"cover";
 el.style.transform=`translate(${o.mediaX}%,${o.mediaY}%) rotate(${o.mediaRotation}deg)`;
 el.style.opacity=(o.mediaOpacity??100)/100;
 el.style.filter=`brightness(${o.mediaBrightness??100}%) contrast(${o.mediaContrast??100}%) saturate(${o.mediaSaturation??100}%)`;
}
function updateMediaInspector(){
 const o=selected(),has=!!o?.assetId;
 q("inspectorMedia")?.classList.toggle("hidden",!has);
 q("inspectorIrregular")?.classList.toggle("hidden",o?.type!=="irregular");
 if(!o)return;normalizeMedia(o);
 if(has){
   q("mediaOffsetX").value=o.mediaX;q("mediaOffsetY").value=o.mediaY;q("mediaWidthPct").value=o.mediaW;q("mediaHeightPct").value=o.mediaH;
   q("mediaRotation").value=o.mediaRotation;q("mediaFit").value=o.mediaFit;q("mediaOpacity").value=o.mediaOpacity;
   q("mediaBrightness").value=o.mediaBrightness;q("mediaContrast").value=o.mediaContrast;q("mediaSaturation").value=o.mediaSaturation;
   q("mediaOpacityOut").value=`${o.mediaOpacity}%`;q("mediaBrightnessOut").value=`${o.mediaBrightness}%`;q("mediaContrastOut").value=`${o.mediaContrast}%`;q("mediaSaturationOut").value=`${o.mediaSaturation}%`;
   const asset=project?.assets?.find(a=>a.id===o.assetId),isVideo=asset?.type?.startsWith("video/");
   q("videoOnlyControls")?.classList.toggle("hidden",!isVideo);
   if(isVideo){q("videoRate").value=String(o.videoRate||1);q("videoMuted").value=String(!!o.videoMuted)}
 }
 if(o.type==="irregular")q("customShapePoints").value=o.shapePoints||""
}
function refreshSelectedMediaRuntime(){
 const o=selected();if(!o)return;
 const el=document.querySelector(`.device[data-id="${o.id}"] .device-screen img,.device[data-id="${o.id}"] .device-screen video`);
 if(el)mediaStyle(o,el);
 if(activeVideo&&o.assetId){
   activeVideo.playbackRate=Number(o.videoRate)||1;
   activeVideo.muted=!!o.videoMuted;
 }
}
function bindMediaInspector(){
 const binds={
  mediaOffsetX:["mediaX",Number],mediaOffsetY:["mediaY",Number],mediaWidthPct:["mediaW",Number],mediaHeightPct:["mediaH",Number],
  mediaRotation:["mediaRotation",Number],mediaFit:["mediaFit",String],mediaOpacity:["mediaOpacity",Number],
  mediaBrightness:["mediaBrightness",Number],mediaContrast:["mediaContrast",Number],mediaSaturation:["mediaSaturation",Number],
  videoRate:["videoRate",Number],videoMuted:["videoMuted",v=>v==="true"]
 };
 Object.entries(binds).forEach(([id,[key,conv]])=>{
   q(id)?.addEventListener(id.startsWith("media")&&q(id).type==="range"?"input":"change",()=>{
     const o=selected();if(!o)return; o[key]=conv(q(id).value);updateMediaInspector();refreshSelectedMediaRuntime();markDirty()
   })
 });
 qa("[data-shape-template]").forEach(b=>b.onclick=()=>{const o=selected();if(!o||o.type!=="irregular")return;snapHistory();o.shape=b.dataset.shapeTemplate;o.shapePoints=null;renderAll();markDirty()});
}
function resetMediaTransform(){
 const o=selected();if(!o?.assetId)return;snapHistory();
 Object.assign(o,{mediaX:0,mediaY:0,mediaW:100,mediaH:100,mediaRotation:0,mediaFit:"cover",mediaOpacity:100,mediaBrightness:100,mediaContrast:100,mediaSaturation:100,videoRate:1,videoMuted:false});
 updateMediaInspector();refreshSelectedMediaRuntime();markDirty();toast("素材調整已重設")
}
function removeMedia(){
 const o=selected();if(!o?.assetId)return;
 if(!confirm("確定移除目前設備上的素材？素材庫檔案不會刪除。"))return;
 snapHistory();o.assetId=null;activeVideo=null;renderAll();markDirty()
}
function seekVideo(delta){if(!activeVideo)return;activeVideo.currentTime=clamp((activeVideo.currentTime||0)+delta,0,Number.isFinite(activeVideo.duration)?activeVideo.duration:999999)}
function applyCustomShape(){
 const o=selected();if(!o||o.type!=="irregular")return;
 const raw=q("customShapePoints").value.trim();
 const pts=raw.split(",").map(x=>x.trim()).filter(Boolean);
 if(pts.length<3){toast("異形至少需要 3 個頂點","error");return}
 const ok=pts.every(p=>{const m=p.match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/);return !!m});
 if(!ok){toast("格式錯誤。請使用：0 20, 70 0, 100 30 ...","error");return}
 snapHistory();o.shape="custom";o.shapePoints=raw;renderAll();markDirty();toast("自訂異形已套用","success")
}

function renderInspector(){
  const o=selected();q("inspectorEmpty").classList.toggle("hidden",!!o);q("inspectorDevice").classList.toggle("hidden",!o);if(!o){q("inspectorMedia")?.classList.add("hidden");q("inspectorIrregular")?.classList.add("hidden");return}updateInspectorValues();updateMediaInspector();updateNaked3DInspector()
}
function updateInspectorValues(){
  const o=selected();if(!o)return;
  q("propName").value=o.name;q("propWidth").value=Math.round(o.w);q("propHeight").value=Math.round(o.h);q("propX").value=Math.round(o.x);q("propY").value=Math.round(o.y);
  q("propRotation").value=Math.round(o.rotation||0);q("propPitch").value=o.pitch||"P2.604";q("propBrightness").value=o.brightness||100;q("propBrightnessOut").value=`${o.brightness||100}%`
}
function bindInspector(){
  const bind=(id,key,conv=v=>v)=>q(id).addEventListener("change",()=>{const o=selected();if(!o)return;snapHistory();o[key]=conv(q(id).value);renderAll();markDirty()});
  bind("propName","name");bind("propWidth","w",Number);bind("propHeight","h",Number);bind("propX","x",Number);bind("propY","y",Number);bind("propRotation","rotation",Number);bind("propPitch","pitch");
  q("propBrightness").addEventListener("input",()=>{const o=selected();if(!o)return;o.brightness=Number(q("propBrightness").value);q("propBrightnessOut").value=`${o.brightness}%`;qa(`.device[data-id="${o.id}"] .device-screen`).forEach(el=>el.style.filter=`brightness(${o.brightness}%)`);markDirty()})
}
function renderLayers(){
  const box=q("layerList");box.innerHTML="";
  (project?.objects||[]).forEach(o=>{
    const el=document.createElement("div");el.className=`layer-item ${o.id===selectedId?"active":""}`;el.innerHTML=`<div class="media-meta"><b>${escapeHTML(o.name)}</b><small>${Math.round(o.w)}×${Math.round(o.h)} mm｜${escapeHTML(o.pitch)}</small></div>`;
    el.onclick=()=>{selectedId=o.id;renderAll()};box.append(el)
  });
  if(!project?.objects?.length)box.innerHTML='<div class="hint-box">尚無設備。</div>'
}
async function renderMediaLibrary(){
  const box=q("mediaLibrary");box.innerHTML="";
  for(const a of project?.assets||[]){
    const rec=await getBlob(a.id),el=document.createElement("div");el.className="media-item";
    let thumb='<div class="media-thumb"></div>';
    if(rec?.type?.startsWith("image/")){const url=URL.createObjectURL(rec.blob);thumb=`<img class="media-thumb" src="${url}">`}
    el.innerHTML=`${thumb}<div class="media-meta"><b>${escapeHTML(a.name)}</b><small>${escapeHTML(a.type)}</small></div>`;
    el.onclick=()=>applyAsset(a.id);box.append(el)
  }
  if(!project?.assets?.length)box.innerHTML='<div class="hint-box">素材庫是空的。</div>'
}
function renderStatus(){q("selectionStatus").textContent=selected()?`選取：${selected().name}`:"未選取設備";q("objectCount").textContent=`設備 ${project?.objects?.length||0}`;q("zoomLabel").textContent=`${Math.round(stageZoom*100)}%`}
function renderWorkflow(){
  if(!project)return;const n=nextStep(project,selectedId);q("nextHint").textContent=`建議：${n.label}｜${n.reason}`;
  qa(".flow").forEach(x=>x.classList.remove("active"));const map={scene:0,devices:1,media:2,preview:4};const idx=map[n.panel];if(idx!==undefined)qa(".flow")[idx]?.classList.add("active");
  q("emptyStage").classList.toggle("hidden",!!project.scene.assetId||project.objects.length>0)
}
function renderAll(){renderSceneControls();renderDevices();renderMediaLibrary();renderWorkflow();updateActionState();syncAIContext()}
function renderSceneControls(){if(!project)return;q("sceneRotation").value=project.scene.rotation||0;q("sceneScale").value=Math.round((project.scene.scale||1)*100);applySceneTransform()}
function updateActionState(){
  const has=!!selected(),p=!!project;
  setDisabled("undo",!history.length);setDisabled("redo",!future.length);setDisabled("save-project",!p);setDisabled("preview-3d",!project?.objects?.length);
  setDisabled("delete-selected",!has);setDisabled("duplicate-selected",!has);setDisabled("center-selected",!has);setDisabled("restore-deleted",!deletedStack.length);
  ["video-play","video-pause","video-back5","video-forward5"].forEach(a=>setDisabled(a,!activeVideo));["reset-media-transform","remove-media"].forEach(a=>setDisabled(a,!selected()?.assetId));setDisabled("apply-custom-shape",selected()?.type!=="irregular");const _aa=project?.assets?.find(x=>x.id===selected()?.assetId);setDisabled("open-naked3d-preview",!_aa?.type?.startsWith("video/"))
}
function setDisabled(action,disabled){qa(`[data-action="${action}"]`).forEach(b=>b.disabled=disabled)}
function selectPanel(name){
  qa(".rail-btn").forEach(b=>b.classList.toggle("active",b.dataset.panel===name));
  qa(".side-panel").forEach(p=>p.classList.toggle("active",p.dataset.panelContent===name))
}
function fitStage(){
  const vp=q("stageViewport").getBoundingClientRect();const z=Math.min((vp.width-30)/1000,(vp.height-30)/650,1.35);stageZoom=clamp(z,.35,1.35);applyStageZoom()
}
function applyStageZoom(){q("stageWorld").style.transform=`translate(-50%,-50%) scale(${stageZoom})`;renderStatus()}
function toggleGrid(){project.ui.grid=!project.ui.grid;q("gridLayer").style.display=project.ui.grid?"block":"none";markDirty()}
function toggleSnap(){project.ui.snap=!project.ui.snap;toast(`吸附：${project.ui.snap?"開":"關"}`);markDirty()}
function toggleDock(){dockCollapsed=!dockCollapsed;q("bottomDock").classList.toggle("collapsed",dockCollapsed)}

function syncTimeline(){
  if(!activeVideo||!Number.isFinite(activeVideo.duration)){q("timeCurrent").textContent="00:00";q("timeDuration").textContent="00:00";q("videoTimeline").value=0;return}
  q("videoTimeline").max=activeVideo.duration;q("videoTimeline").value=activeVideo.currentTime;q("timeCurrent").textContent=fmt(activeVideo.currentTime);q("timeDuration").textContent=fmt(activeVideo.duration);
  q("videoVolume").value=activeVideo.volume;q("videoLoop").checked=activeVideo.loop
}
function fmt(sec){sec=Math.max(0,Number(sec)||0);const m=Math.floor(sec/60),s=Math.floor(sec%60);return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
function videoPlay(){activeVideo?.play().catch(e=>toast("影片播放失敗："+e.message,"error"))}
function videoPause(){activeVideo?.pause()}
function openAI(){syncAIContext();q("aiDrawer").classList.remove("hidden")}
function closeAI(){q("aiDrawer").classList.add("hidden")}
function syncAIContext(){
  if(!q("aiContext"))return;const o=selected();q("aiContext").textContent=project?`目前專案：${project.name}｜設備 ${project.objects.length}｜${o?`已選取 ${o.name}`:"未選取設備"}`:"尚未進入專案";
  const rec=[];if(project&&!project.scene.assetId)rec.push("上傳實景");if(project&&!project.objects.length)rec.push("新增一境光幕屏");if(selected())rec.push("設備置中","3D 預覽");
  q("aiSuggestions").innerHTML=rec.map(x=>`<button class="suggestion">${x}</button>`).join("");qa(".suggestion").forEach(b=>b.onclick=()=>{q("aiInput").value=b.textContent})
}
async function executeAI(){
  const text=q("aiInput").value.trim();if(!text)return;
  if(/一境/.test(text)){addDevice("single")}
  else if(/三境/.test(text)){addDevice("triple")}
  else if(/精神堡壘/.test(text)){addDevice("tower")}
  else if(/異形/.test(text)){addDevice("irregular")}
  else if(/曲面/.test(text)){addDevice("curve")}
  else if(/ㄇ|U型|U 型/.test(text)){addDevice("ushape")}
  else if(/新增|建立/.test(text)&&/LED|螢幕|屏/.test(text)){addDevice("standard")}
  else if(/置中/.test(text)){centerSelected()}
  else if(/刪除.*設備|刪除.*LED/.test(text)){toast("刪除屬高風險動作，請使用紅色「刪除設備」按鈕確認。")}
  else if(/3D|三維/.test(text)){open3D()}
  else if(/儲存/.test(text)){persistCurrent();toast("專案已儲存","success")}
  else{toast("目前無法理解這個指令，請改用：新增一境、三境、精神堡壘、置中、3D、儲存。")}
  syncAIContext()
}

async function open3D(){
  if(!project?.objects?.length)return;
  q("previewModal").classList.remove("hidden");q("preview3dState").textContent="正在載入 3D 引擎…";
  try{
    const THREE=await import("https://cdn.jsdelivr.net/npm/three@0.169.0/+esm");
    const {OrbitControls}=await import("https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js/+esm");
    const host=q("preview3dHost");host.innerHTML="";
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x070a0e);
    const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,3.2,8);
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff,1.6));
    const group=new THREE.Group();scene.add(group);
    project.objects.forEach((o,i)=>{
      const w=Math.max(.5,o.w/1000),h=Math.max(.5,o.h/1000),mat=new THREE.MeshStandardMaterial({color:0x25384d,metalness:.2,roughness:.55});
      let mesh;
      if(["triple","ushape","tower"].includes(o.type)){
        const g=new THREE.Group(),fw=w/3;
        const front=new THREE.Mesh(new THREE.BoxGeometry(fw,h,.12),mat);front.position.set(0,0,0);
        const left=new THREE.Mesh(new THREE.BoxGeometry(.12,h,fw),mat);left.position.set(-fw/2,0,fw/2);
        const right=new THREE.Mesh(new THREE.BoxGeometry(.12,h,fw),mat);right.position.set(fw/2,0,fw/2);
        g.add(front,left,right);mesh=g
      }else if(o.type==="curve"){
        mesh=new THREE.Mesh(new THREE.CylinderGeometry(w/2,w/2,h,32,1,true,Math.PI*.76,Math.PI*1.48),mat)
      }else if(o.type==="cylinder"){
        mesh=new THREE.Mesh(new THREE.CylinderGeometry(w/2,w/2,h,32,1,true),mat)
      }else{
        mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,.12),mat)
      }
      mesh.position.set((i-project.objects.length/2)*1.2,0,0);mesh.rotation.y=(o.rotation||0)*Math.PI/180;group.add(mesh)
    });
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
    function resize(){const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
    resize();window.addEventListener("resize",resize,{once:true});
    let running=true;threeCtx={stop:()=>{running=false;renderer.dispose()}};
    (function loop(){if(!running)return;controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)})();
    q("preview3dState").textContent="滑鼠拖曳旋轉｜滾輪縮放";
  }catch(e){q("preview3dState").textContent="3D 引擎載入失敗；2D 編輯功能不受影響。";log("3D載入失敗："+e.message,"error")}
}
function close3D(){threeCtx?.stop?.();threeCtx=null;q("previewModal").classList.add("hidden")}

function openIntro(){q("introModal").classList.remove("hidden")}
function closeIntro(){q("introModal").classList.add("hidden")}

function registerActions(){
  Object.assign(ACTIONS,{
    "system-intro":openIntro,"new-project":openProjectModal,"open-last-project":()=>projects[0]?openProject(projects.sort((a,b)=>b.updatedAt-a.updatedAt)[0].id):openProjectModal(),
    "clear-projects":()=>{if(confirm("確定清除所有本機專案資料？")){projects=[];saveProjects();renderRecentProjects()}},
    "back-dashboard":()=>{if(dirty&&confirm("專案尚未儲存，要先儲存嗎？"))persistCurrent();showDashboard()},
    "undo":undo,"redo":redo,"fit-stage":fitStage,"toggle-grid":toggleGrid,"toggle-snap":toggleSnap,"preview-3d":open3D,"save-project":()=>{persistCurrent();toast("專案已儲存","success")},
    "open-ai":openAI,"close-ai":closeAI,"delete-scene":deleteScene,"scene-fit":()=>{project.scene.scale=1;project.scene.rotation=0;renderSceneControls();markDirty()},
    "duplicate-selected":duplicateSelected,"delete-selected":deleteSelected,"restore-deleted":restoreDeleted,"center-selected":centerSelected,"focus-inspector":()=>q("inspector").scrollIntoView({behavior:"smooth"}),
    "trigger-scene-upload":()=>q("sceneFile").click(),"toggle-dock":toggleDock,"video-play":videoPlay,"video-pause":videoPause,
    "ai-execute":executeAI,"video-back5":()=>seekVideo(-5),"video-forward5":()=>seekVideo(5),"reset-media-transform":resetMediaTransform,"remove-media":removeMedia,"apply-custom-shape":applyCustomShape,"open-naked3d-preview":buildNaked3DPreview,"close-naked3d":closeNaked3D,"reset-naked3d":resetNaked3D,"naked3d-play-pause":naked3dPlayPause,"naked3d-fit":()=>{const o=selected();if(o){o.n3dScale=100;updateNaked3DInspector();applyNaked3DPreview()}},"close-3d":close3D,"close-intro":closeIntro,"close-project-modal":closeProjectModal
  });
}
function wireActions(){
  qa("[data-action]").forEach(el=>{
    const name=el.dataset.action,fn=ACTIONS[name];
    if(!fn){el.disabled=true;el.title=`尚未提供 Action：${name}`;return}
    el.addEventListener("click",e=>{try{fn(e)}catch(err){handleRuntimeError(err,`Action ${name}`)}})
  });
  qa("[data-create-device]").forEach(el=>el.addEventListener("click",()=>{try{addDevice(el.dataset.createDevice)}catch(e){handleRuntimeError(e,"新增設備")}}));
  qa(".rail-btn").forEach(el=>el.onclick=()=>selectPanel(el.dataset.panel));
  qa("[data-panel-jump]").forEach(el=>el.onclick=()=>selectPanel(el.dataset.panelJump));
  qa(".dock-tab").forEach(el=>el.onclick=()=>{qa(".dock-tab").forEach(x=>x.classList.toggle("active",x===el));qa(".dock-content").forEach(x=>x.classList.toggle("active",x.dataset.dockContent===el.dataset.dock))});
}
function runtimeButtonAudit(){
  const all=qa("[data-action]"),missing=all.filter(x=>!ACTIONS[x.dataset.action]).map(x=>x.dataset.action);
  return {total:all.length,missing:[...new Set(missing)],pass:missing.length===0}
}
function handleRuntimeError(err,context="Runtime"){
  console.error(context,err);log(`${context}：${err.message}`,"error");toast(`${context} 發生錯誤：${err.message}`,"error")
}


function bindSelfTestUI(){
  q("closeSelfTest").onclick=()=>q("selfTestModal").classList.add("hidden");
  q("returnHomeFromTest").onclick=()=>{q("selfTestModal").classList.add("hidden");showDashboard()};
  q("rerunSelfTest").onclick=()=>selfTest();
}

function bindStaticUI(){
  q("projectForm").addEventListener("submit",newProjectFromForm);
  q("sceneFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(f)handleSceneFile(f);e.target.value=""});
  q("mediaFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(f)handleMediaFile(f);e.target.value=""});
  q("sceneRotation").addEventListener("input",()=>{project.scene.rotation=Number(q("sceneRotation").value);applySceneTransform();markDirty()});
  q("sceneScale").addEventListener("input",()=>{project.scene.scale=Number(q("sceneScale").value)/100;applySceneTransform();markDirty()});
  q("stageWorld").addEventListener("pointerdown",e=>{if(e.target===q("stageWorld")||e.target===q("gridLayer")||e.target===q("deviceLayer")){selectedId=null;renderAll()}});
  q("videoTimeline").addEventListener("input",()=>{if(activeVideo)activeVideo.currentTime=Number(q("videoTimeline").value)});
  q("videoVolume").addEventListener("input",()=>{if(activeVideo)activeVideo.volume=Number(q("videoVolume").value)});
  q("videoLoop").addEventListener("change",()=>{if(activeVideo)activeVideo.loop=q("videoLoop").checked});
  bindInspector();bindMediaInspector();bindNaked3DControls();
  window.addEventListener("resize",fitStage);
  document.addEventListener("keydown",e=>{
    const tag=e.target.tagName?.toLowerCase();if(["input","textarea","select"].includes(tag))return;
    const mod=e.ctrlKey||e.metaKey;
    if(mod&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?redo():undo()}
    if(mod&&e.key.toLowerCase()==="s"){e.preventDefault();persistCurrent();toast("專案已儲存","success")}
    if(e.key==="Delete")deleteSelected();
    if(e.key==="Escape"){closeAI();close3D();closeIntro();closeProjectModal()}
  });
}

async function selfTest(){
  const results=[],check=(name,ok,detail="")=>results.push({name,ok:!!ok,detail});
  const savedProject=project,savedProjects=projects,savedSelected=selectedId,savedHistory=history,savedFuture=future,savedDeleted=deletedStack;
  try{
    const p=createProject("Self Test","");
    check("createProject",p.objects.length===0&&p.scene);
    project=p;projects=[p];selectedId=null;history=[];future=[];deletedStack=[];
    addDevice("single");check("addDevice",project.objects.length===1);
    check("selectDevice",!!selected());
    centerSelected();check("centerSelected",selected().x>=0&&selected().y>=0);
    duplicateSelected();check("duplicateSelected",project.objects.length===2);
    const before=project.objects.length;deleteSelectedNoConfirmForTest();check("deleteSelected",project.objects.length===before-1);
    restoreDeleted();check("restoreDeleted",project.objects.length===before);
    check("runtimeButtonAudit",runtimeButtonAudit().pass,JSON.stringify(runtimeButtonAudit()));
    check("projectValidation",validateProject(project).ok);
  }catch(e){check("selfTestRuntime",false,e.message)}
  finally{
    project=savedProject;projects=savedProjects;selectedId=savedSelected;history=savedHistory;future=savedFuture;deletedStack=savedDeleted;
  }
  const pass=results.filter(x=>x.ok).length,box=q("selfTestResults");
  box.innerHTML=`<div style="font-family:ui-monospace,monospace"><h3 style="margin-top:0">測試結果 ${pass}/${results.length}</h3>${results.map(x=>`<p style="margin:6px 0">${x.ok?"✅":"❌"} ${escapeHTML(x.name)} ${escapeHTML(x.detail||"")}</p>`).join("")}</div>`;
  q("selfTestModal").classList.remove("hidden");
  window.__XINYU_SELF_TEST__={pass,total:results.length,results};
  return window.__XINYU_SELF_TEST__;
}
function deleteSelectedNoConfirmForTest(){const o=selected();if(!o)return;deletedStack.push(deepClone(o));project.objects=project.objects.filter(x=>x.id!==o.id);selectedId=null}

async function boot(){
  try{
    setBoot("讀取專案資料");loadProjects();
    setBoot("註冊操作");registerActions();wireActions();bindStaticUI();bindSelfTestUI();
    const audit=runtimeButtonAudit();if(!audit.pass)throw new Error("可見按鈕缺少 Action："+audit.missing.join(","));
    setBoot("啟動工作環境");
    if(new URLSearchParams(location.search).get("selftest")==="1"){
      history.replaceState(null,"",location.pathname+location.hash);
      setTimeout(()=>selfTest(),350);
    }
    renderRecentProjects();window.__XINYU_BOOT_OK__=true;setTimeout(()=>q("bootOverlay").classList.add("hidden"),250);
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    log(`V21.0.4 啟動完成｜可見 Action ${audit.total}/${audit.total}`);
  }catch(e){
    q("bootStatus").textContent="啟動失敗："+e.message;q("bootStatus").style.color="#ff8d94";console.error(e)
  }
}
window.addEventListener("error",e=>handleRuntimeError(e.error||new Error(e.message),"Global"));
window.addEventListener("unhandledrejection",e=>handleRuntimeError(e.reason instanceof Error?e.reason:new Error(String(e.reason)),"Promise"));
boot();
