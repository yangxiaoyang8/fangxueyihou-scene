import {texturePath} from './texture-format.js';
import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/addons/controls/OrbitControls.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {createDistrictKit} from './district-details.js?v=93-texture-format-fallback';
import {addPeriodPrints,addPhotographicGoods,shopSignTexture,applyAuthorizedPosters} from './shop-visuals.js?v=93-texture-format-fallback';
import {lightingAt} from './environment-cycle.js';
import {weatherSurface} from './weather-surfaces.js';
import {createSoundscape} from './soundscape.js';
import {EffectComposer} from './vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from './vendor/addons/environments/RoomEnvironment.js';

// Geometry and textures are built separately. Each store has independent
// front, roof, shell and furniture groups, so a cutaway cannot leave a lintel behind.
const canvas=document.querySelector('#scene');
const mobileDevice=matchMedia('(max-width:680px), (pointer:coarse)').matches;
const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobileDevice?1.25:1.75));
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();
const reflectionRoom=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(reflectionRoom,.035).texture;reflectionRoom.dispose();pmrem.dispose();
const camera=new T.PerspectiveCamera(39,1,.15,180);
const controls=new OrbitControls(camera,canvas);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new T.Vector2(640,480),.3,.55,1.0);composer.addPass(bloom);composer.addPass(new OutputPass());
controls.enableDamping=true;controls.dampingFactor=.08;controls.maxPolarAngle=1.48;
const world=new T.Group();scene.add(world);
const ambient=new T.HemisphereLight('#b9c4ef','#65516c',1.3);scene.add(ambient);
const sun=new T.DirectionalLight('#ffd5a4',3.2);sun.position.set(-15,24,12);sun.castShadow=true;
sun.shadow.mapSize.set(mobileDevice?1024:2048,mobileDevice?1024:2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.5,far:80});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;scene.add(sun);
const fill=new T.DirectionalLight('#9fb5ef',.7);fill.position.set(14,12,-8);scene.add(fill);
const state={season:'spring',time:58,weather:'clear',palette:'dream',lights:true,screens:true,street:true,store:null,floor:0,open:false};
const soundscape=createSoundscape();
const syncSoundscape=()=>soundscape.setScene({season:state.season,time:state.time,weather:state.weather,open:state.open,store:state.store,screens:state.screens});
const stores=new Map(),lamps=[],foliage=[],snowCaps=[],screens=[],pickables=[],litWindows=[],litSigns=[],weatherMaterials=[];
let seed=20503;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const boxGeo=new T.BoxGeometry(1,1,1),roundGeo=new RoundedBoxGeometry(1,1,1,1,.022),sphereGeo=new T.IcosahedronGeometry(1,1);
const materials=new Map();
function mat(color,rough=.8,metal=0){const key=color+rough+metal;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:rough,metalness:metal}));return materials.get(key);}
const iron=mat('#30383b',.55,.45),wood=mat('#735039'),cream=mat('#b8b09a'),brass=mat('#b79459',.4,.6);
function group(parent,x=0,y=0,z=0,angle=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=angle;parent.add(g);return g;}
function mesh(parent,geo,material,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,w,h,d,m,x=0,y=0,z=0){
  if(m.userData?.metersPerTile){
    const geo=new T.BoxGeometry(w,h,d),pos=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,s=m.userData.metersPerTile;
    for(let i=0;i<pos.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?pos.getZ(i):pos.getX(i))/s,(ny>.5?pos.getZ(i):pos.getY(i))/s);}
    return mesh(p,geo,m,x,y,z);
  }
  const o=mesh(p,w>.3&&h>.3&&d>.1?roundGeo:boxGeo,m,x,y,z);o.scale.set(w,h,d);return o;
}
function cyl(p,r,h,m,x=0,y=0,z=0,r2=r,n=12){return mesh(p,new T.CylinderGeometry(r,r2,h,n),m,x,y,z);}
function orb(p,r,m,x,y,z,sx=1,sy=1,sz=1){const o=mesh(p,sphereGeo,m,x,y,z);o.scale.set(r*sx,r*sy,r*sz);return o;}
function rod(p,a,b,r=.025,m=iron){const start=new T.Vector3(...a),end=new T.Vector3(...b),v=end.clone().sub(start);const o=cyl(p,r,v.length(),m,...start.clone().add(end).multiplyScalar(.5).toArray(),r,8);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
function cable(p,pts,r=.012,m=iron){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(a=>new T.Vector3(...a))),24,r,5,false),m);}
function texture(draw,size=512){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
function tiled(t,repeat=1){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);return t;}
const pbrLoader=new T.TextureLoader();
const fasciaTextures={
  fashion:pbrLoader.load(texturePath('./textures/fast/fashion-fascia-original-3to1-v3.webp')),
  bakery:pbrLoader.load(texturePath('./textures/fast/bakery-fascia-3to1-v1.webp')),
  shop:pbrLoader.load(texturePath('./textures/fast/hongxing-shop-fascia-3to1-v1.webp'))
};
for(const tex of Object.values(fasciaTextures)){tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;}
function pbrMap(asset,kind){const t=pbrLoader.load(texturePath('./textures/fast/pbr/'+asset+'_1K-JPG_'+kind+'.webp'));if(kind==='Color')t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return tiled(t,1);}
const plasterPBR={map:pbrMap('Plaster001','Color'),normalMap:pbrMap('Plaster001','NormalGL'),roughnessMap:pbrMap('Plaster001','Roughness')};
const woodPBR={map:pbrMap('WoodSiding006','Color'),normalMap:pbrMap('WoodSiding006','NormalGL'),roughnessMap:pbrMap('WoodSiding006','Roughness')};
const metalPBR={normalMap:pbrMap('Metal030','NormalGL'),roughnessMap:pbrMap('Metal030','Roughness')};
const clothPBR={normalMap:pbrMap('Fabric030','NormalGL'),roughnessMap:pbrMap('Fabric030','Roughness')};
const ceramic=new T.MeshStandardMaterial({map:pbrMap('Tiles036','Color'),normalMap:pbrMap('Tiles036','NormalGL'),roughnessMap:pbrMap('Tiles036','Roughness'),color:'#e1deca',roughness:.7,normalScale:new T.Vector2(.4,.4)});ceramic.userData.metersPerTile=1.8;
Object.assign(wood,woodPBR);wood.color.set('#c1a180');wood.userData.metersPerTile=2;
Object.assign(iron,metalPBR);iron.normalScale.set(.2,.2);iron.userData.metersPerTile=.8;
function fabric(color){const m=new T.MeshStandardMaterial({...clothPBR,color,roughness:1,normalScale:new T.Vector2(.35,.35)});m.userData.metersPerTile=.65;return m;}
const clothColors=new Map();function awningCloth(color){if(!clothColors.has(color))clothColors.set(color,fabric(color));return clothColors.get(color);}
function plaster(color){const tex=texture((c,s)=>{c.fillStyle=color;c.fillRect(0,0,s,s);for(let i=0;i<6500;i++){const v=rand();c.fillStyle=v>.55?'rgba(255,245,215,.07)':'rgba(30,26,24,.075)';c.fillRect(rand()*s,rand()*s,1+rand()*5,1+rand()*8);}for(let i=0;i<35;i++){const x=rand()*s,y=rand()*s;c.fillStyle='#a49a82';c.beginPath();for(let j=0;j<8;j++){const a=j/8*Math.PI*2,r=4+rand()*14;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();c.fill();}c.strokeStyle='rgba(52,45,37,.16)';c.lineWidth=1;for(let i=0;i<12;i++){let x=rand()*s,y=rand()*s;c.beginPath();c.moveTo(x,y);for(let j=0;j<6;j++){x+=rand()*12-6;y+=rand()*11;c.lineTo(x,y);}c.stroke();}},512);return new T.MeshStandardMaterial({...plasterPBR,color,roughness:.95,normalScale:new T.Vector2(.55,.55),bumpMap:tex,bumpScale:.018});}
const wornWood=texture((c,s)=>{c.fillStyle='#8b6242';c.fillRect(0,0,s,s);for(let i=0;i<800;i++){c.strokeStyle=i%2?'rgba(39,20,12,.12)':'rgba(255,225,171,.1)';const y=rand()*s;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(s*.3,y+rand()*12,s*.6,y-rand()*12,s,y);c.stroke();}for(let y=0;y<s;y+=64){c.fillStyle='#46372d';c.fillRect(0,y,s,2);}},512);
const timber=new T.MeshStandardMaterial({...woodPBR,color:'#ffebcf',roughness:.88,normalScale:new T.Vector2(.45,.45)});
const roadMap=tiled(texture((c,s)=>{c.fillStyle='#4c4b53';c.fillRect(0,0,s,s);for(let i=0;i<14000;i++){const q=rand();c.fillStyle=q>.5?'rgba(220,210,190,.12)':'rgba(15,18,27,.16)';c.fillRect(rand()*s,rand()*s,rand()*2+1,rand()*2+1);}c.strokeStyle='#282932';for(let i=0;i<6;i++){let x=rand()*s,y=rand()*s;c.beginPath();c.moveTo(x,y);for(let j=0;j<20;j++){x+=rand()*15-6;y+=rand()*12;c.lineTo(x,y);}c.stroke();}},1024),5);
const asphalt=new T.MeshStandardMaterial({map:pbrMap('Asphalt010','Color'),normalMap:pbrMap('Asphalt010','NormalGL'),roughnessMap:pbrMap('Asphalt010','Roughness'),roughness:.95,normalScale:new T.Vector2(.65,.65)});
for(const t of [asphalt.map,asphalt.normalMap,asphalt.roughnessMap])t.repeat.set(.25,.25);
timber.userData.metersPerTile=2;
const tileMap=new T.TextureLoader().load(texturePath('./textures/fast/terrazzo_floor.webp'));tileMap.colorSpace=T.SRGBColorSpace;tileMap.anisotropy=8;
const floorMat=new T.MeshStandardMaterial({map:tileMap,roughness:.65,bumpMap:tileMap,bumpScale:.008});floorMat.userData.metersPerTile=2;tiled(tileMap);
const pavement=plaster('#b0a58f');
pavement.userData.metersPerTile=2;
weatherMaterials.push(weatherSurface(asphalt,.42),weatherSurface(pavement,.9));
const brickFinish=new T.MeshStandardMaterial({map:pbrMap('Bricks051','Color'),normalMap:pbrMap('Bricks051','NormalGL'),roughnessMap:pbrMap('Bricks051','Roughness'),roughness:.92,normalScale:new T.Vector2(.7,.7)});brickFinish.userData.metersPerTile=2;
const covers=Array.from({length:16},()=>new T.MeshStandardMaterial({color:'#b9a98b',roughness:.8,side:T.DoubleSide}));
new T.TextureLoader().load(texturePath('./textures/fast/rental-books-atlas-v1.webp'),atlas=>{covers.forEach((material,i)=>{const tile=atlas.clone();tile.colorSpace=T.SRGBColorSpace;tile.repeat.set(.244,.244);tile.offset.set((i%4)*.25+.003,(3-Math.floor(i/4))*.25+.003);tile.anisotropy=8;tile.needsUpdate=true;material.map=tile;material.color.set('#ffffff');material.needsUpdate=true;});});
const bookPalette=['#975f50','#536a74','#987c57','#7b586d','#6b806f','#a86458','#59647b','#a28562'];
const bookNames=['青春漫记','校园物语','少年侦探','旧城来信','武侠故事','仲夏日记','漫画精选','星空旅人','街角书屋','放学以后','奇妙旅程','年少时光','午夜电台','橘色黄昏','春日书简','纸上冒险'];
const paperEdgeMap=texture((c,s)=>{c.fillStyle='#ddd1b7';c.fillRect(0,0,s,s);for(let y=0;y<s;y+=3){c.fillStyle=y%9?'#f7f0da8b':'#9d8d7059';c.fillRect(0,y,s,1);}},256);
const paperEdge=new T.MeshStandardMaterial({map:paperEdgeMap,roughness:1});
function bookPrintedFace(i,spine=false){const c=document.createElement('canvas');c.width=spine?128:384;c.height=512;const q=c.getContext('2d'),bg=bookPalette[i%8];q.fillStyle=bg;q.fillRect(0,0,c.width,c.height);q.fillStyle='#efdcb1';q.fillRect(9,12,c.width-18,16);q.fillRect(9,480,c.width-18,12);q.fillStyle='#f2e9d9';q.textAlign='center';q.font=spine?'bold 33px "Songti SC",serif':'bold 42px "Songti SC",serif';if(spine){[...bookNames[i]].slice(0,5).forEach((ch,n)=>q.fillText(ch,64,95+n*67));q.fillStyle='#c9b48f';q.fillRect(18,442,92,11);}else{q.fillText(bookNames[i],192,80,350);q.font='21px "Songti SC",serif';q.fillText('出租 · 旧书交换',192,122);q.fillStyle='#e4d6c6';q.fillRect(34,170,316,222);q.fillStyle='#8f7e65';for(let n=0;n<9;n++)q.fillRect(51,191+n*21,265-(n%3)*30,4);for(let n=0;n<28;n++){q.fillStyle='#332d29';q.fillRect(240+n*3,425,n%4===0?3:1,36);}}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return new T.MeshStandardMaterial({map:t,roughness:.87});}
const bookSpines=bookNames.map((_,i)=>bookPrintedFace(i,true)),bookBacks=bookNames.map((_,i)=>bookPrintedFace(i));
function label(p,text,w,h,bg='#d5b568',fg='#4c3022',size=70){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);for(let i=0;i<1400;i++){ctx.fillStyle=i%2?'#ffffff0c':'#0000000b';ctx.fillRect(rand()*1024,rand()*256,rand()*5+1,rand()*4+1);}ctx.strokeStyle=fg+'66';ctx.lineWidth=5;ctx.strokeRect(12,12,1000,232);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fg;ctx.font='bold '+size+'px "Songti SC", "SimSun", serif';ctx.fillText(text,512,128,970);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const m=mesh(p,new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:t,roughness:.75,emissive:'#fff5dc',emissiveMap:t,emissiveIntensity:0,side:T.DoubleSide}));return m;}
function book(p,x,y,z,i,face=false){const h=.25+rand()*.12,w=face?.25:.055+rand()*.026,d=face?.032:.2,g=group(p,x,y,z);const materials=face?[bookSpines[i%16],bookSpines[i%16],paperEdge,paperEdge,covers[i%16],bookBacks[i%16]]:[covers[i%16],bookBacks[i%16],paperEdge,paperEdge,bookSpines[i%16],bookSpines[i%16]];box(g,w,h,d,materials,0,h/2,0);return g;}
let bookcasePhoto=null;const bookcaseRows=[];
function setBookcaseRow(material,row){if(!bookcasePhoto)return;const crop=bookcasePhoto.clone();crop.colorSpace=T.SRGBColorSpace;crop.repeat.set(1,1/6);crop.offset.y=row/6;crop.anisotropy=8;crop.needsUpdate=true;material.map=crop;material.color.set('#ffffff');material.needsUpdate=true;}
new T.TextureLoader().load(texturePath('./textures/fast/rental-bookcase-face-v1.webp'),loaded=>{bookcasePhoto=loaded;for(const [material,row] of bookcaseRows)setBookcaseRow(material,row);});
function bookshelf(p,width=2.2,photo=false){const g=group(p);box(g,width,2.35,.12,timber,0,1.2,-.19);for(const x of [-width/2,width/2])box(g,.08,2.45,.44,timber,x,1.22,0);for(let row=0;row<5;row++){const y=.16+row*.46;box(g,width,.055,.48,timber,0,y,0);if(photo){const backdrop=new T.MeshStandardMaterial({color:'#b9a98b',roughness:.9});bookcaseRows.push([backdrop,row]);setBookcaseRow(backdrop,row);mesh(g,new T.PlaneGeometry(width-.13,.37),backdrop,0,y+.24,.105).castShadow=false;}else{let x=-width/2+.1;let i=0;while(x<width/2-.16){const face=i%4===0;book(g,x,y+.03,.03,(row*5+i)%16,face);x+=face?.3:.105;i++;}}}box(g,width+.1,.1,.5,timber,0,2.43,0);return g;}
function stool(p,x,z,color='#ba5139',y=0){const g=group(p,x,y,z);box(g,.38,.08,.36,mat(color),0,.46,0);for(const dx of [-.13,.13])for(const dz of [-.12,.12]){rod(g,[dx,.44,dz],[dx*1.25,.02,dz*1.25],.035,mat(color));}box(g,.32,.04,.04,mat(color),0,.2,.15);box(g,.32,.04,.04,mat(color),0,.2,-.15);return g;}
function chair(p,x,z,angle=0){const g=group(p,x,0,z,angle);box(g,.47,.09,.45,mat('#495d69'),0,.49,0);for(const a of [-.18,.18])for(const b of [-.17,.17])rod(g,[a,.02,b],[a,.49,b],.024,iron);box(g,.45,.48,.075,mat('#465a64'),0,.84,.19);rod(g,[-.18,.48,.2],[-.18,1.03,.2],.025);rod(g,[.18,.48,.2],[.18,1.03,.2],.025);return g;}
function table(p,x,z,w=1.5,d=.7,h=.8){const g=group(p,x,0,z);box(g,w,.075,d,timber,0,h,0);for(const a of [-w/2+.1,w/2-.1])for(const b of [-d/2+.1,d/2-.1])box(g,.065,h,.065,iron,a,h/2,b);return g;}
const glowMap=texture((c,s)=>{const a=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);a.addColorStop(0,'#fff8de');a.addColorStop(.15,'#ffcd8999');a.addColorStop(1,'#ffb54a00');c.fillStyle=a;c.fillRect(0,0,s,s);},128);
const leafMap=texture((c,s)=>{c.clearRect(0,0,s,s);const grad=c.createLinearGradient(s*.2,0,s*.8,s);grad.addColorStop(0,'#7e8981');grad.addColorStop(.48,'#e5e8c9');grad.addColorStop(1,'#717e6c');c.fillStyle=grad;c.beginPath();c.moveTo(s*.5,s*.05);c.bezierCurveTo(s*.98,s*.31,s*.82,s*.72,s*.5,s*.94);c.bezierCurveTo(s*.18,s*.72,s*.02,s*.31,s*.5,s*.05);c.fill();c.strokeStyle='#c6d0ae';c.lineWidth=1.4;c.beginPath();c.moveTo(s*.5,s*.1);c.lineTo(s*.5,s*.95);c.stroke();for(let i=0;i<9;i++)for(const side of [-1,1]){const y=s*(.22+i*.065);c.strokeStyle='#a5b296';c.lineWidth=.7;c.beginPath();c.moveTo(s*.5,y+s*.09);c.lineTo(s*(.5+side*(.25-Math.abs(i-3)*.02)),y);c.stroke();}},128);
const leafGeo=new T.PlaneGeometry(.24,.48,2,4);for(let i=0;i<leafGeo.attributes.position.count;i++){const pos=leafGeo.attributes.position;pos.setZ(i,.026*Math.cos(pos.getY(i)*8));}leafGeo.computeVertexNormals();
const leafMats=['#658153','#81915c','#4e7050'].map(color=>new T.MeshStandardMaterial({map:leafMap,color,side:T.DoubleSide,alphaTest:.48,roughness:.92}));
function detailedLeaf(p,x,y,z,i,scale=1){const leaf=mesh(p,leafGeo,leafMats[i%3],x,y,z);leaf.rotation.set(rand()*2.8,rand()*6.28,rand()*6.28);leaf.scale.setScalar(scale);return leaf;}
function fixture(p,x,y,z,color='#ffd39b',intensity=20,type='room'){const g=group(p,x,y,z);cyl(g,.19,.13,mat('#d4c6a2'),0,.08,0,.09);const bulb=orb(g,.075,new T.MeshBasicMaterial({color}),0,-.02,0);bulb.userData.dynamic=true;const light=new T.PointLight(color,intensity,10,1.6);light.position.y=-.12;g.add(light);const halo=new T.Sprite(new T.SpriteMaterial({map:glowMap,color,transparent:true,opacity:.4,depthWrite:false,blending:T.AdditiveBlending}));halo.scale.set(.7,.7,1);g.add(halo);lamps.push({light,bulb,halo,power:intensity,type});return g;}
function screen(p,x,y,z,w=.53,h=.39,tv=false){const c=document.createElement('canvas');c.width=320;c.height=240;const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const o=mesh(p,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex}),x,y,z);o.userData.dynamic=true;o.userData.screen=true;const item={mesh:o,canvas:c,texture:tex,page:tv?0:screens.length%4,tv};screens.push(item);return item;}
function crt(p,x,y,z,tv=false){
  const g=group(p,x,y,z),shell=mat(tv?'#51493c':'#c6c2b3',.62),bezel=mat('#555650',.45);
  mesh(g,new RoundedBoxGeometry(.72,.59,.58,2,.075),shell,0,.33,-.11);
  mesh(g,new RoundedBoxGeometry(.64,.47,.06,2,.035),bezel,0,.35,.198);
  const screenItem=screen(g,-.025,.36,.235,.52,.365,tv);screenItem.mesh.material.side=T.DoubleSide;
  box(g,.27,.11,.25,shell,0,.015,-.09);
  for(let row=0;row<3;row++)for(let i=0;i<6;i++)box(g,.008,.008,.13,mat('#68675f'),.361,.38-row*.08,-.29+i*.055);
  orb(g,.013,new T.MeshBasicMaterial({color:'#92dc74'}),.28,.13,.24);
  for(let i=0;i<2;i++)cyl(g,.027,.021,bezel,.23+i*.07,.12,.235,.027,12).rotation.x=Math.PI/2;
  box(g,.17,.035,.015,bezel,-.24,.105,.232);
  if(tv)for(let i=0;i<4;i++)box(g,.045,.012,.015,iron,.29,.43-i*.05,.242);
  return g;
}
function computerDesk(p,x,z){const g=table(p,x,z,1.7,.75,.78);crt(g,0,.82,-.13);box(g,.56,.035,.19,mat('#afa992'),-.03,.835,.27);for(let row=0;row<4;row++)for(let col=0;col<12;col++)box(g,.032,.012,.028,mat('#e2d6b9'),-.28+col*.043,.858,.205+row*.035);orb(g,.055,cream,.46,.86,.29,1,.45,1.4);box(g,.24,.5,.42,cream,.56,.29,-.08);for(let i=0;i<3;i++)box(g,.17,.015,.008,iron,.56,.44-i*.04,.135);chair(p,x,z+.65);return g;}
function fan(p,x,y,z){const g=group(p,x,y,z);cyl(g,.16,.045,iron,0,.025,0);rod(g,[0,.05,0],[0,.48,0],.025);const ring=mesh(g,new T.TorusGeometry(.22,.018,6,24),iron,0,.5,0);for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(g,[0,.5,0],[Math.cos(a)*.2,.5+Math.sin(a)*.2,0],.009,cream);}for(let i=0;i<3;i++){const b=orb(g,.12,mat('#7b9291'),0,.5,0,1,.35,.12);b.rotation.z=i*2.094;}return g;}
function plant(p,x,y,z,scale=1){const g=group(p,x,y,z);g.scale.setScalar(scale);cyl(g,.18,.33,mat('#986648'),0,.17,0,.12);cyl(g,.19,.06,mat('#bf9061'),0,.33,0);cyl(g,.155,.02,mat('#433b2d'),0,.34,0);for(let i=0;i<9;i++){const a=i*2.4,r=.16+rand()*.2,yy=.6+rand()*.45;rod(g,[0,.35,0],[Math.cos(a)*r,yy,Math.sin(a)*r],.009,mat('#455d3b'));const leaf=detailedLeaf(g,Math.cos(a)*r,yy,Math.sin(a)*r,i,.9);leaf.rotation.set(.2,a,a*.2);}return g;}
function ac(p,x,y,z){const g=group(p,x,y,z);box(g,.9,.58,.35,mat('#b1b4ac'),0,0,0);const circle=mesh(g,new T.TorusGeometry(.19,.015,6,20),iron,-.18,0,.19);for(let i=-3;i<=3;i++)rod(g,[-.36,i*.05,.2],[0,i*.05,.2],.009);for(let i=0;i<5;i++)box(g,.22,.02,.01,iron,.27,.17-i*.07,.19);rod(g,[-.3,-.3,0],[-.3,-.45,.2],.035);rod(g,[.3,-.3,0],[.3,-.45,.2],.035);cable(g,[[.47,0,0],[.6,-.2,0],[.6,-1.5,0]],.035,mat('#9c977d'));return g;}
function bicycle(p,x,z,angle=0){const g=group(p,x,.32,z,angle);for(const a of [-.55,.55]){mesh(g,new T.TorusGeometry(.31,.028,7,24),iron,a,0,0);for(let k=0;k<8;k++){const q=k*Math.PI/4;rod(g,[a,0,0],[a+Math.cos(q)*.29,Math.sin(q)*.29,0],.006,cream);}}const m=mat('#697f76',.55,.4);for(const [a,b]of [[[ -.55,0,0],[-.15,.43,0]],[[-.15,.43,0],[.17,0,0]],[[.17,0,0],[-.55,0,0]],[[-.15,.43,0],[.44,.45,0]],[[.44,.45,0],[.17,0,0]],[[.44,.45,0],[.55,0,0]]])rod(g,a,b,.024,m);box(g,.27,.045,.15,mat('#483e35'),-.17,.48,0);rod(g,[.44,.45,0],[.43,.7,0],.024,m);rod(g,[.43,.7,-.18],[.43,.7,.18],.024,m);return g;}

function furnishBook(p,w,d,upper){if(!upper){for(const x of [-1.5,.65]){const s=bookshelf(p,1.95,true);s.position.set(x,0,-d/2+.34);}const side=bookshelf(p,2.8,true);side.position.set(-w/2+.32,0,.1);side.rotation.y=Math.PI/2;const island=table(p,-1.25,1.15,1.2,.72,.73);for(let row=0;row<2;row++)for(let i=0;i<3;i++){const b=book(island,-.42+i*.31,.78,-.18+row*.32,i+row*5,true);b.rotation.x=-.35;}const desk=table(p,.95,.75,1.55,.75,.83);crt(desk,.12,.88,-.05,true);for(let i=0;i<4;i++){const stack=group(desk,-.5,.9+i*.045,.12,(i-1.5)*.12);const coverIndex=[10,3,5,14][i];box(stack,.34,.035,.25,[paperEdge,paperEdge,covers[coverIndex],bookBacks[coverIndex],paperEdge,bookSpines[coverIndex]],0,0,0);}stool(p,.7,1.8,'#ad4932');stool(p,-1.8,1.9,'#397a83');const deskFan=fan(desk,.67,.865,-.22);deskFan.scale.setScalar(.7);}else {const bed=group(p,-1.55,0,-.8);box(bed,1.55,.27,2.25,timber,0,.34,0);box(bed,1.48,.18,2.12,mat('#c9b89e'),0,.56,0);for(let i=0;i<9;i++)box(bed,1.45,.045,.15,mat(i%2?'#5d757d':'#ab7759'),0,.675,-.7+i*.17);box(bed,1.38,.12,.38,mat('#d9c9ad'),0,.72,-.8);box(bed,1.6,.7,.1,timber,0,.58,-1.16);const desk=table(p,.8,-1,1.4,.8);for(let i=0;i<5;i++)book(desk,-.7+i*.12,.85,-.18,i);fan(desk,.55,.85,-.18);chair(p,.8,-.1);const s=bookshelf(p,1.4);s.position.set(.9,0,1.7);s.scale.y=.48;box(p,.9,1.9,.6,timber,-2.1,.95,1.6);box(p,.04,.12,.03,brass,-1.9,1,1.92);const rug=box(p,1.5,.015,1.1,mat('#7e4e46'),-.2,.15,.8);}}
function furnishCyber(p,w,d,upper){for(const x of [-1.25,1.25])for(const z of [-1.65,-.1,1.45])computerDesk(p,x,z);const s=label(p,upper?'安静上网 · 请勿喧哗':'包夜 8 元  ·  冰红茶 2 元',3,.36,'#ded4b3','#5e483b',58);s.position.set(0,2.65,-d/2+.16);const tube=box(p,3.4,.07,.1,new T.MeshBasicMaterial({color:upper?'#ffb9ec':'#bfe8ff'}),0,2.9,-1.8);fan(p,2.5,.86,-2.3);for(let i=0;i<3;i++)cyl(p,.07,.17,mat('#a34a36'),-2.5,.95,-1+i*.4);}
function furnishTea(p,w,d){const counter=box(p,w-.6,.9,.65,mat('#96b6a1'),0,.45,-.55);box(p,w-.5,.09,.77,mat('#c9b9a1',.4),0,.94,-.55);for(let i=0;i<8;i++){cyl(p,.065,.16,mat(i%2?'#edddbf':'#d1a876'),-1.3+i*.35,1.07,-.4);cyl(p,.075,.025,cream,-1.3+i*.35,1.16,-.4);}for(let i=0;i<3;i++){cyl(p,.15,.6,new T.MeshStandardMaterial({color:'#e2d6aa',transparent:true,opacity:.45,roughness:.15}),-.8+i*.6,1.28,-.77);cyl(p,.16,.05,brass,-.8+i*.6,1.6,-.77);}cyl(p,.25,.5,mat('#aeb4b1',.25,.8),1.35,1.25,-.6);const menu=label(p,'七杯茶  /  珍珠奶茶 3元  ·  柠檬茶 2元',w-.5,.85,'#e8dfc1','#31594b',55);menu.position.set(0,2.25,-d/2+.16);for(const x of [-1.3,0,1.3])stool(p,x,1.1,x===0?'#bf603b':'#478f89');box(p,.8,1.65,.65,mat('#bcb9a7'),w/2-.6,.83,-1.65);for(let i=0;i<4;i++)box(p,.6,.05,.55,cream,w/2-.6,.3+i*.35,-1.65);plant(p,-w/2+.35,0,1.5,.9);}
function posterArtwork(kind,small=false){const c=document.createElement('canvas');c.width=900;c.height=small?1100:500;const g=c.getContext('2d'),tea=kind==='tea';const paper=tea?'#eee0b8':'#ead8ad',ink=tea?'#28564a':'#7e3427',accent=tea?'#bd593d':'#b14a32';g.fillStyle=paper;g.fillRect(0,0,c.width,c.height);for(let i=0;i<1800;i++){g.fillStyle=i%3?'#543b1a0c':'#fff7dd25';g.fillRect(rand()*c.width,rand()*c.height,rand()*5+1,rand()*3+1);}g.strokeStyle=ink;g.lineWidth=12;g.strokeRect(18,18,c.width-36,c.height-36);g.strokeStyle=accent;g.lineWidth=3;g.strokeRect(35,35,c.width-70,c.height-70);g.textAlign='center';g.textBaseline='middle';g.fillStyle=ink;g.font='bold 70px "Songti SC","SimSun","Hiragino Sans GB",serif';g.fillText(tea?'七杯茶':'小玲米线',450,small?125:88);g.fillStyle=accent;g.font='bold 27px sans-serif';g.fillText(tea?'放学后来一杯 · 清凉又解渴':'小锅现煮 · 热汤鲜香',450,small?190:142);
if(!small){g.textAlign='left';g.font='bold 30px "Songti SC","SimSun",serif';const rows=tea?[['珍珠奶茶','3元'],['红豆奶茶','4元'],['柠檬绿茶','3元'],['珍珠 / 椰果','加1元']]:[['招牌牛肉米线','6元'],['酸菜肉丝米线','5元'],['麻辣米线','5元'],['加煎蛋 / 加肉','1元起']];rows.forEach((r,i)=>{const y=220+i*60;g.fillStyle=ink;g.fillText(r[0],58,y);g.textAlign='right';g.fillStyle=accent;g.fillText(r[1],565,y);g.textAlign='left';g.strokeStyle='#7c664332';g.lineWidth=2;g.beginPath();g.moveTo(58,y+28);g.lineTo(565,y+28);g.stroke();});
}else{g.textAlign='center';g.fillStyle=ink;g.font='bold 42px "Songti SC","SimSun",serif';g.fillText(tea?'珍珠奶茶':'招牌米线',450,285);g.fillStyle=accent;g.font='bold 34px sans-serif';g.fillText(tea?'珍珠 · 椰果 · 红豆':'牛肉 · 酸菜 · 麻辣',450,345);g.fillStyle=ink;g.font='28px sans-serif';g.fillText(tea?'加珍珠 +1元':'加煎蛋 +1元',450,405);}
if(tea){for(let i=0;i<3;i++){const x=660+i*67,base=small?850:430;g.fillStyle=['#c79650','#e7d9b1','#bf6b43'][i];g.beginPath();g.moveTo(x-34,base-74);g.lineTo(x+34,base-74);g.lineTo(x+25,base);g.lineTo(x-25,base);g.closePath();g.fill();g.fillStyle='#593d2d';for(let b=0;b<4;b++){g.beginPath();g.arc(x-15+b%2*24,base-18-Math.floor(b/2)*20,5,0,Math.PI*2);g.fill();}g.strokeStyle=ink;g.lineWidth=7;g.beginPath();g.moveTo(x,base-77);g.lineTo(x+15,base-140);g.stroke();}}else{const x=675,y=small?820:390;g.fillStyle=ink;g.beginPath();g.ellipse(x,y,130,42,0,0,Math.PI);g.lineTo(x-104,y-94);g.quadraticCurveTo(x,y-132,x+104,y-94);g.closePath();g.fill();g.fillStyle='#d9a754';for(let i=0;i<8;i++){g.beginPath();g.arc(x-75+i*21,y-74-(i%2)*20,7,0,Math.PI*2);g.fill();}g.strokeStyle='#f3cf83';g.lineWidth=9;g.beginPath();g.moveTo(x-50,y-91);g.bezierCurveTo(x-80,y-140,x+45,y-65,x+70,y-112);g.stroke();}g.textAlign='center';g.fillStyle=ink;g.font='22px sans-serif';g.fillText('2005 · 放学时段供应',450,c.height-34);return new T.CanvasTexture(c);}
function printedBoard(parent,kind,x,y,z,w,h,small=false,rotation=0){const frame=group(parent,x,y,z,rotation),depth=.055;box(frame,w+.09,h+.09,depth,mat(kind==='tea'?'#765139':'#765045'),0,0,0);box(frame,w,h,.012,mat('#dbc89e'),0,0,depth*.56);const tex=posterArtwork(kind,small);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;const paper=new T.MeshStandardMaterial({map:tex,roughness:.88,emissive:kind==='tea'?'#d7b480':'#cfaa79',emissiveMap:tex,emissiveIntensity:.055,side:T.DoubleSide});mesh(frame,new T.PlaneGeometry(w-.08,h-.08),paper,0,0,depth*.62);for(const xx of [-w/2-.015,w/2+.015])cyl(frame,.018,h+.08,brass,xx,0,depth*.75,.018,8);return frame;}
function addShopPrints(p,kind,w,d){printedBoard(p,kind,0,2.67,-d/2+.14,2.78,.72,false);const left=kind==='tea';printedBoard(p,kind,left?-w/2+.13:w/2-.13,1.88,-.15,.54,.88,true,left?Math.PI/2:-Math.PI/2);}

const roofFinish=new T.MeshStandardMaterial({map:pbrMap('RoofingTiles001','Color'),normalMap:pbrMap('RoofingTiles001','NormalGL'),roughnessMap:pbrMap('RoofingTiles001','Roughness'),color:'#aeb6b9',roughness:.9,normalScale:new T.Vector2(.85,.85)});roofFinish.userData.metersPerTile=2;
weatherMaterials.push(weatherSurface(roofFinish,.95));
const district=createDistrictKit({group,box,cyl,orb,rod,mesh,mat,table,chair,stool,crt,fan,plant,fixture,label,wood,iron,cream,timber,roofFinish,metalPBR,ceramic,fabric,bookCovers:covers,bookBacks,bookSpines,paperEdge});
function roomDetails(p,def){
  const {w,d,kind}=def,food=['tea','noodles','mianpi','bakery'].includes(kind);
  const trim=food?mat('#767d76',.5):wood;
  box(p,w-.2,.14,.045,trim,0,.24,-d/2+.12);
  for(const side of [-1,1])box(p,.045,.14,d-.2,trim,side*(w/2-.12),.24,0);
  if(food){box(p,w-.25,1.2,.025,ceramic,0,1.45,-d/2+.115);for(const side of [-1,1])box(p,.025,1.2,d*.55,ceramic,side*(w/2-.115),1.45,-d*.2);}
  for(const side of [-1,1]){const socket=group(p,side*(w/2-.13),1.25,-d*.28,-side*Math.PI/2);box(socket,.115,.12,.025,cream);for(const x of [-.025,.025])box(socket,.009,.028,.004,iron,x,0,.016);box(socket,.008,.018,.004,iron,0,.034,.016);}
  // district.furnish already supplies one service bin per shop. The former
  // second bin here made every interior artificially symmetrical.
  if(kind==='barber'){const folded=fabric('#a3b5b4');for(let i=0;i<3;i++)box(p,.34,.035,.24,folded,-w/2+.47,1.03+i*.04,-d/2+.51);}
}
const wallAgeMap=texture((c,s)=>{c.clearRect(0,0,s,s);for(let i=0;i<1800;i++){const x=rand()*s,y=s*(.6+rand()*.4),r=1+rand()*10;c.fillStyle='rgba(58,54,40,'+(.025+rand()*.07)+')';c.beginPath();c.ellipse(x,y,r,r*.4,0,0,6.28);c.fill();}for(let i=0;i<35;i++){const x=rand()*s,len=s*(.08+rand()*.4),gr=c.createLinearGradient(0,0,0,len);gr.addColorStop(0,'#403b2833');gr.addColorStop(1,'#403b2800');c.fillStyle=gr;c.fillRect(x,0,2+rand()*5,len);}for(let i=0;i<45;i++){const x=rand()*s,y=rand()*s;c.strokeStyle='#665b3b30';c.lineWidth=.7;c.beginPath();c.moveTo(x,y);c.lineTo(x+4,y+8);c.lineTo(x+2,y+12);c.stroke();}},512);
function wallAge(p,w,h,x,y,z,angle=0){const m=new T.MeshStandardMaterial({map:wallAgeMap,transparent:true,opacity:.8,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});const plane=mesh(p,new T.PlaneGeometry(w,h),m,x,y,z);plane.rotation.y=angle;plane.castShadow=false;return plane;}
function building(def){const root=group(world,def.x,.18,def.z,def.angle);root.userData.id=def.id;const house={...def,root,floors:[],outside:group(root)};stores.set(def.id,house);pickables.push(root);
  box(house.outside,def.w+.6,.2,def.d+.65,pavement,0,0,0);
  for(let k=0;k<3;k++)box(house.outside,def.w+.5,.085,.3,pavement,0,-.05-k*.055,def.d/2+.35+k*.22);
  const wallMat=plaster(def.color),baseMat=plaster(def.base||'#477669');
  wallMat.userData.metersPerTile=2;baseMat.userData.metersPerTile=2;
  for(let level=0;level<def.levels;level++){const floor=group(root,0,level*3.3,0),shell=group(floor),front=group(floor),inside=group(floor),roof=group(floor);house.floors.push({floor,shell,front,inside,roof});
    if(level>0){box(shell,def.w-1.05,.16,def.d,floorMat,-.525,.08,0);box(shell,1.05,.16,1.1,floorMat,def.w/2-.525,.08,def.d/2-.55);box(shell,1.05,.16,.65,floorMat,def.w/2-.525,.08,-def.d/2+.325);}else box(shell,def.w,.16,def.d,floorMat,0,.08,0);
    box(shell,def.w,3.15,.18,wallMat,0,1.67,-def.d/2);
    if(level===0){box(shell,def.w,.78,.035,brickFinish,0,.57,-def.d/2-.11);for(const side of [-1,1])box(shell,.035,.78,def.d,brickFinish,side*(def.w/2+.11),.57,0);}
    for(const x of [-def.w/2,def.w/2]){box(shell,.18,3.15,def.d,wallMat,x,1.67,0);box(shell,.19,.8,def.d,baseMat,x,.57,0);}
    box(shell,def.w,.75,.19,baseMat,0,.54,-def.d/2+.01);
    // Every opaque part spanning the opening belongs to front, including frames and canopy.
    for(const x of [-def.w/2+.16,def.w/2-.16])box(front,.35,3.2,.3,wallMat,x,1.67,def.d/2);
    for(const x of [-def.w/2+.16,def.w/2-.16])wallAge(front,.34,2.8,x,1.55,def.d/2+.155);
    for(const side of [-1,1])wallAge(shell,def.d-.15,3.0,side*(def.w/2+.115),1.7,0,side*Math.PI/2);
    box(front,def.w,.48,.3,wallMat,0,3.02,def.d/2);
    const artSign=level===0&&Boolean(fasciaTextures[def.kind]);
    const signWidth=artSign?(def.kind==='bakery'?2.48:2.7):def.w-.35,signHeight=artSign?signWidth/3:.5,signY=artSign?3.16:3.02;
    const signBacking=box(front,artSign?signWidth+.14:def.w-.2,artSign?signHeight+.1:.62,.17,mat(artSign?{fashion:'#4b284d',bakery:'#8b421f',shop:'#9c382b'}[def.kind]:def.sign),0,artSign?3.14:2.99,def.d/2+.21);
    const sign=label(front,level===0?def.name:(def.kind==='bookshop'?'漫画 · 书籍 · VCD 租售':'星 光 网 吧  /  二 楼'),signWidth,signHeight,def.sign,def.ink||'#f2d19c',def.kind==='tea'?73:87);sign.position.set(0,signY,def.d/2+.31);
    if(level===0){sign.material.map=fasciaTextures[def.kind]||shopSignTexture(def,def.name);if(artSign){sign.material.emissiveMap=null;sign.material.emissive.set('#000000');}sign.material.needsUpdate=true;}
    if(def.kind==='cyber'){sign.material.emissiveMap=null;sign.material.emissive.set('#000000');sign.material.emissiveIntensity=0;sign.material.needsUpdate=true;const neon=new T.MeshStandardMaterial({color:'#a9508e',emissive:'#ff83d3',emissiveIntensity:0,roughness:.35});for(const yy of [2.758,3.282])box(front,def.w-.38,.018,.023,neon,0,yy,def.d/2+.34);const spill=new T.PointLight('#e58bdd',0,3.2,2);spill.position.set(0,2.95,def.d/2+.65);front.add(spill);litSigns.push({material:neon,power:1.35,light:spill});}
    if(level===0){const lamp=fixture(front,-def.w*.32,2.43,def.d/2+.42,'#ffd8a6',5.5,'shopfront');lamp.scale.setScalar(.7);}
    for(const x of [-def.w*.34,def.w*.34]){box(front,.055,2.5,.065,wood,x,1.4,def.d/2+.1);box(front,def.w*.29,.055,.065,wood,x,1.45,def.d/2+.1);box(front,def.w*.29,.055,.065,wood,x,2.65,def.d/2+.1);const glass=new T.MeshStandardMaterial({color:'#b9c7b6',transparent:true,opacity:.13,roughness:.15,depthWrite:false});box(front,def.w*.28,2.35,.025,glass,x,1.4,def.d/2+.08);}
    if(level===0&&['bookshop','cyber','fashion'].includes(def.kind)){const door=group(front,-.48,.18,def.d/2+.16,-1.12);for(const x of [0,.86])box(door,.045,2.32,.055,wood,x,1.16,0);for(const y of [0,.5,2.32])box(door,.9,.055,.055,wood,.43,y,0);box(door,.81,.44,.035,wallMat,.43,.25,0);box(door,.81,1.75,.014,new T.MeshStandardMaterial({color:'#96aba5',roughness:.15,transparent:true,opacity:.16,depthWrite:false}),.43,1.41,0);rod(door,[.74,.97,.045],[.74,1.19,.045],.017,brass);for(const y of [.35,1.9])cyl(door,.025,.12,iron,0,y,0);}
    const aw=group(front,0,2.58,def.d/2+.57);aw.rotation.x=.14;
    const awW=def.w-.2;
    if(def.kind==='cyber'){
      box(aw,awW,.12,.72,mat('#29374a',.36,.3),0,0,0);
      box(aw,awW,.08,.08,mat('#d776a9',.35),0,-.08,.37);
    }else if(def.kind==='bookshop'){
      box(aw,awW,.1,.84,wood,0,0,0);
      for(let i=0;i<8;i++)box(aw,awW/8-.02,.12,.07,timber,-awW/2+(i+.5)*awW/8,-.08,.43);
    }else if(def.kind==='fashion'){
      box(aw,awW,.055,1.05,awningCloth('#66516d'),0,0,0);
      for(let i=0;i<10;i++)box(aw,awW/10-.015,.21,.025,awningCloth(i%2?'#66516d':'#9c738e'),-awW/2+(i+.5)*awW/10,-.1,.53);
    }else{
      for(let i=0;i<18;i++){const col=i%2?def.awning:'#d8c69b';box(aw,awW/18,.045,1.12,awningCloth(col),-awW/2+(i+.5)*awW/18,0,0);box(aw,awW/18,.18,.04,awningCloth(col),-awW/2+(i+.5)*awW/18,-.09,.55);}
    }
    if(level===0&&def.kind==='tea'){
      const disc=mesh(front,new T.CircleGeometry(.31,32),mat('#efe2b5'),def.w/2-.48,1.95,def.d/2+.43);disc.castShadow=false;
      mesh(front,new T.TorusGeometry(.31,.027,8,32),mat('#326457'),def.w/2-.48,1.95,def.d/2+.447);
      const badge=label(front,'茶',.43,.28,'#efe2b5','#326457',168);badge.position.set(def.w/2-.48,1.96,def.d/2+.456);
    }
    if(level===0&&def.kind==='barber'){
      const pole=group(front,def.w/2-.4,1.55,def.d/2+.46);
      cyl(pole,.105,.82,cream,0,0,0,.105,20);
      for(let i=0;i<7;i++){const band=mesh(pole,new T.TorusGeometry(.107,.017,5,24),mat(i%2?'#376b78':'#b44547'),0,-.34+i*.113,0);band.rotation.x=Math.PI/2;band.rotation.y=i*.42;}
      for(const y of [-.44,.44])cyl(pole,.125,.035,iron,0,y,0,.125,20);
    }
    if(level===0&&def.kind==='bookshop'){
      box(front,.64,1.05,.05,wood,-def.w/2+.55,1.75,def.d/2+.38);
      const hanger=label(front,'旧书借阅',.52,.92,'#d8c397','#563e2d',80);hanger.position.set(-def.w/2+.55,1.75,def.d/2+.42);
    }
    if(level===0&&['noodles','mianpi'].includes(def.kind)){
      const q=label(front,def.kind==='noodles'?'热汤现煮':'现拌擀面皮',.66,.95,def.kind==='noodles'?'#e2c38a':'#d8bea1','#713a2d',69);q.position.set(def.w/2-.55,1.7,def.d/2+.42);
    }
    for(const x of [-def.w*.4,def.w*.4])rod(front,[x,2.15,def.d/2],[x,2.5,def.d/2+1.1],.018,iron);
    const facadePrints=def.kind==='tea'||def.kind==='noodles'?1:0;
    for(let i=0;i<facadePrints;i++){
      const printY=[1.12,1.93][i],printX=-def.w/2+.19+(i?-.015:.01),printZ=def.d/2+.17;
      if((def.kind==='tea'||def.kind==='noodles')&&level===0){
        const panel=new T.Mesh(new T.PlaneGeometry(.26,.43),new T.MeshStandardMaterial({map:posterArtwork(def.kind,true),roughness:.9,side:T.DoubleSide}));panel.position.set(printX,printY,printZ);front.add(panel);
      }else poster(front,printX,printY,printZ,i+level*4+def.name.length,.26,.43);
    }
    box(roof,def.w+.3,.15,def.d+.3,pavement,0,3.28,0);
    if(level===def.levels-1){
      const gabledRoof=['shop','barber','fashion','mianpi'].includes(def.kind);
      if(!gabledRoof){
        for(const x of [-def.w/2,def.w/2]){box(roof,.13,.28,def.d+.15,wallMat,x,3.5,0);box(roof,.22,.07,def.d+.26,pavement,x,3.66,0);}
        for(const z of [-def.d/2,def.d/2]){box(roof,def.w,.28,.13,wallMat,0,3.5,z);box(roof,def.w+.22,.07,.22,pavement,0,3.66,z);}
      }
      // Snow is shaded directly onto horizontal roof surfaces and roof tiles.
      if(def.levels>1){cyl(roof,.42,.9,mat('#919b98',.4,.65),-def.w*.28,3.85,-def.d*.2);for(let i=0;i<5;i++){const ring=mesh(roof,new T.TorusGeometry(.425,.018,5,20),iron,-def.w*.28,3.5+i*.17,-def.d*.2);ring.rotation.x=Math.PI/2;}rod(roof,[def.w*.25,3.45,-1],[def.w*.25,5,-1],.025);rod(roof,[def.w*.25-.7,4.8,-1],[def.w*.25+.7,4.8,-1],.018);for(let i=0;i<5;i++)rod(roof,[def.w*.25-.6+i*.3,4.8,-1.3],[def.w*.25-.6+i*.3,4.8,-.7],.012);}
      else if(!gabledRoof){box(roof,.48,.5,.48,mat('#8b8376'),-def.w*.3,3.63,-def.d*.25);box(roof,.58,.08,.58,iron,-def.w*.3,3.92,-def.d*.25);}
      if(!['shop','barber','fashion','mianpi'].includes(def.kind))plant(roof,def.w*.33,3.4,def.d*.3,.85);
    }
    if(def.kind==='bookshop')furnishBook(inside,def.w,def.d,level===1);
    district.furnish(inside,def,level===1);
    roomDetails(inside,def);
    if(level===0){addPeriodPrints(inside,def);addPhotographicGoods(inside,def);}
    fixture(inside,0,2.85,.15,def.kind==='cyber'?'#b2c5e4':'#ffcf91',def.kind==='cyber'?3.5:4.5);
    if(def.kind==='bookshop'||def.kind==='cyber')
      fixture(inside,0,2.85,-1.55,def.kind==='cyber'?'#c7bad7':'#ffe1b6',2.5);
    if(level===0&&['tea','noodles','bakery','shop','mianpi'].includes(def.kind))
      fixture(inside,-def.w*.12,2.52,def.d/2-.62,'#ffdda8',2.9);
  }
  ac(house.outside,def.w/2+.03,2.4,def.d/2-.8).rotation.y=Math.PI/2;
  const brickwork=group(house.outside,def.w/2+.105,.4,-.3,Math.PI/2);for(let row=0;row<4;row++)for(let col=0;col<5-row%2;col++)box(brickwork,.23,.095,.025,mat(['#9d6b51','#ae7958','#8f6351'][(col+row)%3]),col*.25+(row%2)*.12,row*.11,0);
  rod(house.outside,[-def.w/2-.13,.2,def.d/2-.1],[-def.w/2-.13,def.levels*3.3,def.d/2-.1],.05,mat('#756d5d'));
  for(let i=0;.5+i*.9<def.levels*3.3;i++)box(house.outside,.13,.03,.14,iron,-def.w/2-.13,.5+i*.9,def.d/2-.1);
  plant(house.outside,-def.w/2-.35,.12,def.d/2+.4,1.2);plant(house.outside,def.w/2+.25,.12,def.d/2+.5,.85);
  // The school-side wall occupies the old shop bicycle bay. Park that bicycle
  // farther forward on the paved verge, away from the wall and shop entrance.
  if(def.kind==='shop')bicycle(house.outside,-1.05,def.d/2+1.75,-.12);
  else bicycle(house.outside,def.w*.35,def.d/2+.6,.08);
  const v=group(house.outside,def.w/2+.16,0,def.d/2-.2);for(let i=0;i<(def.levels===1?17:32);i++){const yy=.5+i*.16;const leaf=orb(v,.15,mat(i%2?'#57734e':'#7c8751'),Math.sin(i)*.13,yy,Math.cos(i)*.13,.7,1,.25);foliage.push(leaf);}
  district.architecture(house);
  return house;
}

// Compact, staggered street: both facades turn slightly toward the opening.
const definitions=[
 {id:'bookshop',name:'诸葛亮读书社',kind:'bookshop',x:5.5,z:-3.2,w:6,d:5.3,levels:2,angle:-.66,color:'#c5ad79',base:'#416d5c',sign:'#244d42',awning:'#9b9c5d'},
 {id:'cyber',name:'☆ 星光网吧',kind:'cyber',x:-5.5,z:-2.7,w:6,d:5.4,levels:2,angle:.68,color:'#648082',base:'#376173',sign:'#35476f',ink:'#f4b8eb',awning:'#697b9e'},
 {id:'tea',name:'七杯茶奶茶店',kind:'tea',x:5.9,z:4.1,w:4.6,d:4.2,levels:1,angle:-.48,color:'#c6c8a5',base:'#68988a',sign:'#e1c993',ink:'#345a49',awning:'#c77341'},
 {id:'noodles',name:'小玲米线',kind:'noodles',x:-6.1,z:5.1,w:4.8,d:4.5,levels:1,angle:.48,color:'#c9aa82',base:'#9b5745',sign:'#d8ad61',ink:'#8e3c2c',awning:'#c99c45'},
 {id:'bakery',name:'面 包 坊',kind:'bakery',x:7.9,z:9.6,w:3.8,d:3.8,levels:1,angle:-.44,color:'#c3a68a',base:'#bd867f',sign:'#e1caa0',ink:'#8b4734',awning:'#b47775'},
 {id:'shop',name:'红星小卖部',kind:'shop',x:-8.6,z:-13,w:4.4,d:3.8,levels:1,angle:.18,color:'#b5aa8a',base:'#7b8170',sign:'#a34e3c',awning:'#a75a43'},
 {id:'barber',name:'青 春 理 发',kind:'barber',x:7.1,z:15.1,w:4.5,d:4.4,levels:1,angle:-.64,color:'#9cae9c',base:'#437971',sign:'#396f69',awning:'#73948a'},
 {id:'fashion',name:'火 星 地 带',kind:'fashion',x:-6.7,z:10.9,w:4.7,d:4.4,levels:1,angle:.62,color:'#b5b880',base:'#858355',sign:'#75547e',awning:'#9a85a0'},
 {id:'mianpi',name:'汉中擀面皮',kind:'mianpi',x:8.6,z:-13,w:4.7,d:3.9,levels:1,angle:-.18,color:'#c7bc9f',base:'#7c8e79',sign:'#8e4938',awning:'#b69460'}
];
// Continuous shopfronts face the road; stagger along the street rather than
// turning adjacent buildings through one another. Keep a clear school forecourt.
const streetLayout={bookshop:[8.1,-3.2,-1.40],cyber:[-8.1,-2.5,1.40],tea:[7.8,4.5,-1.48],noodles:[-7.9,5.2,1.45],bakery:[7.5,10.3,-1.42],barber:[7.9,16.2,-1.48],fashion:[-7.8,12.0,1.45],shop:[-7.9,-12.8,.85],mianpi:[7.9,-12.8,-.85]};
for(const def of definitions){[def.x,def.z,def.angle]=streetLayout[def.id];}
// Rounded miniature foundation.
function roundedShape(w,d,r){const s=new T.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);return s;}
// The extruded foundation includes a 12 cm bevel above its nominal top.
// Keep that actual top below the asphalt, never coplanar with the sidewalks.
const base=mesh(world,new T.ExtrudeGeometry(roundedShape(26,40,2.2),{depth:.7,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.16,bevelThickness:.12,curveSegments:12}),mat('#383645'));base.rotation.x=-Math.PI/2;base.position.set(0,-.90,3);
const ground=mesh(world,new T.ShapeGeometry(roundedShape(25.9,39.9,2.2),20),asphalt);ground.rotation.x=-Math.PI/2;ground.position.set(0,.02,3);
const shadowFloor=box(scene,600,.1,600,new T.MeshBasicMaterial({color:'#69617a'}),0,-1.02,0);shadowFloor.castShadow=false;shadowFloor.receiveShadow=false;
const path=new T.CatmullRomCurve3([[0,0,22.6],[1.1,0,17],[-1,0,10],[.7,0,4],[-.6,0,-1],[.8,0,-6],[0,0,-11.7]].map(v=>new T.Vector3(...v)));
const pavingMap=tiled(texture((c,s)=>{c.fillStyle='#756e65';c.fillRect(0,0,s,s);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const n=130+Math.floor(rand()*32);c.fillStyle='rgb('+n+','+(n-8)+','+(n-22)+')';c.fillRect(x*64+2,y*64+2,60,60);for(let k=0;k<30;k++){c.fillStyle=k%2?'#ffffff09':'#00000012';c.fillRect(x*64+rand()*60,y*64+rand()*60,rand()*4+1,rand()*3+1);}}},512),.2);
const pavingMat=new T.MeshStandardMaterial({map:pbrMap('PavingStones036','Color'),normalMap:pbrMap('PavingStones036','NormalGL'),roughnessMap:pbrMap('PavingStones036','Roughness'),color:'#e1d8c8',roughness:.92,normalScale:new T.Vector2(.55,.55)});
weatherMaterials.push(weatherSurface(pavingMat,.76));
for(const t of [pavingMat.map,pavingMat.normalMap,pavingMat.roughnessMap])t.repeat.set(.4,.4);
for(const side of [-1,1]){const outline=[];for(let i=0;i<=80;i++){const p=path.getPointAt(i/80),v=path.getTangentAt(i/80),n=new T.Vector3(v.z,0,-v.x);outline.push(new T.Vector2(p.x+n.x*side*3.12,-(p.z+n.z*side*3.12)));}outline.push(new T.Vector2(-side*12.15,14.9),new T.Vector2(-side*12.15,-21.5));const island=mesh(world,new T.ShapeGeometry(new T.Shape(outline)),pavingMat);island.rotation.x=-Math.PI/2;island.position.y=.10;}
for(let side of [-1,1])for(let i=0;i<78;i++){const p=path.getPointAt(i/78),v=path.getTangentAt(i/78),normal=new T.Vector3(v.z,0,-v.x);const g=group(world,p.x+normal.x*side*3,.08,p.z+normal.z*side*3,Math.atan2(v.x,v.z));box(g,.18,.22,.43,pavement,0,0,0);}
// Two visibly continuous pedestrian links branch from the curb toward the rear shops.
const rearWalkways=group(world);
for(const side of [-1,1]){
  for(let i=0;i<13;i++){
    const x=side*(3.25+i*.41);
    box(rearWalkways,.37,.025,1.3,pavingMat,x,.122,-10.35+Math.sin(i*.72)*.035);
  }
  box(rearWalkways,5.35,.055,.11,mat('#aaa08d'),side*5.9,.13,-11.08);
  box(rearWalkways,5.35,.055,.11,mat('#aaa08d'),side*5.9,.13,-9.65);
}
definitions.forEach(building);
const barberMirrors=[];stores.get('barber').root.traverse(o=>{if(o.name==='barber-reflection-surface')barberMirrors.push(o);});
const barberMirror=barberMirrors[0];
const barberStudent=stores.get('barber').root.getObjectByName('barber-student-reflection');
const barberMirrorWorld=new T.Vector3();
const mirrorVertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const mirrorFragmentShader=`uniform sampler2D reflection;uniform vec2 pixel;varying vec2 vUv;
void main(){
  vec3 c=texture2D(reflection,vUv).rgb*.28;
  c+=texture2D(reflection,vUv+vec2(pixel.x*4.5,0.)).rgb*.12;
  c+=texture2D(reflection,vUv-vec2(pixel.x*4.5,0.)).rgb*.12;
  c+=texture2D(reflection,vUv+vec2(0.,pixel.y*4.5)).rgb*.12;
  c+=texture2D(reflection,vUv-vec2(0.,pixel.y*4.5)).rgb*.12;
  c+=texture2D(reflection,vUv+pixel*3.).rgb*.06;
  c+=texture2D(reflection,vUv-pixel*3.).rgb*.06;
  c+=texture2D(reflection,vUv+vec2(pixel.x*3.,-pixel.y*3.)).rgb*.06;
  c+=texture2D(reflection,vUv+vec2(-pixel.x*3.,pixel.y*3.)).rgb*.06;
  c=mix(c,vec3(.43,.51,.49),.24);
  gl_FragColor=vec4(c,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const barberCapture=barberMirrors.map((surface,i)=>{
  const target=new T.WebGLRenderTarget(192,224,{minFilter:T.LinearFilter,magFilter:T.LinearFilter});
  const camera=new T.PerspectiveCamera(72,192/224,.1,20);
  camera.position.set(i===0?-1:.85,1.97,-stores.get('barber').d/2+.34);
  camera.rotation.set(-.16,Math.PI,0);stores.get('barber').floors[0].inside.add(camera);
  surface.material=new T.ShaderMaterial({uniforms:{reflection:{value:target.texture},pixel:{value:new T.Vector2(1/192,1/224)}},vertexShader:mirrorVertexShader,fragmentShader:mirrorFragmentShader,side:T.DoubleSide});
  return {target,camera};
});
let barberMirrorCaptured=false;
const interiorLoader=new GLTFLoader();
function enrichInterior(model){const changed=new Map();model.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const original=o.material,name=original.name||'';if(!changed.has(original.uuid)){const m=original.clone();if(/钢|铝|黑铁/.test(name)){Object.assign(m,metalPBR);m.normalScale.set(.22,.22);}else if(/木/.test(name)){Object.assign(m,woodPBR);m.color.set('#c9b08a');m.userData.metersPerTile=2;}else if(/瓷砖/.test(name)){m.map=ceramic.map;m.normalMap=ceramic.normalMap;m.roughnessMap=ceramic.roughnessMap;m.normalScale.set(.35,.35);m.userData.metersPerTile=1.8;}changed.set(original.uuid,m);}o.material=changed.get(original.uuid);if(o.material.userData.metersPerTile){o.geometry=o.geometry.clone();const pos=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=o.geometry.attributes.uv,s=o.material.userData.metersPerTile;if(uv)for(let i=0;i<pos.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?pos.getZ(i)*o.scale.z:pos.getX(i)*o.scale.x)/s,(ny>.5?pos.getZ(i)*o.scale.z:pos.getY(i)*o.scale.y)/s);}}});}
function loadShopInterior(id,file){const house=stores.get(id);if(!house)return;interiorLoader.load('./blender_assets/'+file+'?v=48-shop-details',gltf=>{const model=gltf.scene;enrichInterior(model);model.rotation.y=Math.PI;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});house.floors[0].inside.add(model);batch(model);atmosphere();document.querySelector('#scene').dataset[id+'Model']='ready';},undefined,error=>{console.error('店铺模型加载失败',id,error);toast(house.name+'设备加载失败，请刷新重试');});}
loadShopInterior('tea','seven_cups_tea_v2.glb');
loadShopInterior('noodles','xiaoling_noodles.glb');

function streetLamp(x,z){const g=group(world,x,0,z,x>0?Math.PI:0);cyl(g,.075,4.1,iron,0,2.05,0,.12);cyl(g,.16,.3,iron,0,.15,0);cable(g,[[0,3.5,0],[0,4.25,0],[.55,4.25,0],[.65,3.95,0]],.04);fixture(g,.65,3.94,0,'#ffd18d',16,'street');}
for(const p of [[-3.6,9.2],[3.5,7.2],[-3.5,1.5],[3.3,-6.8]])streetLamp(...p);
function tree(x,z,r=1.2){
 const g=group(world,x,.1,z),trunk=timber.clone();trunk.color.set('#605344');trunk.roughness=1;
 cyl(g,.11,2.5,trunk,0,1.25,0,.22,14);
 for(let i=0;i<9;i++){const a=i*2.4,tip=[Math.cos(a)*r*.75,2.9+(i%3)*.3,Math.sin(a)*r*.75];rod(g,[0,1.3+i*.08,0],tip,.035,trunk);for(let j=0;j<4;j++){const b=a+j*.7;rod(g,tip,[tip[0]+Math.cos(b)*.5,tip[1]+.35+j*.08,tip[2]+Math.sin(b)*.5],.011,trunk);}}
 for(let i=0;i<580;i++){const a=rand()*6.28,h=rand()*2-1,rr=Math.sqrt(1-h*h)*Math.sqrt(rand())*r;const leaf=detailedLeaf(g,Math.cos(a)*rr,3.4+h*1.15,Math.sin(a)*rr,i,.7+rand()*.7);leaf.userData.deciduous=true;foliage.push(leaf);}
 return g;
}
for(const p of [[-11.25,-16,1],[11.25,-16,1],[-11,6,1.2],[11,3,1],[-10,12,1.2]])tree(...p);
function pole(x,z){const g=group(world,x,0,z);cyl(g,.09,6.5,mat('#797766'),0,3.25,0,.14);box(g,1.6,.1,.12,wood,0,5.9,0);for(let i=0;i<4;i++)cyl(g,.06,.22,cream,-.6+i*.4,6.08,0);for(let i=0;i<3;i++)box(g,.15,.035,.17,iron,0,3+i*.5,0);return g;}
pole(-10.6,9);pole(-10,-6);pole(10.4,-6);
for(let i=0;i<3;i++){cable(world,[[-10.6+i*.3,6,9],[-10.4+i*.3,5.4,1],[-10+i*.3,6,-6]],.014);cable(world,[[-10+i*.3,6,-6],[0,5.1,-6.8],[10.4+i*.2,6,-6]],.014);}
// School entrance and rear backdrop, kept low-contrast to frame the street.
const school=group(world,0,.12,-12.4);const schoolWall=plaster('#beb59e');schoolWall.userData.metersPerTile=2;for(const x of [-2.1,2.1]){box(school,.55,3.2,.65,schoolWall,x,1.6,0);fixture(school,x,3.4,0,'#ffdb9a',9,'street');}box(school,4.8,.65,.65,schoolWall,0,3.02,0);label(school,'第一中学',3.3,.55,'#bfb092','#504638',105).position.set(0,3.03,.34);for(let i=0;i<18;i++)rod(school,[-1.9+i*.22,.1,0],[-1.9+i*.22,2.7,0],.025);for(const y of [.4,1.6,2.5])rod(school,[-1.9,y,0],[1.9,y,0],.035);for(const side of [-1,1])box(school,3,1.4,.3,schoolWall,side*3.9,.7,0);
function schoolPane(floor,i){const m=new T.MeshStandardMaterial({color:'#a5b0af',emissive:'#ffd59d',emissiveIntensity:0,roughness:.32});litWindows.push({material:m,power:(i+floor*3)%4===0?.06:.65+((i*7)%3)*.15});return m;}
const back=group(world,0,0,-15.3);box(back,9,5.7,1.6,plaster('#9a9993'),0,2.9,-.5);for(let floor=0;floor<3;floor++)for(let i=0;i<8;i++){box(back,.67,.95,.03,mat('#b7a17a'),-3.6+i*1.03,1.1+floor*1.7,.32);box(back,.58,.83,.035,schoolPane(floor,i),-3.6+i*1.03,1.1+floor*1.7,.35);box(back,.04,.9,.04,wood,-3.6+i*1.03,1.1+floor*1.7,.38);box(back,.62,.04,.04,wood,-3.6+i*1.03,1.1+floor*1.7,.38);}
// Each magazine is a separate thin 3D prop with its own printed cover. The
// generated atlases supply ORIGINAL artwork; mastheads are added crisply here.
const newsTitles=[
  ['读者','心灵与生活',0,0,'#a66535'],['青年文摘','青春阅读 · 红版',0,1,'#ae433b'],
  ['故事会','民间故事',0,2,'#af4132'],['萌芽','青春文学',0,3,'#315e64'],
  ['科幻世界','幻想文学',0,4,'#326080'],['今古传奇','武侠版',0,5,'#8e4439'],
  ['看电影','影迷读本',1,0,'#2c4265'],['漫友','漫画 100',1,1,'#b54e70'],
  ['我爱摇滚乐','音乐与青年',1,2,'#8d2f2f'],['青年视觉','VISION',1,3,'#74495a'],
  ['奥秘','探索未知',1,4,'#386b5d'],['中国时装','Harper’s BAZAAR',1,5,'#7e3d42'],
  ['ELLE','世界时装之苑',1,3,'#2d3337'],['时尚芭莎','Harper’s BAZAAR',1,5,'#843d47']
];
const newsArt=[new Image(),new Image()],newsCoverRefresh=[];
function newsCover(i){const [title,subtitle,source,cell,accent]=newsTitles[i],c=document.createElement('canvas');c.width=384;c.height=560;const ctx=c.getContext('2d'),tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
  const draw=()=>{ctx.fillStyle='#e8dfcb';ctx.fillRect(0,0,384,560);const img=newsArt[source];if(img.complete&&img.naturalWidth){const cw=img.width/3,ch=img.height/2,cx=(cell%3)*cw,cy=Math.floor(cell/3)*ch;ctx.drawImage(img,cx+3,cy+20,cw-6,Math.min(ch-34,520),0,0,384,560);}ctx.fillStyle=accent;ctx.fillRect(0,0,384,106);ctx.fillStyle='#f5efdb';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(title.length>4?'bold 56px':'bold 72px')+' "Songti SC","PingFang SC",serif';ctx.fillText(title,192,51,368);ctx.font='bold 22px "PingFang SC",sans-serif';ctx.fillText(subtitle,192,90,364);ctx.fillStyle='rgba(20,22,24,.68)';ctx.fillRect(0,516,384,44);ctx.textAlign='left';ctx.fillStyle='#fff1d3';ctx.font='19px sans-serif';ctx.fillText(i===11?'2003 · 08':'2005 · '+String(3+i%5).padStart(2,'0'),14,544);ctx.textAlign='right';ctx.fillText('放学后的阅读',372,544);ctx.strokeStyle='rgba(255,248,224,.65)';ctx.lineWidth=3;ctx.strokeRect(5,5,374,550);tex.needsUpdate=true;};
  newsCoverRefresh.push(draw);draw();return new T.MeshStandardMaterial({map:tex,roughness:.9,side:T.DoubleSide});}
const newsCovers=newsTitles.map((_,i)=>newsCover(i));newsArt.forEach((img,i)=>{img.onload=()=>newsCoverRefresh.forEach(draw=>draw());img.src=texturePath('./textures/fast/newsstand-'+(i?'culture':'literature')+'-art-atlas.webp');});
function newsReverse(i,spine=false){const [title,subtitle,,,accent]=newsTitles[i],c=document.createElement('canvas');c.width=spine?128:384;c.height=560;const q=c.getContext('2d');q.fillStyle=accent;q.fillRect(0,0,c.width,c.height);q.fillStyle='#e7dece';q.fillRect(10,13,c.width-20,c.height-26);q.fillStyle=accent;if(spine){q.fillRect(10,13,c.width-20,70);q.save();q.translate(67,515);q.rotate(-Math.PI/2);q.font='bold 42px "Songti SC",serif';q.textAlign='center';q.fillText(title,245,0,430);q.restore();}else{q.textAlign='center';q.font='bold 36px "Songti SC",serif';q.fillText(title,192,74,345);q.font='22px "Songti SC",serif';q.fillText(subtitle,192,111,340);q.textAlign='left';for(let n=0;n<12;n++){q.fillStyle=n%3?'#887f708f':'#b7aa96';q.fillRect(35,160+n*22,306-(n%4)*31,4);}q.fillStyle='#faf4e8';q.fillRect(215,425,128,78);for(let b=0;b<35;b++){q.fillStyle='#2b2927';q.fillRect(226+b*3,433,b%5===0?3:1,48-(b%4)*3);}q.font='18px sans-serif';q.fillStyle=accent;q.fillText('2005 · 街边读物',35,518);}
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return new T.MeshStandardMaterial({map:tex,roughness:.89});}
const newsBacks=newsTitles.map((_,i)=>newsReverse(i)),newsSpines=newsTitles.map((_,i)=>newsReverse(i,true));
function magazine(parent,x,y,z,i,w=.36,h=.5,angle=0){const g=group(parent,x,y,z,angle);box(g,w,h,.025,[newsSpines[i],newsSpines[i],paperEdge,paperEdge,newsCovers[i],newsBacks[i]],0,0,0);return g;}
function newspaper(parent,x,z,angle=0){const g=group(parent,x,.11,z,angle);for(let i=0;i<5;i++)box(g,.62,.008,.43,mat(i%2?'#d7d0ba':'#e2dbc8'),0,i*.009,0);const paper=label(g,'晚 报',.55,.16,'#e1dbc8','#373b3b',100);paper.rotation.x=-Math.PI/2;paper.position.set(0,.055,.1);box(g,.012,.055,.47,mat('#a38a60'),0,.04,0);return g;}
const newsstand=group(world,6.1,.12,21.0,-.35),newsGreen=mat('#718577',.75,.25),newsTrim=mat('#405951',.63,.4),newsGlass=new T.MeshStandardMaterial({color:'#c7d7cc',metalness:.05,roughness:.16,transparent:true,opacity:.21,depthWrite:false});
box(newsstand,2.5,2.18,1.58,newsGreen,0,1.09,0);box(newsstand,2.72,.18,1.8,newsTrim,0,2.28,-.04);for(let i=0;i<11;i++)box(newsstand,2.65,.018,.024,mat(i%2?'#8ca091':'#567063'),0,2.39,-.75+i*.15);
box(newsstand,2.18,1.28,.035,newsGlass,0,1.46,.81);for(const x of [-1.1,0,1.1])box(newsstand,.035,1.38,.06,newsTrim,x,1.45,.84);for(const y of [.81,1.48,2.15])box(newsstand,2.25,.035,.06,newsTrim,0,y,.84);
box(newsstand,2.58,.12,.78,mat('#b9aa87',.55,.25),0,.87,1.03);box(newsstand,2.55,.03,.85,newsTrim,0,.8,1.04);box(newsstand,.1,1.55,1.3,newsTrim,1.29,1.32,0);box(newsstand,.1,1.55,1.3,newsTrim,-1.29,1.32,0);
label(newsstand,'报 刊 亭',2.25,.34,'#d9d2af','#344d46',124).position.set(0,2.58,.9);label(newsstand,'报纸 · 杂志 · 画报',1.7,.19,'#526b5d','#e4dac0',86).position.set(0,.64,1.29);
for(let row=0;row<2;row++){const rail=box(newsstand,2.22,.035,.14,newsTrim,0,1.18+row*.58,1.02);for(let j=0;j<5;j++){const i=row*5+j;magazine(newsstand,-.84+j*.42,1.42+row*.58,1.11+(j%2)*.008,i,.34,.48,(j-2)*.017);}}
const sideRack=group(newsstand,-1.36,0,.08,-Math.PI/2);for(let j=0;j<5;j++){const top=j<3,col=top?j:j-3,x=top?-.5+col*.5:-.25+col*.5,y=top?1.8:1.15;box(sideRack,.39,.035,.12,newsTrim,x,y-.3,.02);magazine(sideRack,x,y,.095,9+j,.35,.48);}
for(let i=0;i<3;i++)newspaper(newsstand,-.72+i*.53,1.08+i*.02,-.05+i*.05);box(newsstand,.2,.045,.18,brass,.82,.95,.94);fixture(newsstand,0,2.03,.58,'#ffe0ad',5,'street');
// Food cart: modeled stove, wheels, pots, skewers, canvas and lights.
function cart(x,z,color){const g=group(world,x,.1,z,-.12);box(g,1.8,.8,.85,mat(color),0,.67,0);box(g,1.9,.08,.95,mat('#aaa598',.35,.5),0,1.1,0);label(g,'热 烤 串  ·  凉 面',1.65,.48,color,'#efdbb4',72).position.set(0,.65,.44);for(const a of [-.65,.65]){const wheel=mesh(g,new T.TorusGeometry(.22,.05,6,16),iron,a,.25,.35);}for(const a of [-.8,.8])for(const b of [-.35,.35])rod(g,[a,1.1,b],[a,2.05,b],.026);for(let i=0;i<10;i++)box(g,.2,.055,1.3,mat(i%2?color:'#c9b797'),-.9+i*.2,2.1,0);for(const a of [-.48,.28]){cyl(g,.22,.25,mat('#a3a9a5',.3,.8),a,1.27,0);cyl(g,.19,.01,mat('#7a5131'),a,1.4,0);}for(let i=0;i<8;i++){rod(g,[-.65+i*.13,1.17,.25],[-.65+i*.13,1.17,.57],.008,wood);orb(g,.04,mat('#bd7041'),-.65+i*.13,1.19,.36);}fixture(g,0,1.96,0,'#ffd491',9);stool(g,1.3,.3);return g;}
const soupStall=district.stall(world,-5.7,16.4,'soup');
const friedStall=district.stall(world,-8.8,18.5,'fried');
const streetDetails=group(world);
// Pavement repair, rainwater channels and utilities give the street a continuous ground plane.
// Asphalt wear is supplied by the scanned surface, not repeated polygon spots.
for(const side of [-1,1])for(let i=0;i<42;i++){const p=path.getPointAt(i/42),v=path.getTangentAt(i/42);const n=new T.Vector3(v.z,0,-v.x);const channel=group(streetDetails,p.x+n.x*side*2.82,.04,p.z+n.z*side*2.82,Math.atan2(v.x,v.z));box(channel,.15,.025,.7,mat('#645f57'),0,0,0);if(i%7===0)for(let j=0;j<7;j++)box(channel,.18,.018,.022,iron,0,.025,-.26+j*.08);}
function bench(x,z,angle=0){const g=group(streetDetails,x,.1,z,angle);for(let i=0;i<4;i++)box(g,1.65,.06,.1,timber,0,.48,-.18+i*.12);for(let i=0;i<3;i++)box(g,1.65,.1,.045,timber,0,.75+i*.13,-.25);for(const xx of [-.62,.62]){rod(g,[xx,0,-.2],[xx,.98,-.25],.035,iron);rod(g,[xx,.45,.2],[xx,0,.25],.035,iron);}return g;}
bench(-4.1,-7.9,.3);bench(4.1,-7.9,-.3);bench(-4,20.2,-.22);
for(const [x,z] of [[-4,14.6],[-10,16.5],[3.7,18.6]]){const g=group(streetDetails,x,.1,z);box(g,.52,.8,.5,mat('#526459'),0,.4,0);box(g,.57,.08,.54,iron,0,.83,0);box(g,.37,.14,.025,darkMaterial(),0,.66,.26);}
function darkMaterial(){return mat('#303d38');}
// Brick boundary with coping, irregular planted strips and railings near the food stalls.
for(const side of [-1,1])for(let i=0;i<18;i++){const z=-12+i*1.7;box(streetDetails,.25,.52,1.65,mat(i%3?'#8b7664':'#9a856e'),side*11.8,.35,z);box(streetDetails,.34,.08,1.69,pavement,side*11.8,.65,z);if(i%3===0)plant(streetDetails,side*11.2,.12,z,.75);}
for(const x of [-4.25,4.25]){for(let i=0;i<6;i++)rod(streetDetails,[x,.2,16+i*.65],[x,.85,16+i*.65],.028,iron);rod(streetDetails,[x,.85,16],[x,.85,19.25],.035,iron);}
const plaza=box(streetDetails,5.7,.06,3.0,pavement,0,.12,-10.5);
for(let i=0;i<8;i++)box(streetDetails,.025,.012,2.9,mat('#7b776e'),-2.5+i*.7,.16,-10.5);
for(const [side,title] of [[-1,'← 小卖部'],[1,'擀面皮 →']]){const way=group(streetDetails,side*3.34,.15,-10.55);rod(way,[0,0,0],[0,1.55,0],.028,iron);label(way,title,1.35,.25,'#667b68','#f4e9c8',80).position.set(side*.2,1.47,.04);}
// The school flag stands on the centreline inside the gate, not on either
// side of the public pavement. Its five stars are crisp code-drawn cloth art.
const flagCanvas=document.createElement('canvas');flagCanvas.width=600;flagCanvas.height=400;
const flagInk=flagCanvas.getContext('2d');flagInk.fillStyle='#de2910';flagInk.fillRect(0,0,600,400);
function flagStar(cx,cy,r,angle){flagInk.beginPath();for(let i=0;i<10;i++){const a=angle+i*Math.PI/5,rr=i%2?r*.382:r,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;i?flagInk.lineTo(x,y):flagInk.moveTo(x,y);}flagInk.closePath();flagInk.fill();}
flagInk.fillStyle='#ffde00';flagStar(100,100,60,-Math.PI/2);
for(const [x,y] of [[200,40],[240,80],[240,140],[200,180]])flagStar(x,y,20,Math.atan2(100-y,100-x));
const flagMap=new T.CanvasTexture(flagCanvas);flagMap.colorSpace=T.SRGBColorSpace;flagMap.anisotropy=8;
box(streetDetails,4.05,.035,2.5,pavement,0,.065,-13.75);
const flag=group(streetDetails,0,.1,-13.9);rod(flag,[0,0,0],[0,4.85,0],.034,steelMaterial());
const cloth=mesh(flag,new T.PlaneGeometry(1.08,.72,8,4),new T.MeshStandardMaterial({map:flagMap,roughness:.95,side:T.DoubleSide}),.54,4.35,0);
const flagPos=cloth.geometry.attributes.position;for(let i=0;i<flagPos.count;i++){const x=flagPos.getX(i),y=flagPos.getY(i);flagPos.setZ(i,.018*Math.sin(x*7+y*4)*(x+.54));}cloth.geometry.computeVertexNormals();cloth.castShadow=true;
cyl(flag,.28,.13,pavement,0,.07,0);
function steelMaterial(){return mat('#9ba5a2',.35,.65);}
// Rain and seasonal dressing are separate so every mode can restore them cleanly.
const puddles=group(world);for(let i=0;i<16;i++){const p=path.getPointAt((i+.5)/17);const m=mesh(puddles,new T.CircleGeometry(.24+rand()*.35,14),new T.MeshStandardMaterial({color:'#829398',metalness:.35,roughness:.13,transparent:true,opacity:.48}),p.x+(i%2?2.1:-2.1),.055,p.z);m.rotation.x=-Math.PI/2;m.scale.y=.4;}
const fallenLeaves=group(world);for(let i=0;i<150;i++){const p=path.getPointAt(rand());const leaf=mesh(fallenLeaves,new T.CircleGeometry(.035+rand()*.025,5),mat(['#ad7442','#c39755','#9f5a35'][i%3]),p.x+(i%2?1:-1)*(2.7+rand()*.4),.065,p.z);leaf.rotation.set(-Math.PI/2,0,rand()*6.28);}
// Road objects and living details.
for(const p of [[-3.6,8],[3,2],[-3,-5]]){const g=group(world,p[0],0,p[1]);cyl(g,.1,.8,mat('#bfab7b'),0,.4,0);for(let i=0;i<3;i++)cyl(g,.105,.12,mat('#4b4c43'),0,.17+i*.24,0);}
const drain=group(world,1,.06,9.2);cyl(drain,.46,.025,iron,0,0,0,.46,32);for(let i=-3;i<=3;i++)box(drain,.65,.012,.025,mat('#74726a'),0,.022,i*.09);
for(const p of [[-3.7,3],[3.2,8]]){const g=group(world,p[0],.08,p[1]);box(g,.45,.03,.8,iron);for(let i=0;i<7;i++)box(g,.38,.02,.035,mat('#807b6d'),0,.025,-.32+i*.1);}

// Merge each visibility layer separately: dense books/keys remain affordable,
// while a facade can still be removed atomically without touching room furniture.
function batch(g){g.updateWorldMatrix(true,true);const inverse=g.matrixWorld.clone().invert(),buckets=new Map(),remove=[];g.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.dynamic||Array.isArray(o.material))return;const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,{material:o.material,geos:[]});const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));buckets.get(key).geos.push(geo);remove.push(o);});for(const o of remove)o.removeFromParent();for(const bucket of buckets.values()){const geo=mergeGeometries(bucket.geos,false);if(geo){const m=mesh(g,geo,bucket.material);m.userData.batched=true;}for(const part of bucket.geos)part.dispose();}}
// Instance foliage, then batch opaque geometry independently for each cutaway layer.
const seasonalTrees=group(world),foliageBatches=[],leafGroups=new Map();world.updateMatrixWorld(true);
for(const leaf of foliage){const key=leaf.material.uuid+leaf.geometry.uuid;if(!leafGroups.has(key))leafGroups.set(key,[]);leafGroups.get(key).push(leaf);}
for(const leaves of leafGroups.values()){const inst=new T.InstancedMesh(leaves[0].geometry,leaves[0].material.clone(),leaves.length);leaves.forEach((leaf,i)=>{inst.setMatrixAt(i,leaf.matrixWorld);leaf.removeFromParent();});inst.userData.deciduous=!!leaves[0].userData.deciduous;inst.castShadow=true;inst.receiveShadow=true;seasonalTrees.add(inst);foliageBatches.push(inst);}
for(const s of stores.values()){for(const f of s.floors){batch(f.shell);batch(f.front);batch(f.inside);batch(f.roof);}batch(s.outside);}
for(const g of world.children){if(g.isGroup&&!g.userData.id&&g!==seasonalTrees&&g!==puddles&&g!==fallenLeaves)batch(g);}

const particleCount=800,positions=new Float32Array(particleCount*3);for(let i=0;i<particleCount;i++){positions[i*3]=(rand()-.5)*28;positions[i*3+1]=rand()*15;positions[i*3+2]=(rand()-.5)*40+3;}
const snowSprite=texture((c,s)=>{c.clearRect(0,0,s,s);const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s*.47);g.addColorStop(0,'#ffffff');g.addColorStop(.28,'#fffffff0');g.addColorStop(.65,'#ffffff80');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,s,s);},64);
const pgeo=new T.BufferGeometry();pgeo.setAttribute('position',new T.BufferAttribute(positions,3));
const flakeSizes=new Float32Array(particleCount);for(let i=0;i<particleCount;i++)flakeSizes[i]=.45+rand()*1.1;pgeo.setAttribute('flakeSize',new T.BufferAttribute(flakeSizes,1));
const pmat=new T.PointsMaterial({map:snowSprite,color:'#f2f4f7',size:.11,sizeAttenuation:true,transparent:true,opacity:.9,alphaTest:.035,depthWrite:false});
pmat.onBeforeCompile=shader=>{shader.vertexShader='attribute float flakeSize;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('gl_PointSize = size;','gl_PointSize = size * flakeSize;');};
const precipitation=new T.Points(pgeo,pmat);scene.add(precipitation);
const rainVertices=new Float32Array(particleCount*6),rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainVertices,3));const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:'#b8d0db',transparent:true,opacity:.35,depthWrite:false}));scene.add(rain);
function syncDressing(){puddles.visible=state.weather==='rain'&&!state.open;fallenLeaves.visible=state.season==='autumn'&&!state.open;rain.visible=state.weather==='rain'&&!state.open;}
const skyCanvas=document.createElement('canvas');skyCanvas.width=32;skyCanvas.height=512;const skyTex=new T.CanvasTexture(skyCanvas);skyTex.colorSpace=T.SRGBColorSpace;scene.background=skyTex;
function atmosphere(){
  const a=lightingAt(state.time,state.weather),{day,dusk,night}=a;
  canvas.dataset.sunIntensity=a.sun.toFixed(3);canvas.dataset.ambientIntensity=a.ambient.toFixed(3);canvas.dataset.weather=state.weather;
  const blend=(d,e,n)=>new T.Color(d).multiplyScalar(day).add(new T.Color(e).multiplyScalar(dusk)).add(new T.Color(n).multiplyScalar(night));
  const top=blend('#8daac1','#595178','#050b1b'),bottom=blend('#d9e0df','#d9a08b','#162139');
  const tint=({mint:'#6e9f9d',film:'#ba9b7c',violet:'#827aab'})[state.palette];
  if(tint){top.lerp(new T.Color(tint).multiplyScalar(1-night*.9),.16);bottom.lerp(new T.Color(tint).multiplyScalar(1-night*.87),.14);}
  if(a.overcast){top.lerp(new T.Color('#73808b').multiplyScalar(1-night*.96),.58);bottom.lerp(new T.Color('#a4adb3').multiplyScalar(1-night*.94),.6);}
  const ctx=skyCanvas.getContext('2d'),gr=ctx.createLinearGradient(0,0,0,512);gr.addColorStop(0,top.getStyle());gr.addColorStop(1,bottom.getStyle());ctx.fillStyle=gr;ctx.fillRect(0,0,32,512);skyTex.needsUpdate=true;
scene.fog=new T.Fog(bottom,a.overcast?35:55,a.overcast?85:125);shadowFloor.material.color.copy(top).multiplyScalar(.5);
  ambient.intensity=a.ambient;ambient.color.set(night>.5?'#93a9d5':'#b7c8df');ambient.groundColor.set(night>.5?'#242c43':'#716b66');
sun.intensity=a.sun;sun.color.set(day>.5?'#fff0dc':'#ffc89b');sun.position.set(-18,10+day*20,8+day*6);sun.castShadow=night<.95;
  fill.intensity=a.fill;fill.color.set('#91a9dd');renderer.toneMappingExposure=a.exposure;bloom.strength=a.bloom;
  for(const l of lamps){const on=l.type==='street'?state.street:state.lights;l.light.intensity=on?l.power*a.lamps:0;l.bulb.visible=on;l.halo.visible=on;l.halo.material.opacity=on?.04*day+.22*dusk+.32*night:0;}
  for(const w of litWindows){w.material.emissiveIntensity=state.lights?a.windowGlow*w.power:0;w.material.color.set(night>.5?'#253043':'#a8b1ab');}
  for(const s of litSigns){s.material.emissiveIntensity=state.lights?s.power*(.08*day+.8*dusk+1.4*night):0;if(s.light)s.light.intensity=state.lights?3*a.lamps:0;}
  for(const update of weatherMaterials)update(state.weather);
const visited=new Set();scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(visited.has(m))continue;visited.add(m);if(m.isMeshStandardMaterial)m.envMapIntensity=.5*day+.14*dusk+.035*night;}});
  precipitation.visible=state.weather==='snow'&&!state.open;pmat.color.set(night>.5?'#8193b5':'#f0f5ff');pmat.opacity=night>.5?.68:.9;
  syncDressing();document.querySelector('#timeValue').textContent=a.label;
  if(!state.store&&!streetMode&&document.querySelector('#sceneName').textContent==='放学后的校门口')document.querySelector('#sceneEyebrow').textContent='2005 · '+a.label;
  document.querySelectorAll('#timeCtrl button').forEach(b=>b.classList.toggle('selected',b.dataset.value===(day>.5?'day':night>.5?'night':'dusk')));
  document.querySelector('#weatherReadout').textContent=({clear:'晴天',cloudy:'阴天',rain:'下雨',snow:'下雪'})[state.weather]+' · '+(day>.5?'白天':night>.5?'夜晚':'黄昏');
  barberMirrorCaptured=false;
  syncSoundscape();
}
function season(){const cols={spring:['#587748','#77905b','#8d9b61'],summer:['#3f6547','#547447','#6b814f'],autumn:['#a8733e','#b3904c','#9c5e3c'],winter:['#718077','#89928a','#a0a99e']}[state.season];foliageBatches.forEach((o,i)=>{o.material.color.set(cols[i%3]);o.visible=state.season!=='winter'||!o.userData.deciduous;});syncDressing();document.querySelector('#seasonValue').textContent=({spring:'春 · 新芽',summer:'夏 · 浓荫',autumn:'秋 · 金叶',winter:'冬 · 枝寒'})[state.season];syncSoundscape();}
const environmentObjects=world.children.filter(o=>!o.userData.id&&o!==base&&o!==ground);
function syncVisibility(){base.visible=ground.visible=shadowFloor.visible=!state.open;for(const o of environmentObjects)o.visible=!state.open;for(const s of stores.values()){const selected=s.id===state.store;s.root.visible=!state.open||selected;s.outside.visible=!state.open;for(let i=0;i<s.floors.length;i++){const f=s.floors[i];f.floor.visible=!state.open||i===state.floor;f.front.visible=!state.open;f.roof.visible=!state.open;}}for(const m of barberMirrors)m.visible=state.open&&state.store==='barber'&&state.floor===0;barberStudent.visible=false;barberStudent.material.opacity=0;barberMirrorCaptured=false;for(const l of lamps){let visible=true,p=l.light;while(p){if(!p.visible){visible=false;break;}p=p.parent;}l.light.castShadow=state.open&&visible&&l.type==='room';if(l.light.castShadow){l.light.shadow.mapSize.set(512,512);l.light.shadow.bias=-.001;l.light.shadow.normalBias=.025;}}precipitation.visible=state.weather==='snow'&&!state.open;syncDressing();syncSoundscape();}
function setCamera(pos,target){controls.enableDamping=false;camera.position.copy(pos);controls.target.copy(target);controls.update();controls.enableDamping=true;}
let streetMode=false;
function hideWalkControls(){walkKeys.clear();document.querySelector('#viewCtrl [data-value="front"]').textContent='到店门口';controls.enabled=true;camera.fov=39;camera.updateProjectionMatrix();document.querySelector('#walkCtrl').hidden=true;document.querySelector('#lookCtrl').hidden=true;}
function exterior(){streetMode=false;state.open=false;state.store=null;state.floor=0;hideWalkControls();controls.minDistance=13;controls.maxDistance=70;controls.maxPolarAngle=1.45;syncVisibility();setCamera(new T.Vector3(8,34,50),new T.Vector3(0,2,3.0));document.querySelector('#sceneName').textContent='放学后的校门口';document.querySelector('#sceneEyebrow').textContent='2005 · '+lightingAt(state.time,state.weather).label;document.querySelector('#sceneCaption').textContent='拖动旋转 · 滚轮缩放 · 点击店铺';syncUI();}
function focusStorefront(id){const s=stores.get(id);if(!s)return;streetMode=false;state.open=false;state.store=id;state.floor=0;hideWalkControls();controls.minDistance=1.7;controls.maxDistance=45;controls.maxPolarAngle=1.48;syncVisibility();const target=new T.Vector3(0,1.65,s.d/2+.15),pos=new T.Vector3(.3,4.1,s.d/2+6);s.root.updateMatrixWorld(true);s.root.localToWorld(target);s.root.localToWorld(pos);setCamera(pos,target);document.querySelector('#sceneName').textContent=s.name.replace('☆ ','');document.querySelector('#sceneEyebrow').textContent='店前街景 · 可沿人行道靠近';document.querySelector('#sceneCaption').textContent='拖动看店门 · 点击「一层」进入室内';syncUI();}
function enter(id,level=0){const s=stores.get(id);if(!s)return;streetMode=false;state.store=id;state.floor=Math.min(level,s.levels-1);state.open=true;hideWalkControls();controls.minDistance=3;controls.maxDistance=25;controls.maxPolarAngle=1.46;syncVisibility();const y=state.floor*3.3;const position=new T.Vector3(.7,y+4.6,s.d/2+6.3);const target=new T.Vector3(0,y+1.35,-.2);s.root.updateMatrixWorld(true);s.root.localToWorld(position);s.root.localToWorld(target);setCamera(position,target);document.querySelector('#sceneName').textContent=s.name.replace('☆ ','');document.querySelector('#sceneEyebrow').textContent='临街立面展开 · '+(level?'二层':'一层');document.querySelector('#sceneCaption').textContent='墙面、门窗、雨棚、屋顶已移开 · 点击屏幕换台';syncUI();soundscape.playEffect('door');}
function focusNewsstand(){exterior();controls.minDistance=1.3;controls.maxDistance=35;newsstand.updateWorldMatrix(true,false);setCamera(newsstand.localToWorld(new T.Vector3(.5,2.5,5)),newsstand.localToWorld(new T.Vector3(0,1.5,.5)));document.querySelector('#sceneName').textContent='街口报刊亭';document.querySelector('#sceneEyebrow').textContent='2003–2005 · 街边报刊';document.querySelector('#sceneCaption').textContent='街口买一本杂志，再慢慢走向学校';}
function focusNewsstandSide(){exterior();controls.minDistance=1.3;controls.maxDistance=35;newsstand.updateWorldMatrix(true,false);setCamera(newsstand.localToWorld(new T.Vector3(-5,2.3,1)),newsstand.localToWorld(new T.Vector3(-1.2,1.5,0)));document.querySelector('#sceneName').textContent='报刊亭侧架';document.querySelector('#sceneEyebrow').textContent='2003–2005 · 杂志侧架';document.querySelector('#sceneCaption').textContent='青年视觉 · 奥秘 · ELLE · 中国时装 / 时尚芭莎';}
function focusStall(stall,title){exterior();controls.minDistance=1.1;controls.maxDistance=25;stall.updateWorldMatrix(true,false);setCamera(stall.localToWorld(new T.Vector3(1.25,2.25,3.6)),stall.localToWorld(new T.Vector3(0,1.16,0)));document.querySelector('#sceneName').textContent=title;document.querySelector('#sceneEyebrow').textContent='街边小摊 · 近看食材';document.querySelector('#sceneCaption').textContent='拖动旋转 · 观察托盘与独立食材模型';}
function syncUI(){document.querySelector('#openBuilding').checked=state.open;document.querySelector('#floorValue').textContent=state.open?(state.floor?'二层室内':'一层室内'):'街区总览';document.querySelector('#viewCtrl [data-value="near"]').textContent=state.store==='fashion'?'近看鞋架':'近看细节';document.querySelectorAll('#floorCtrl button').forEach(b=>{b.classList.toggle('selected',b.dataset.value===(state.open?(state.floor?'upper':'ground'):'outside'));b.disabled=b.dataset.value==='upper'&&state.open&&stores.get(state.store).levels<2;});document.querySelectorAll('.scene-tab').forEach(b=>b.classList.toggle('active',b.dataset.scene===(state.store||'block')));}
function toast(text){const e=document.querySelector('#toast');e.textContent=text;e.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('show'),2200);}
function segment(id,fn){document.querySelectorAll('#'+id+' button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#'+id+' button').forEach(a=>{a.classList.remove('selected','active');});b.classList.add(id==='paletteCtrl'?'active':'selected');fn(b.dataset.value);});}
segment('viewCtrl',v=>{if(v==='next'){const ids=definitions.map(d=>d.id);enter(ids[(ids.indexOf(state.store)+1)%ids.length]);return;}if(v==='front'){if(streetMode){streetView(4);return;}if(state.store)focusStorefront(state.store);else{exterior();controls.minDistance=2;setCamera(new T.Vector3(0,27,-4),new T.Vector3(0,0,-12));document.querySelector('#sceneName').textContent='校门后街';document.querySelector('#sceneCaption').textContent='两侧步道通往小卖部与汉中擀面皮';}return;}if(!state.store){if(v==='above')exterior();else{exterior();controls.minDistance=1.5;setCamera(new T.Vector3(0,2.1,20),new T.Vector3(0,1.8,-8));}return;}const s=stores.get(state.store),y=state.floor*3.3;if(state.store==='fashion'&&v==='near'){controls.minDistance=.75;const shoeEye=new T.Vector3(1.10,y+1.85,1.63),shoeTarget=new T.Vector3(s.w/2-.20,y+1.12,.08);s.root.localToWorld(shoeEye);s.root.localToWorld(shoeTarget);setCamera(shoeEye,shoeTarget);document.querySelector('#sceneCaption').textContent='右侧鞋架 · 拖动或滚轮细看 Blender 帆布鞋';return;}const pos=v==='above'?new T.Vector3(.2,y+9.5,2.2):new T.Vector3(.7,y+2.7,s.d/2+3.8),target=new T.Vector3(0,y+1.25,-.35);s.root.localToWorld(pos);s.root.localToWorld(target);setCamera(pos,target);});
let streetStep=0,walkT=0,walkTarget=0,walkYaw=0,walkPitch=0;const walkKeys=new Set(),walkEnd=.90,routeLength=path.getLength();
function lookFromGate(which='gate'){walkT=walkTarget=walkEnd;const eye=path.getPointAt(walkT);eye.y=1.8;let target=new T.Vector3(0,2.2,-12.4);if(which==='shop'||which==='mianpi'){const s=stores.get(which);target=s.root.localToWorld(new T.Vector3(0,1.68,s.d/2+.3));}const tangent=path.getTangentAt(walkT);walkYaw=Math.atan2(target.x-eye.x,target.z-eye.z)-Math.atan2(tangent.x,tangent.z);walkPitch=Math.atan2(target.y-eye.y,Math.hypot(target.x-eye.x,target.z-eye.z));document.querySelectorAll('#lookCtrl button').forEach(b=>b.classList.toggle('selected',b.dataset.look===which));updateWalking(0);}
function streetView(step=0){if(!streetMode){exterior();streetMode=true;walkT=walkTarget=0;walkYaw=walkPitch=0;}document.querySelector('#viewCtrl [data-value="front"]').textContent='走到校门';controls.enabled=false;camera.fov=65;camera.updateProjectionMatrix();if(step===4)walkTarget=walkEnd;document.querySelector('#walkCtrl').hidden=false;document.querySelector('#sceneEyebrow').textContent='步行 · 拖动环顾';document.querySelector('#sceneCaption').textContent=mobileDevice?'在下方点前进/后退 · 拖动画面看四周':'W/S 或 ↑/↓ 行走 · 拖动看四周 · 按 Esc 返回鸟瞰';document.querySelectorAll('.scene-tab').forEach(b=>b.classList.toggle('active',b.dataset.scene==='street'));if(matchMedia('(max-width:680px)').matches)document.querySelector('.panel').scrollTo({top:0,behavior:'smooth'});updateWalking(0);}
function updateWalking(dt){if(!streetMode)return;const direction=(walkKeys.has('w')||walkKeys.has('ArrowUp')?1:0)-(walkKeys.has('s')||walkKeys.has('ArrowDown')?1:0);if(direction)walkTarget=T.MathUtils.clamp(walkT+direction*2.2*dt/routeLength,0,walkEnd);const distance=walkTarget-walkT;if(Math.abs(distance)>.0001&&walkT>walkEnd-.03)walkPitch=.06;walkT+=Math.sign(distance)*Math.min(Math.abs(distance),2.2*dt/routeLength);const p=path.getPointAt(walkT),v=path.getTangentAt(walkT),angle=Math.atan2(v.x,v.z)+walkYaw;camera.position.set(p.x,1.8,p.z);const target=new T.Vector3(p.x+Math.sin(angle)*Math.cos(walkPitch),1.8+Math.sin(walkPitch),p.z+Math.cos(angle)*Math.cos(walkPitch));camera.lookAt(target);controls.target.copy(target);const atGate=walkT>walkEnd-.006,targetFov=atGate?78:65;if(camera.fov!==targetFov){camera.fov=targetFov;camera.updateProjectionMatrix();}document.querySelector('#sceneName').textContent=atGate?'校门前':'沿街浏览';document.querySelector('#walkStep').textContent=atGate?'已到校门前':'距校门 '+Math.round((walkEnd-walkT)*routeLength)+' 米';document.querySelector('#walkBack').disabled=walkT<=0;document.querySelector('#walkForward').disabled=atGate;document.querySelector('#lookCtrl').hidden=!atGate;}
document.querySelector('#walkBack').onclick=()=>{walkTarget=Math.max(0,walkT-4/routeLength);};
document.querySelector('#walkForward').onclick=()=>{walkTarget=Math.min(walkEnd,walkTarget+4/routeLength);};
window.addEventListener('keydown',e=>{if(streetMode&&['w','s','ArrowUp','ArrowDown'].includes(e.key)&&!['INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();walkKeys.add(e.key);}});
window.addEventListener('keyup',e=>walkKeys.delete(e.key));window.addEventListener('blur',()=>walkKeys.clear());
let walkDrag=null;canvas.addEventListener('pointerdown',e=>{if(streetMode)walkDrag=[e.clientX,e.clientY,walkYaw,walkPitch];});canvas.addEventListener('pointermove',e=>{if(streetMode&&walkDrag&&e.buttons){walkYaw=walkDrag[2]-(e.clientX-walkDrag[0])*.004;walkPitch=T.MathUtils.clamp(walkDrag[3]-(e.clientY-walkDrag[1])*.004,-.85,.85);}});window.addEventListener('pointerup',()=>walkDrag=null);
document.querySelectorAll('#lookCtrl button').forEach(b=>b.onclick=()=>b.dataset.look==='newsstand'?focusNewsstand():lookFromGate(b.dataset.look));
document.querySelector('#newsstandBtn').onclick=focusNewsstand;
document.querySelector('#newsstandSideBtn').onclick=focusNewsstandSide;
document.querySelector('#soupStallBtn').onclick=()=>focusStall(soupStall,'麻辣烫摊');
document.querySelector('#friedStallBtn').onclick=()=>focusStall(friedStall,'炸串摊');
document.querySelectorAll('.scene-tab').forEach(b=>b.onclick=()=>{if(b.dataset.scene==='block')exterior();else if(b.dataset.scene==='street')streetView(0);else if(streetMode)focusStorefront(b.dataset.scene);else enter(b.dataset.scene);});
segment('seasonCtrl',v=>{state.season=v;season();});segment('weatherCtrl',v=>{state.weather=v;document.querySelector('#weatherValue').textContent=({clear:'晴天',cloudy:'阴天',rain:'下雨',snow:'下雪'})[v];atmosphere();});segment('timeCtrl',v=>{state.time=({day:15,dusk:58,night:95})[v];document.querySelector('#timeSlider').value=state.time;atmosphere();});segment('floorCtrl',v=>{if(v==='outside')exterior();else if(state.store)enter(state.store,v==='upper'?1:0);else enter('bookshop',v==='upper'?1:0);});segment('paletteCtrl',v=>{state.palette=v;document.querySelector('#app').dataset.palette=v;document.querySelector('#paletteValue').textContent=({dream:'梦核黄昏',mint:'薄荷蓝调',film:'胶片暖黄',violet:'冬夜紫'})[v];atmosphere();});
document.querySelector('#timeSlider').oninput=e=>{state.time=+e.target.value;atmosphere();};document.querySelector('#openBuilding').onchange=e=>e.target.checked?enter(state.store||'bookshop',state.floor):exterior();
for(const [id,key] of [['lightsToggle','lights'],['screensToggle','screens'],['streetToggle','street']])document.querySelector('#'+id).onchange=e=>{state[key]=e.target.checked;if(key==='screens')for(const source of customScreens.tv)if(source.tagName==='VIDEO'){if(state.screens)source.play().catch(()=>{});else source.pause();}atmosphere();drawScreens(performance.now());};
document.querySelector('#resetBtn').onclick=()=>{Object.assign(state,{season:'spring',time:58,weather:'clear',palette:'dream',lights:true,screens:true,street:true});for(const id of ['lightsToggle','screensToggle','streetToggle'])document.querySelector('#'+id).checked=true;document.querySelector('#seasonCtrl button[data-value="spring"]').click();document.querySelector('#weatherCtrl button[data-value="clear"]').click();document.querySelector('#timeCtrl button[data-value="dusk"]').click();document.querySelector('#paletteCtrl button[data-value="dream"]').click();exterior();};
const audioStartBtn=document.querySelector('#audioStartBtn'),audioStatus=document.querySelector('#audioStatus');
function updateAudioUI(){const playing=soundscape.isPlaying();audioStartBtn.textContent=playing?'♫ 暂停声音':'♪ 开启声音';audioStartBtn.classList.toggle('playing',playing);audioStatus.textContent=playing?'正在播放':'点击开启声音';}
if(!soundscape.available){audioStartBtn.disabled=true;audioStatus.textContent='浏览器不支持声音';}
audioStartBtn.onclick=async()=>{if(soundscape.isPlaying())await soundscape.pause();else if(!await soundscape.start()){audioStatus.textContent='无法播放，请检查浏览器声音权限';return;}updateAudioUI();};
for(const [toggle,volume,key] of [['musicToggle','musicVolume','music'],['ambienceToggle','ambienceVolume','ambience'],['effectsToggle','effectsVolume','effects']]){
  document.querySelector('#'+toggle).onchange=e=>soundscape.setOptions({[key]:e.target.checked});
  document.querySelector('#'+volume).oninput=e=>soundscape.setOptions({[key+'Volume']:+e.target.value/100});
}
document.querySelectorAll('#seasonCtrl button,#weatherCtrl button,#timeCtrl button,#viewCtrl button,.scene-tab').forEach(b=>b.addEventListener('click',()=>soundscape.playEffect('tap')));
const download=(blob,name)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
document.querySelector('#shotBtn').onclick=()=>{soundscape.playEffect('shutter');renderer.render(scene,camera);canvas.toBlob(b=>download(b,'放学以后_模型截图.webp'));toast('场景截图已导出');};
let recorder=null,stream=null,videoStream=null;
document.querySelector('#recordBtn').onclick=()=>{
  if(recorder&&recorder.state==='recording'){recorder.stop();return;}
  if(!canvas.captureStream||!window.MediaRecorder){toast('此浏览器不支持录屏');return;}
  videoStream=canvas.captureStream(30);
  const audioStream=soundscape.getRecordStream();
  stream=new MediaStream([...videoStream.getVideoTracks(),...(audioStream?audioStream.getAudioTracks():[])]);
  const hasAudio=!!audioStream;
  const candidates=hasAudio?['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4']:['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'];
  const mime=candidates.find(t=>MediaRecorder.isTypeSupported(t));
  try{recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});}
  catch{stream=videoStream;const videoMime=['video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));try{recorder=new MediaRecorder(stream,videoMime?{mimeType:videoMime}:{});}catch{videoStream.getTracks().forEach(t=>t.stop());toast('此浏览器无法启动录屏');return;}}
  const recordingWithAudio=stream.getAudioTracks().length>0;
  const chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=()=>{
    download(new Blob(chunks,{type:recorder.mimeType}),'放学以后_场景录屏.'+(recorder.mimeType.includes('mp4')?'mp4':'webm'));
    videoStream.getTracks().forEach(t=>t.stop());
    document.querySelector('#recordLabel').textContent='录屏';document.querySelector('#recordBtn').classList.remove('recording');
    toast('录屏已导出'+(recordingWithAudio?'（含场景声音）':''));
  };
  recorder.start();soundscape.playEffect('tap');
  document.querySelector('#recordLabel').textContent='停止';document.querySelector('#recordBtn').classList.add('recording');
};
for(const id of ['closeHelp','gotIt'])document.querySelector('#'+id).onclick=()=>document.querySelector('#helpModal').classList.add('hidden');document.querySelector('#helpBtn').onclick=()=>document.querySelector('#helpModal').classList.remove('hidden');
const gameStill=new Image(),tvStill=new Image();gameStill.src=texturePath('./textures/fast/fictional-cyber-screens-v1.webp');tvStill.src=texturePath('./textures/fast/fictional-tv-stills-v1.webp');
const customScreens={tv:[],game:[]},customUrls={tv:[],game:[]};
const videoMimeByExtension={mp4:'video/mp4',m4v:'video/mp4',mov:'video/quicktime',webm:'video/webm',ogv:'video/ogg'};
const imageExtensions=/\.(avif|bmp|gif|jpe?g|png|webp)$/i;
function mediaFileType(file){
  const extension=(file.name.split('.').pop()||'').toLowerCase();
  if(file.type.startsWith('video/'))return {kind:'video',mime:file.type};
  if(videoMimeByExtension[extension])return {kind:'video',mime:videoMimeByExtension[extension]};
  if(file.type.startsWith('image/')||imageExtensions.test(file.name))return {kind:'image',mime:file.type};
  return null;
}
for(const [kind,button,input,mediaKind] of [['tv','importTvVideoBtn','tvVideoFiles','video'],['tv','importTvImageBtn','tvImageFiles','image'],['game','importGameBtn','gameFiles','image']]){
  document.querySelector('#'+button).onclick=()=>document.querySelector('#'+input).click();
  document.querySelector('#'+input).onchange=e=>{
    const keptScreens=[],keptUrls=[];
    customScreens[kind].forEach((source,index)=>{
      const sourceKind=source.tagName==='VIDEO'?'video':'image';
      if(kind==='tv'&&sourceKind!==mediaKind){keptScreens.push(source);keptUrls.push(customUrls[kind][index]);}
      else{if(source.tagName==='VIDEO')source.pause();URL.revokeObjectURL(customUrls[kind][index]);}
    });
    customScreens[kind]=keptScreens;customUrls[kind]=keptUrls;
    const files=[...e.target.files],rejected=[];
    if(!files.length){e.target.value='';return;}
    for(const file of files.slice(0,8)){
      if(kind==='tv'&&file.size>10*1024*1024){rejected.push(file.name+' 超过 10 MB');continue;}
      const type=mediaFileType(file),isVideo=kind==='tv'&&type?.kind==='video';
      if(!type||type.kind!==mediaKind){rejected.push(file.name+' 格式不支持');continue;}
      const source=isVideo?document.createElement('video'):new Image();
      const url=URL.createObjectURL(file);customUrls[kind].push(url);customScreens[kind].push(source);
      if(isVideo){
        source.muted=true;source.loop=true;source.playsInline=true;source.preload='auto';source.setAttribute('playsinline','');
        source.addEventListener('loadeddata',()=>{if(state.screens)source.play().catch(()=>toast('视频已载入；若未播放，请点一下屏幕'));drawScreens(performance.now());},{once:true});
        source.addEventListener('error',()=>{const index=customScreens[kind].indexOf(source);if(index>=0)customScreens[kind].splice(index,1);const urlIndex=customUrls[kind].indexOf(url);if(urlIndex>=0)customUrls[kind].splice(urlIndex,1);URL.revokeObjectURL(url);drawScreens(performance.now());toast(file.name+' 无法解码；请用 MP4（H.264）或 WebM 重试');},{once:true});
      }else{source.dataset.animated=String(type.mime==='image/gif'||file.name.toLowerCase().endsWith('.gif'));source.onload=()=>drawScreens(performance.now());source.onerror=()=>toast(file.name+' 图片加载失败');}
      source.src=url;
      if(isVideo)source.load();
    }
    if(files.length>8)rejected.push('一次最多导入 8 个文件');
    e.target.value='';
    toast('已选择 '+customScreens[kind].length+' 个'+(kind==='tv'?'电视':'游戏')+'素材'+(rejected.length?'；'+rejected[0]:''));
  };
}
document.querySelector('#importPosterBtn').onclick=()=>document.querySelector('#posterFiles').click();
document.querySelector('#posterFiles').onchange=e=>toast('已在本机替换 '+applyAuthorizedPosters(e.target.files)+' 张授权海报图片');
function drawScreens(now){for(const s of screens){const c=s.canvas.getContext('2d');c.fillStyle='#020709';c.fillRect(0,0,320,240);if(state.screens){const custom=customScreens[s.tv?'tv':'game'],source=custom.length?custom[s.page%custom.length]:s.tv?tvStill:gameStill,isVideo=source.tagName==='VIDEO',ready=isVideo?source.readyState>=2:source.complete&&source.naturalWidth;if(ready){if(custom.length)c.drawImage(source,0,0,isVideo?source.videoWidth:source.width,isVideo?source.videoHeight:source.height,0,0,320,240);else{const q=s.page%4,sx=(q%2)*source.width/2,sy=Math.floor(q/2)*source.height/2;c.drawImage(source,sx,sy,source.width/2,source.height/2,0,0,320,240);}}else{c.fillStyle=s.tv?'#6b637b':'#345c77';c.fillRect(5,5,310,230);c.fillStyle='#d8d5ca';c.font='17px "Songti SC",serif';c.fillText(s.tv?'原创电视剧画面 · 加载中':'星光网吧 · 加载中',20,37);}c.fillStyle='#07101a22';for(let i=0;i<240;i+=3)c.fillRect(0,i,320,1);}s.texture.needsUpdate=true;}}
const ray=new T.Raycaster();let down;canvas.onpointerdown=e=>down=[e.clientX,e.clientY];canvas.onpointerup=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);if(state.open){const hit=ray.intersectObjects(screens.filter(s=>s.mesh.parent&&s.mesh.parent.parent).map(s=>s.mesh),false).find(h=>{let p=h.object;while(p){if(!p.visible)return false;p=p.parent;}return true;});if(hit){const s=screens.find(s=>s.mesh===hit.object);const count=customScreens[s.tv?'tv':'game'].length||4;s.page=(s.page+1)%count;drawScreens(performance.now());soundscape.playEffect('screen');toast('已切换屏幕内容');}}else{const hit=ray.intersectObjects(pickables,true).find(h=>h.object.visible);if(hit){let p=hit.object;while(p&&!p.userData.id)p=p.parent;if(p)enter(p.userData.id);}}};
window.onkeydown=e=>{if(e.key==='Escape')exterior();};
function captureBarberMirrors(){
  const previous=renderer.getRenderTarget();
  for(const surface of barberMirrors)surface.visible=false;
  barberStudent.visible=false;
  const room=stores.get('barber').floors[0],frontWasVisible=room.front.visible,roofWasVisible=room.roof.visible;
  room.front.visible=true;room.roof.visible=true;
  for(const {target,camera:reflectionCamera} of barberCapture){renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,reflectionCamera);}
  renderer.setRenderTarget(previous);
  room.front.visible=frontWasVisible;room.roof.visible=roofWasVisible;
  for(const surface of barberMirrors)surface.visible=true;
  barberMirrorCaptured=true;
}
let last=performance.now(),screenTick=0;
function render(now){
  requestAnimationFrame(render);
  const elapsed=(now-last)/1000,dt=Math.min(.05,elapsed);last=now;
  if(streetMode)updateWalking(Math.min(1,elapsed));else controls.update();
  if(barberMirror.visible){
    if(!barberMirrorCaptured)captureBarberMirrors();
    barberMirror.getWorldPosition(barberMirrorWorld);
    const distance=camera.position.distanceTo(barberMirrorWorld),proximity=T.MathUtils.clamp((10.1-distance)/2.3,0,1);
    const targetOpacity=.34*proximity*proximity*(3-2*proximity);
    barberStudent.material.opacity+=(targetOpacity-barberStudent.material.opacity)*(1-Math.exp(-dt*2.5));
    barberStudent.visible=barberStudent.material.opacity>.005;
  }
  if(precipitation.visible||rain.visible){for(let i=0;i<particleCount;i++){positions[i*3+1]-=dt*(state.weather==='rain'?16+flakeSizes[i]*4:.55+flakeSizes[i]*.55);positions[i*3]+=dt*(state.weather==='rain'?.5:Math.sin(now/1300+i)*.18);if(positions[i*3+1]<.1){positions[i*3+1]=15;positions[i*3]=(rand()-.5)*28;positions[i*3+2]=(rand()-.5)*40+3;}rainVertices.set([positions[i*3],positions[i*3+1],positions[i*3+2],positions[i*3]-.05,positions[i*3+1]+.35,positions[i*3+2]],i*6);}pgeo.attributes.position.needsUpdate=true;rainGeo.attributes.position.needsUpdate=true;}
  const movingTv=customScreens.tv.some(source=>source.tagName==='VIDEO'||source.dataset?.animated==='true');
  if(now-screenTick>(movingTv&&state.screens?40:250)){drawScreens(now);screenTick=now;}
  composer.render();
}
function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);composer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(canvas);resize();season();atmosphere();exterior();document.querySelector('#loading').remove();document.querySelector('#status').textContent='9 家可进入店铺 · 麻辣烫 / 炸串摊';requestAnimationFrame(render);
// Read-only diagnostics used to verify the actual scene graph and renderer.
window.sceneQA=()=>({state:{...state},audio:soundscape.debugState(),stores:[...stores.values()].map(s=>({id:s.id,visible:s.root.visible,levels:s.floors.map(f=>({visible:f.floor.visible,front:f.front.visible,roof:f.roof.visible}))})),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,screenCount:screens.length,roomLights:lamps.filter(l=>l.type==='room').length,canvas:[canvas.width,canvas.height]});
