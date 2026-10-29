import {texturePath,createTextureLoader} from './texture-format.js?v=102-shared-textures';
import * as T from './vendor/three.module.js';

// Shared low-poly archetype: the cone's built-in groups UV-map its side and top separately.
const cupGeometry=new T.CylinderGeometry(.103,.078,.35,36,1,false);
const strawGeometry=new T.CylinderGeometry(.006,.006,.23,8);
const lidGeometry=new T.CylinderGeometry(.116,.116,.014,36);
const bottomMaterial=new T.MeshStandardMaterial({color:'#b2a895',roughness:.88});
const lidEdgeMaterial=new T.MeshStandardMaterial({color:'#ece7d8',roughness:.42,transparent:true,opacity:.92});
const flavors=[
  {name:'珍珠奶茶',base:'#b98b60',dark:'#785738',top:'#dfc6a1',pearls:true},
  {name:'芋香奶茶',base:'#aa8caa',dark:'#776079',top:'#d8c0d3',pearls:true},
  {name:'草莓奶茶',base:'#d999a7',dark:'#b96d80',top:'#f0ccd0',pearls:false},
  {name:'柠檬绿茶',base:'#a5ae65',dark:'#718544',top:'#d9d79e',pearls:false}
];
function seeded(n){let s=n|0;return()=>((s=Math.imul(1664525,s)+1013904223|0)>>>0)/4294967296;}
function draftSideTexture(v){
  const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d'),r=seeded(725+v*89),f=flavors[v];
  const grad=g.createLinearGradient(0,0,0,512);grad.addColorStop(0,f.top);grad.addColorStop(.2,f.base);grad.addColorStop(.77,f.base);grad.addColorStop(1,f.dark);g.fillStyle=grad;g.fillRect(0,0,1024,512);
  for(let i=0;i<2700;i++){const x=r()*1024,y=r()*512,alpha=.018+r()*.055;g.fillStyle=r()>.5?`rgba(255,250,225,${alpha})`:`rgba(75,44,39,${alpha*.65})`;g.fillRect(x,y,1+r()*3,1+r()*5);}
  for(let i=0;i<100;i++){const x=r()*1024,y=r()*512,rr=2+r()*5;g.fillStyle='rgba(255,250,236,.24)';g.beginPath();g.arc(x,y,rr,0,Math.PI*2);g.fill();}
  if(f.pearls)for(let i=0;i<85;i++){const x=r()*1024,y=393+r()*109,rr=5+r()*7;g.fillStyle='#35252a';g.beginPath();g.arc(x,y,rr,0,Math.PI*2);g.fill();}
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;tex.wrapS=T.RepeatWrapping;return tex;
}
function draftTopTexture(v){
  const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d'),f=flavors[v],r=seeded(110+v);
  g.fillStyle=f.top;g.fillRect(0,0,512,512);
  for(let i=0;i<20;i++){g.fillStyle='rgba(255,255,241,.18)';g.beginPath();g.ellipse(r()*512,r()*512,11+r()*30,5+r()*18,r()*Math.PI,0,Math.PI*2);g.fill();}
  const shine=g.createRadialGradient(180,145,30,256,256,340);shine.addColorStop(0,'#ffffff55');shine.addColorStop(.7,'#ffffff09');shine.addColorStop(1,'#ffffff66');g.fillStyle=shine;g.fillRect(0,0,512,512);
  g.strokeStyle='#eff3e6bc';g.lineWidth=17;g.beginPath();g.arc(256,256,248,0,Math.PI*2);g.stroke();
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return tex;
}
const loader=createTextureLoader();
const pearlSide=loader.load(texturePath('./textures/fast/tea-pearl-side-uv-v1.webp'));pearlSide.colorSpace=T.SRGBColorSpace;pearlSide.anisotropy=8;pearlSide.wrapS=T.RepeatWrapping;
const pearlSeal=loader.load(texturePath('./textures/fast/tea-pearl-seal-uv-v1.webp'));pearlSeal.colorSpace=T.SRGBColorSpace;pearlSeal.anisotropy=8;
function brandSide(source,i){const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;tex.wrapS=T.RepeatWrapping;
  const draw=()=>{if(source.image?.width)g.drawImage(source.image,0,0,1024,512);else{g.fillStyle=flavors[i].base;g.fillRect(0,0,1024,512);}
    // The photographic old-style tea skin stays on the tapered body. The seal
    // above has no brand copy; two broad front/back prints replace tiny badges.
    for(const cx of [0,512,1024]){g.fillStyle='#f4e8c9ea';g.beginPath();g.roundRect(cx-194,100,388,244,28);g.fill();g.strokeStyle=flavors[i].dark;g.lineWidth=9;g.stroke();g.fillStyle=flavors[i].dark;g.textAlign='center';g.font='bold 106px "Songti SC",serif';g.fillText('七杯茶',cx,230);g.font='bold 29px serif';g.fillText('QI BEI CHA  ·  2005',cx,290);}
    tex.needsUpdate=true;};
  draw();if(source.image?.addEventListener)source.image.addEventListener('load',draw,{once:true});return tex;}
const looks=flavors.map((_,i)=>({
  side:new T.MeshStandardMaterial({map:brandSide(i===0?pearlSide:draftSideTexture(i),i),roughness:.71,metalness:0}),
  top:new T.MeshStandardMaterial({map:i===0?pearlSeal:draftTopTexture(i),roughness:.68,metalness:0,transparent:i===0,side:T.DoubleSide})
}));
const strawMaterials=[new T.MeshStandardMaterial({color:'#f3a0a6',roughness:.68}),new T.MeshStandardMaterial({color:'#c5d8dc',roughness:.68})];

export function createMilkTeaCup(flavor=0){
  const i=((flavor%flavors.length)+flavors.length)%flavors.length,g=new T.Group();
  g.name='七杯茶 · '+flavors[i].name;g.userData={productFamily:'sealed-milk-tea-cup',skin:i,sharedGeometry:true,prototypeTexture:i===0?'photographic-uv':'draft-uv'};
  const cup=new T.Mesh(cupGeometry,[looks[i].side,looks[i].top,bottomMaterial]);cup.position.y=.175;cup.castShadow=true;cup.receiveShadow=true;g.add(cup);
  const lid=new T.Mesh(lidGeometry,[lidEdgeMaterial,looks[i].top,bottomMaterial]);lid.position.y=.356;lid.castShadow=true;g.add(lid);
  const straw=new T.Mesh(strawGeometry,strawMaterials[i%2]);straw.position.set(i===0?.045:.022,.44,.01);straw.rotation.z=.1;straw.castShadow=true;g.add(straw);
  return g;
}
export const milkTeaFlavorNames=flavors.map(f=>f.name);
