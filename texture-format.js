const pngAssets=new Set([
  'fashion-accessories-atlas-v1',
  'fashion-garments-atlas-v1',
  'student-mirror-reflection-v1',
  'tea-pearl-seal-uv-v1'
]);

let supportsWebP=false;
try{
  const canvas=document.createElement('canvas');
  supportsWebP=canvas.toDataURL('image/webp').startsWith('data:image/webp');
}catch{}

export function texturePath(url){
  if(supportsWebP||!url.startsWith('./textures/fast/'))return url;
  const relative=url.slice('./textures/fast/'.length).replace(/\.webp(?=([?#]|$))/i,'');
  const filename=relative.split('/').pop();
  return './textures/'+relative+(pngAssets.has(filename)?'.png':'.jpg');
}
