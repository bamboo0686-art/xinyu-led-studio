export const DEVICE_PRESETS={
  standard:{name:"一般 LED",w:3000,h:1800,type:"standard",pitch:"P2.604"},
  single:{name:"一境光幕屏",w:1000,h:2000,type:"single",pitch:"P2.604"},
  triple:{name:"三境光幕屏",w:3000,h:2000,type:"triple",pitch:"P2.604"},
  tower:{name:"三面 LED 精神堡壘",w:3000,h:4000,type:"tower",pitch:"P2.604"},
  lshape:{name:"L 型屏",w:2800,h:1900,type:"lshape",pitch:"P2.604"},
  curve:{name:"曲面屏",w:3200,h:1800,type:"curve",pitch:"P2.604"},
  ushape:{name:"ㄇ字型屏",w:3000,h:2000,type:"ushape",pitch:"P2.604"},
  cylinder:{name:"圓柱屏",w:1800,h:2400,type:"cylinder",pitch:"P2.604"}
};
export const uid=(p="ID")=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
export function createProject(name="未命名專案",client=""){
  return {id:uid("PRJ"),name,client,createdAt:Date.now(),updatedAt:Date.now(),
    scene:{assetId:null,rotation:0,scale:1},objects:[],assets:[],ui:{grid:true,snap:true,zoom:1}};
}
export function createDevice(kind="standard",x=350,y=220){
  const p=DEVICE_PRESETS[kind]||DEVICE_PRESETS.standard;
  return {id:uid("DEV"),name:p.name,type:p.type,w:p.w,h:p.h,x,y,rotation:0,pitch:p.pitch,brightness:100,assetId:null};
}
export function deepClone(v){return JSON.parse(JSON.stringify(v))}
export function pushHistory(history,state,max=60){history.push(deepClone(state));while(history.length>max)history.shift()}
export function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
export function objectToScreen(o,scale=0.12){return {left:o.x,top:o.y,width:Math.max(55,o.w*scale),height:Math.max(45,o.h*scale)}}
export function screenToReal(px,scale=0.12){return Math.round(px/scale)}
export function moveDevice(o,dx,dy,snap=false,grid=10){o.x+=dx;o.y+=dy;if(snap){o.x=Math.round(o.x/grid)*grid;o.y=Math.round(o.y/grid)*grid}return o}
export function resizeDevice(o,widthPx,heightPx,scale=0.12){o.w=Math.max(100,screenToReal(widthPx,scale));o.h=Math.max(100,screenToReal(heightPx,scale));return o}
export function rotateDevice(o,deg){o.rotation=((deg%360)+360)%360;return o}
export function validateProject(p){
 const errors=[];
 if(!p||typeof p!=="object")errors.push("project_not_object");
 if(!Array.isArray(p?.objects))errors.push("objects_not_array");
 if(!Array.isArray(p?.assets))errors.push("assets_not_array");
 if(!p?.scene)errors.push("scene_missing");
 return {ok:errors.length===0,errors};
}
export function nextStep(p,selectedId=null){
 if(!p.scene?.assetId)return {panel:"scene",label:"上傳實景",reason:"先建立現場背景"};
 if(!p.objects.length)return {panel:"devices",label:"建立 LED",reason:"場景目前沒有設備"};
 if(!selectedId)return {panel:"layers",label:"選取設備",reason:"選取設備後才能調整"};
 const o=p.objects.find(x=>x.id===selectedId);
 if(o&&!o.assetId)return {panel:"media",label:"套用素材",reason:"設備尚未有圖片或影片"};
 return {panel:"preview",label:"3D 預覽",reason:"主要視覺流程已完成"};
}
