import * as T from './vendor/three.module.js';

export const mobileTextures=matchMedia('(max-width:680px), (pointer:coarse)').matches;
export const textureMode=new URLSearchParams(location.search).get('textures')==='desktop'?'desktop':'mobile';
const pngAssets=new Set(['fashion-accessories-atlas-v1','fashion-garments-atlas-v1','student-mirror-reflection-v1','tea-pearl-seal-uv-v1']);
const entries=new Map(),queue=[];
let disposed=false;
let active=0,paused=mobileTextures&&Boolean(window.sceneBoot?.deferTextures);
const later=callback=>Promise.resolve().then(callback);

// Export support does not tell us whether a browser can decode WebP.
// Try the actual image, then its JPEG/PNG counterpart if decoding fails.
export function texturePath(url){return textureMode==='desktop'?url.replace('/textures/mobile/','/textures/fast/'):mobileTextures?url.replace('/textures/fast/','/textures/mobile/'):url;}

function fallbackURL(url){
  const next=new URL(url,document.baseURI);
  if(next.pathname.includes('/textures/mobile/'))return next.href.replace('/textures/mobile/','/textures/fast/');
  if(!next.pathname.includes('/textures/fast/')||!next.pathname.endsWith('.webp'))return null;
  const name=next.pathname.split('/').pop().replace(/\.webp$/,'');
  next.pathname=next.pathname.replace('/textures/fast/','/textures/').replace(/\.webp$/,pngAssets.has(name)?'.png':'.jpg');
  return next.href;
}

function publish(){if(disposed)return;window.dispatchEvent(new CustomEvent('scene-textures',{detail:textureStatus()}));}
function assetLabel(url){
  const name=url.split('/').pop().split('?')[0];
  const names=[['bookcase','书架照片'],['drink-labels','饮料包装'],['products-atlas','商品包装'],['garments','服装'],['fascia','店铺招牌'],['tea-','奶茶杯'],['newsstand','报刊'],['screens','电脑画面'],['tv-stills','电视画面'],['bakery','面包'],['fashion','服饰商品'],['Plaster','墙面'],['Tiles','瓷砖'],['Wood','木纹'],['Fabric','布料'],['Asphalt','路面'],['Paving','人行道'],['Metal','金属'],['Roof','屋顶']];
  return names.find(([key])=>name.includes(key))?.[1]||'店铺素材';
}
export function textureStatus(){
  const list=[...entries.values()];
  return {mode:textureMode,total:list.length,ready:list.filter(e=>e.status==='ready').length,pending:list.filter(e=>e.status==='pending'||e.status==='queued').length,
    failed:list.filter(e=>e.status==='failed').map(e=>e.url),fallbacks:list.filter(e=>e.usedFallback).length,
    current:list.filter(e=>e.status==='pending').map(e=>({name:assetLabel(e.url),file:e.url.split('/').pop(),stage:e.stage,bytes:e.bytes||0,totalBytes:e.totalBytes||0,seconds:Math.floor((Date.now()-e.started)/1000)})),
    failures:list.filter(e=>e.status==='failed').map(e=>({name:assetLabel(e.url),file:e.url.split('/').pop(),reason:e.errorKind,message:e.error})),
    decodedBytes:list.reduce((sum,e)=>sum+(e.status==='ready'?e.canvas.width*e.canvas.height*4:0),0)};
}
window.sceneTextureDiagnostics=()=>({time:new Date().toISOString(),textures:textureStatus(),boot:window.sceneBoot?.state,scene:window.sceneQA?{contextLost:window.sceneQA().contextLost,drawCalls:window.sceneQA().drawCalls}:null});
function textureError(kind,message){const error=new Error(message);error.kind=kind;return error;}

// Download bytes separately from image decoding: the UI can distinguish a stalled
// connection, invalid image, and canvas processing instead of one silent wait.
function imageAttempt(url,entry){
  return new Promise((resolve,reject)=>{
    const controller=new AbortController();let image,blobURL,timer,finished=false;
    const finish=(error)=>{if(finished)return;finished=true;clearTimeout(timer);entry.cancelAttempt=null;if(image)image.onload=image.onerror=null;if(blobURL)URL.revokeObjectURL(blobURL);if(error){controller.abort();if(image)image.src='';reject(error);}else resolve(image);};
    entry.cancelAttempt=()=>finish(textureError('cancelled','已重新开始下载'));
    timer=setTimeout(()=>finish(textureError('download-timeout','图片下载超过 15 秒')),15000);
    entry.stage='downloading';entry.started=Date.now();entry.bytes=0;entry.totalBytes=0;publish();
    (async()=>{
      try{
        const response=await fetch(url,{signal:controller.signal,credentials:'same-origin'});
        if(!response.ok)throw textureError(response.status===404?'not-found':'http','图片请求返回 '+response.status);
        entry.totalBytes=Number(response.headers.get('content-length'))||0;
        let blob;
        if(response.body?.getReader){
          const reader=response.body.getReader(),chunks=[];let lastNotice=0;
          while(true){const {done,value}=await reader.read();if(finished)return;if(done)break;chunks.push(value);entry.bytes+=value.byteLength;if(Date.now()-lastNotice>250){lastNotice=Date.now();publish();}}
          blob=new Blob(chunks,{type:response.headers.get('content-type')||'application/octet-stream'});
        }else{blob=await response.blob();entry.bytes=blob.size;}
        if(finished)return;
        if(!blob.size)throw textureError('empty','图片文件为空');
        clearTimeout(timer);entry.stage='decoding';publish();
        timer=setTimeout(()=>finish(textureError('decode-timeout','图片已下载，但浏览器处理超时')),6000);
        image=new Image();image.decoding='async';image.onload=()=>{if(!image.naturalWidth)finish(textureError('decode','图片没有有效尺寸'));else finish();};
        image.onerror=()=>finish(textureError('decode','图片已下载，但无法解析'));
        blobURL=URL.createObjectURL(blob);image.src=blobURL;
      }catch(error){if(!finished)finish(error.kind?error:textureError('network',error.message||'图片连接失败'));}
    })();
  });
}

async function decode(entry){
  const fallback=fallbackURL(entry.url);
  const alternatives=[entry.url,fallback,fallback&&fallbackURL(fallback)].filter((v,i,a)=>v&&a.indexOf(v)===i);
  let lastError;
  for(let i=0;i<alternatives.length;i++){
    let image;
    try{
      const attemptURL=new URL(alternatives[i]);if(entry.tries>1)attemptURL.searchParams.set("textureRetry",String(entry.tries));
      image=await imageAttempt(attemptURL.href,entry);
      entry.stage="applying";publish();
      const limit=mobileTextures?(entry.url.includes('/pbr/')?512:/atlas|fascia|bookcase/.test(entry.url)?1536:1024):2048;
      const scale=Math.min(1,limit/Math.max(image.naturalWidth,image.naturalHeight));
      entry.canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
      entry.canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=entry.canvas.getContext('2d');if(!context)throw textureError('canvas','手机未能分配图片画布');
      context.drawImage(image,0,0,entry.canvas.width,entry.canvas.height);
      entry.canvas.complete=true;entry.canvas.naturalWidth=entry.canvas.width;entry.canvas.naturalHeight=entry.canvas.height;
      entry.usedFallback=i>0;entry.status='ready';entry.stage='ready';entry.error=null;entry.errorKind=null;
      for(const texture of entry.textures)texture.needsUpdate=true;
      entry.canvas.dispatchEvent(new Event('load'));
      return;
    }catch(error){
      lastError=error;
      // A network timeout is not evidence of an unsupported image format. Do
      // not silently download two larger originals over that same connection.
      if(!['not-found','decode','decode-timeout'].includes(error.kind))break;
    }
    finally{if(image)image.src='';}
  }
  if(entry.retryRequested||disposed)return;
  entry.status='failed';entry.stage='failed';entry.error=String(lastError);entry.errorKind=lastError?.kind||'processing';
  entry.canvas.dispatchEvent(new Event('error'));
}

function pump(){
  if(paused||disposed)return;
  while(active<(mobileTextures?3:6)&&queue.length){
    const entry=queue.shift();entry.status='pending';entry.tries=(entry.tries||0)+1;active++;
    decode(entry).finally(()=>{active--;if(entry.retryRequested&&!disposed){entry.retryRequested=false;entry.status='queued';queue.push(entry);}publish();pump();});
  }
}

function entryFor(url){
  const key=new URL(texturePath(url),document.baseURI).href;
  if(entries.has(key))return entries.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
  canvas.complete=false;canvas.naturalWidth=canvas.naturalHeight=0;
  const entry={url:key,canvas,source:new T.Source(canvas),textures:new Set(),status:'queued',usedFallback:false};
  entries.set(key,entry);queue.push(entry);later(()=>{publish();pump();});
  return entry;
}

// Canvas artwork and Three.js maps share one decoded, bounded image.
export function loadTextureImage(url){return entryFor(url).canvas;}

class SharedTextureLoader extends T.TextureLoader {
  load(url,onLoad,onProgress,onError){
    const full=this.path?this.path+url:url;
    if(!/textures\/|blender_assets\//.test(full))return super.load(url,onLoad,onProgress,onError);
    const entry=entryFor(full),texture=new T.Texture();
    texture.source=entry.source;entry.textures.add(texture);
    if(mobileTextures){texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;}
    const loaded=()=>{texture.needsUpdate=true;if(onLoad)onLoad(texture);};
    if(entry.status==='ready')later(loaded);
    else entry.canvas.addEventListener('load',loaded,{once:true});
    if(onError)entry.canvas.addEventListener('error',onError,{once:true});
    return texture;
  }
}
export function createTextureLoader(manager){return new SharedTextureLoader(manager);}

export function startTextureLoading(){paused=false;pump();}

export function retryTextures(){
  for(const entry of entries.values()){
    if(entry.status==='failed'){entry.status='queued';queue.push(entry);}
    else if(entry.status==='pending'){entry.retryRequested=true;entry.cancelAttempt?.();}
  }
  publish();pump();
}

// Do not drain the old document's image queue while navigating to the other
// texture source. Safari can otherwise report spurious access errors on unload.
function stopTextureLoading(){disposed=true;paused=true;queue.length=0;for(const entry of entries.values())if(entry.status==='pending'){entry.cancelAttempt?.();entry.status='failed';}else if(entry.status==='queued')entry.status='failed';}
window.sceneStopTextureLoading=stopTextureLoading;
window.addEventListener('pagehide',stopTextureLoading);
window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;paused=false;setTimeout(retryTextures,0);}});
