import {texturePath} from './texture-format.js';
import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';

// One image supplies many distinct object fronts; every packet and garment remains
// a separate piece of scene geometry. Tile textures share the decoded image.
function atlasTiles(url,transparent=false){
  const tiles=[];
  const placeholder=document.createElement('canvas');placeholder.width=placeholder.height=2;
  if(!transparent){const c=placeholder.getContext('2d');c.fillStyle='#b9a98b';c.fillRect(0,0,2,2);}
  const base=new T.CanvasTexture(placeholder);
  base.colorSpace=T.SRGBColorSpace;
  const materials=Array.from({length:16},(_,i)=>{
    const tile=base.clone();
    tile.colorSpace=T.SRGBColorSpace;
    tile.repeat.set(transparent?.244:.224,transparent?.244:.225);
    tile.offset.set((i%4)*.25+(transparent?.003:.013),(3-Math.floor(i/4))*.25+(transparent?.003:.012));
    tile.anisotropy=8;
    tiles.push(tile);
    return new T.MeshStandardMaterial({map:tile,transparent,alphaTest:transparent?.08:0,side:T.DoubleSide,roughness:.86,metalness:0});
  });
  new T.TextureLoader().load(url,loaded=>{for(let i=0;i<tiles.length;i++){
    // CanvasTexture clones share a Source; swapping .image later left the GPU
    // sampling the placeholder in some browsers. Replace the actual map.
    const tile=loaded.clone();tile.colorSpace=T.SRGBColorSpace;
    tile.repeat.set(transparent?.244:.224,transparent?.244:.225);tile.offset.set((i%4)*.25+(transparent?.003:.013),(3-Math.floor(i/4))*.25+(transparent?.003:.012));
    tile.anisotropy=8;tile.needsUpdate=true;materials[i].map=tile;materials[i].needsUpdate=true;
  }});
  return materials;
}
const productFaces=atlasTiles(texturePath('./textures/fast/shop-products-atlas-v1.webp'));
// One unfolded packaging atlas supplies the backs, both narrow sides and the
// crimped top/bottom of each item. The existing high-resolution fronts remain.
function productWrapAtlas(){
  const source=document.createElement('canvas');source.width=source.height=2048;
  const ctx=source.getContext('2d'),texture=new T.CanvasTexture(source);
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const sides=Array.from({length:16},(_,item)=>{
    const cellX=(item%4)*512,cellY=Math.floor(item/4)*512;
    const regions=[
      [0,0,128,384],[128,0,128,384],[0,384,256,64],
      [256,384,256,64],[256,0,256,384]
    ];
    return regions.map(([x,y,w,h])=>{
      const tile=texture.clone();tile.colorSpace=T.SRGBColorSpace;
      tile.repeat.set((w-4)/2048,(h-4)/2048);
      tile.offset.set((cellX+x+2)/2048,(2048-cellY-y-h+2)/2048);
      tile.anisotropy=8;tile.needsUpdate=true;
      return new T.MeshStandardMaterial({map:tile,roughness:.68,side:T.DoubleSide});
    });
  });
  const art=new Image();art.src=texturePath('./textures/fast/shop-products-atlas-v1.webp');
  const colors=['#ab493e','#c69c61','#426380','#b85b68','#a1754a','#8197a1','#c58637','#71915d','#b1514f','#7a544b','#a95b70','#bd6349','#536981','#d68b4c','#71909d','#c3b39b'];
  art.onload=()=>{
    for(let item=0;item<16;item++){
      const x=(item%4)*512,y=Math.floor(item/4)*512,color=colors[item];
      ctx.fillStyle=color;ctx.fillRect(x,y,512,512);
      // Side panels carry continuous packaging colour, a narrow printed stripe,
      // folds and seam marks; they are not copies of the front picture.
      for(const sx of [0,128]){
        ctx.fillStyle='rgba(255,244,213,.45)';ctx.fillRect(x+sx+10,y+27,108,24);
        ctx.fillStyle='rgba(42,34,30,.28)';ctx.fillRect(x+sx+10,y+57,108,4);
        ctx.fillStyle='rgba(255,245,225,.22)';ctx.fillRect(x+sx+10,y+78,108,225);
        for(let line=0;line<7;line++){ctx.fillStyle=line%2?'#f5e4c599':'#382f2855';ctx.fillRect(x+sx+17,y+93+line*28,70+(line%3)*12,3);}
        for(let fold=0;fold<7;fold++){ctx.fillStyle=fold%2?'#ffffff3a':'#261f2430';ctx.fillRect(x+sx+5+fold*17,y+345,3,34);}
      }
      // The back has muted continuation art, period-style information and a
      // printed barcode, all fixed to the rear face of the physical packet.
      const sx=(item%4)*art.width/4,sy=Math.floor(item/4)*art.height/4;
      ctx.globalAlpha=.21;ctx.drawImage(art,sx,sy,art.width/4,art.height/4,x+262,y+8,244,365);ctx.globalAlpha=1;
      ctx.fillStyle='#eee2cbbb';ctx.fillRect(x+275,y+70,220,232);
      ctx.fillStyle='#4c413b';ctx.textAlign='left';ctx.font='bold 22px sans-serif';ctx.fillText('商品说明',x+288,y+103);
      ctx.font='13px sans-serif';
      for(let line=0;line<8;line++){ctx.fillStyle=line%2?'#625347':'#786759';ctx.fillRect(x+288,y+122+line*15,176-(line%3)*19,3);}
      ctx.fillStyle='#f4eddc';ctx.fillRect(x+357,y+262,124,72);
      for(let bar=0;bar<35;bar++){const bw=bar%4===0?3:1;ctx.fillStyle='#272725';ctx.fillRect(x+366+bar*3,y+270,bw,42-(bar%5)*3);}
      for(const yy of [388,452]){
        ctx.fillStyle='#e0c79f';ctx.fillRect(x+5,y+yy,502,58);
        for(let fold=0;fold<30;fold++){ctx.fillStyle=fold%2?'#ffffff83':'#5c413849';ctx.fillRect(x+11+fold*16,y+yy+5,3,48);}
        ctx.fillStyle=color;ctx.fillRect(x+7,y+yy+26,498,7);
      }
    }
    texture.needsUpdate=true;
    for(const itemSides of sides)for(const material of itemSides){material.map.needsUpdate=true;material.needsUpdate=true;}
  };
  return sides;
}
const productWrapFaces=productWrapAtlas();
const garmentFaces=atlasTiles(texturePath('./textures/fast/fashion-garments-atlas-v1.webp'),true);
// Nine individually cropped accessory fronts, mounted on real hooks/cards below.
// The atlas is not a wall poster: each tile belongs to a separate shop object.
const accessoryFaces=Array.from({length:9},()=>new T.MeshStandardMaterial({color:'#fff',transparent:true,opacity:0,alphaTest:.08,side:T.DoubleSide,roughness:.84,depthWrite:true}));
new T.TextureLoader().load(texturePath('./textures/fast/fashion-accessories-atlas-v1.webp'),atlas=>accessoryFaces.forEach((m,i)=>{
  const tile=atlas.clone();tile.colorSpace=T.SRGBColorSpace;
  tile.repeat.set(.318,.318);tile.offset.set((i%3)/3+.007,(2-Math.floor(i/3))/3+.007);
  tile.anisotropy=8;tile.needsUpdate=true;m.map=tile;m.opacity=1;m.needsUpdate=true;
}));
const plumBagMap=new T.TextureLoader().load(texturePath('./textures/fast/fashion-plum-tote-front-v1.webp'));
plumBagMap.colorSpace=T.SRGBColorSpace;plumBagMap.anisotropy=8;
const plumBagFabric=new T.MeshStandardMaterial({map:plumBagMap,roughness:.93,side:T.DoubleSide});
// Torso crops become printed cloth on the *top of folded garments*, not wall decals.
const foldFaces=Array.from({length:12},()=>new T.MeshStandardMaterial({color:'#ffffff',transparent:true,alphaTest:.08,roughness:.95,side:T.DoubleSide}));
new T.TextureLoader().load(texturePath('./textures/fast/fashion-garments-atlas-v1.webp'),atlas=>foldFaces.forEach((m,i)=>{const t=atlas.clone();t.colorSpace=T.SRGBColorSpace;t.repeat.set(.133,.112);t.offset.set((i%4)*.25+.058,(3-Math.floor(i/4))*.25+.055);t.anisotropy=8;t.needsUpdate=true;m.map=t;m.needsUpdate=true;}));
const crustMap=new T.TextureLoader().load(texturePath('./textures/fast/bakery-crust-uv-v1.webp'));crustMap.colorSpace=T.SRGBColorSpace;crustMap.wrapS=crustMap.wrapT=T.RepeatWrapping;crustMap.repeat.set(2.5,2.5);crustMap.anisotropy=8;
const crustMat=new T.MeshStandardMaterial({map:crustMap,roughness:.78});
const trayLoader=new T.TextureLoader();
const soupIngredientMaterials=['#e2bd87','#dcc5a0','#6d9c59','#81583b'].map(color=>new T.MeshStandardMaterial({color,roughness:.72}));
new T.TextureLoader().load(texturePath('./textures/fast/malatang-tray-top-uv-v1.webp'),atlas=>{
  const crops=[[.66,.04,.30,.43],[.02,.55,.30,.39],[.34,.55,.30,.40],[.28,.04,.31,.41]];
  soupIngredientMaterials.forEach((material,i)=>{const [x,y,w,h]=crops[i],tile=atlas.clone();tile.colorSpace=T.SRGBColorSpace;tile.repeat.set(w,h);tile.offset.set(x,y);tile.anisotropy=8;tile.needsUpdate=true;material.map=tile;material.color.set('#ffffff');material.needsUpdate=true;});
});
const friedTrayMap=trayLoader.load(texturePath('./textures/fast/fried-skewer-tray-top-uv-v1.webp'));friedTrayMap.colorSpace=T.SRGBColorSpace;friedTrayMap.anisotropy=8;
const friedTrayMaterial=new T.MeshStandardMaterial({map:friedTrayMap,roughness:.63,side:T.DoubleSide});

// All dimensions are scene metres. Every shop keeps a clear entrance and a working aisle.
export function createDistrictKit(a){
  const {group,box,cyl,orb,rod,mesh,mat,table,chair,stool,crt,fan,plant,fixture,label,wood,iron,cream,timber,roofFinish,metalPBR,ceramic,fabric,bookCovers,bookBacks,bookSpines,paperEdge}=a;
  const steel=mat('#a0aaa6',.34,.7), dark=mat('#28383c'), tile=ceramic;Object.assign(steel,metalPBR);steel.normalScale.set(.25,.25);steel.userData.metersPerTile=.8;
  const glass=new T.MeshStandardMaterial({color:'#a5cec8',transparent:true,opacity:.16,roughness:.2,depthWrite:false,side:T.DoubleSide});
  const colors=['#a64a3e','#548b79','#c3a859','#617f9b','#b88087'];
  const packetGeometry=new T.BoxGeometry(1,1,1),pouchGeometry=new T.BoxGeometry(1,1,1,5,5,1),bunGeometry=new T.SphereGeometry(1,18,12,0,Math.PI*2,0,Math.PI*.72),bunBaseGeometry=new T.CylinderGeometry(.78,.72,.28,18);
  {const v=pouchGeometry.attributes.position;for(let n=0;n<v.count;n++){const x=v.getX(n),y=v.getY(n),z=v.getZ(n);v.setXYZ(n,x*(.91+.1*(1-Math.abs(y)*2)),y,z+Math.sign(z)*.16*(1-Math.abs(x)*1.4)*(1-Math.abs(y)*1.4));}pouchGeometry.computeVertexNormals();}
  const packetSides=colors.map(color=>mat(color,.49));
  const labelNames=['冰红茶','橘子汽水','绿茶','汽水','矿泉水'];
  const drinkArt=new Image();drinkArt.src=texturePath('./textures/fast/period-drink-labels-v1.webp');
  const bottleLabels=labelNames.map((name,i)=>{const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d'),t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;t.anisotropy=8;
    const draw=()=>{if(drinkArt.complete&&drinkArt.naturalWidth)g.drawImage(drinkArt,0,(i%4)*drinkArt.height/4,drinkArt.width,drinkArt.height/4,0,0,1024,256);else{g.fillStyle=['#a56b3d','#e78e30','#46825b','#a95235','#538ead'][i];g.fillRect(0,0,1024,256);}g.fillStyle='#faf1ddeb';g.fillRect(330,58,364,143);g.fillStyle='#31534a';g.textAlign='center';g.font='bold 83px "Songti SC",serif';g.fillText(name,512,163);t.needsUpdate=true;};draw();drinkArt.addEventListener('load',draw);return new T.MeshStandardMaterial({map:t,roughness:.61,side:T.DoubleSide});});
  function soft(p,w,h,d,m,x,y,z,r=.035){return mesh(p,new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/5,h/5,d/5)),m,x,y,z);}
  const petProfile=[[.041,0],[.057,.008],[.069,.025],[.073,.047],[.073,.166],[.068,.189],[.052,.215],[.036,.237],[.032,.248],[.032,.274]].map(v=>new T.Vector2(...v));
  const petGeometry=new T.LatheGeometry(petProfile,24);
  function bottle(p,x,y,z,i=0,s=1,category='drink'){
    const g=group(p,x,y,z);g.scale.setScalar(s);const color=colors[i%5];
    const shell=new T.Mesh(petGeometry,new T.MeshPhysicalMaterial({color:category==='care'?'#d9c8a8':color,roughness:.26,metalness:0,clearcoat:.75,clearcoatRoughness:.2,transparent:category==='drink',opacity:category==='drink'?.84:1,depthWrite:true}));shell.castShadow=true;g.add(shell);
    for(const yy of [.038,.051,.184]){const ridge=new T.Mesh(new T.TorusGeometry(yy>.1?.067:.071,.0025,5,24),new T.MeshStandardMaterial({color:'#ffffff',transparent:true,opacity:.22}));ridge.rotation.x=Math.PI/2;ridge.position.y=yy;g.add(ridge);}
    if(category==='drink'){
      const wrap=new T.Mesh(new T.CylinderGeometry(.074,.074,.102,28,1,true),bottleLabels[i%5]);wrap.position.y=.117;wrap.castShadow=true;g.add(wrap);
    }else cyl(g,.074,.09,mat('#e9dcc7'),0,.12,0,.074,24);
    cyl(g,.036,.027,mat(category==='care'?'#d6d1c4':'#e4d9bd',.38),0,.288,0,.036,20);
    for(const yy of [.279,.286,.293]){const ridge=new T.Mesh(new T.TorusGeometry(.036,.0025,5,20),cream);ridge.rotation.x=Math.PI/2;ridge.position.y=yy;g.add(ridge);}
    return g;
  }
  function packet(p,x,y,z,k,w=.21,h=.29,d=.105){const g=group(p,x,y,z),side=packetSides[k%5];
    const carton=k===5||k===6,notebook=k===14,pouch=!carton&&!notebook;
    if(notebook){w*=.78;h*=1.12;d*=.38;g.rotation.y=-.12;}
    const [right,left,top,bottom,back]=productWrapFaces[k%16];
    const body=mesh(g,pouch?pouchGeometry:packetGeometry,[right,left,top,bottom,productFaces[k%16],back],0,0,0);body.scale.set(w,h,d);
    if(carton){const fold=mesh(g,new T.ConeGeometry(w*.56,h*.22,4),side,0,h*.58,0);fold.rotation.y=Math.PI/4;}
    if(pouch){for(const yy of [-1,1]){box(g,w*.94,.012,d*.65,side,0,yy*h*.50,0);for(let i=0;i<7;i++)box(g,w*.10,.008,d*.7,mat('#d1bfa1'),(-.42+i*.14)*w,yy*h*.52,0);}}
    return g;}
  function bun(p,x,y,z,variant=0,scale=1){
    if(variant%3===2){const donut=mesh(p,new T.TorusGeometry(.112*scale,.043*scale,10,24),crustMat,x,y-.065*scale,z);donut.rotation.x=Math.PI/2;donut.rotation.z=variant*.19;return donut;}
    const g=group(p,x,y,z,variant*.23),rx=(variant%3===1?.19:.15)*scale,ry=.115*scale,rz=(variant%3===1?.12:.15)*scale;
    const b=mesh(g,bunGeometry,crustMat,0,0,0);b.scale.set(rx,ry,rz);
    const underside=mesh(g,bunBaseGeometry,mat('#d5ad79',.96),0,-.8*ry,0);underside.scale.set(rx,ry,rz);
    if(variant%3===0){for(const shift of [-.045,.045]){const score=rod(g,[-.08*scale,.105*scale,shift],[.08*scale,.105*scale,shift+.015*scale],.0045*scale,mat('#aa7550'));score.castShadow=false;}}
    return g;
  }
  function paperCard(lines,ink='#584330',paper='#dcc7a0'){const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d');g.fillStyle=paper;g.fillRect(0,0,384,512);for(let i=0;i<650;i++){g.fillStyle=i%3?'#ffffff16':'#48372810';g.fillRect((i*117)%384,(i*73)%512,3,2);}g.strokeStyle=ink;g.lineWidth=8;g.strokeRect(20,20,344,472);g.fillStyle=ink;g.textAlign='center';lines.forEach((line,i)=>{g.font=i===0?'bold 47px "Songti SC",serif':'bold 34px "Songti SC",serif';g.fillText(line,192,102+i*104,335);});const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map:tex,roughness:.91,side:T.DoubleSide});}
  const boardCopy={tea:['七杯茶','珍珠奶茶 3元','放学来一杯'],noodles:['小玲米线','牛肉米线 6元','现煮热汤'],bakery:['面包坊','新鲜出炉','面包 2元起'],shop:['红星小卖部','零食 饮料 文具','冰汽水 2元'],mianpi:['汉中擀面皮','现拌 4元','加辣可选'],fashion:['火星地带','服饰 饰品','学生新款'],barber:['青春理发','学生剪发 8元','洗剪吹'],bookshop:['诸葛亮读书社','漫画 小说','旧书交换'],cyber:['星光网吧','上网 2元/时','请勿喧哗']};
  function sidewalkBoard(p,x,z,kind){const g=group(p,x,0,z,.09);g.rotation.x=-.045;const copy=boardCopy[kind];box(g,.51,.78,.045,mat(kind==='cyber'?'#46475e':'#6a5340'),0,.54,0);const card=mesh(g,new T.PlaneGeometry(.45,.72),paperCard(copy,kind==='cyber'?'#363d62':'#624432'),0,.54,.03);card.castShadow=false;for(const sx of [-.19,.19])rod(g,[sx,.18,-.14],[sx,.85,0],.02,iron);box(g,.54,.04,.22,wood,0,.14,-.08);return g;}
  function stockBox(p,x,z,w=.42,h=.31,d=.35){const g=group(p,x,0,z);soft(g,w,h,d,mat('#aa8863'),0,h/2,0,.012);box(g,w*.94,.019,d*.92,mat('#c3a477'),0,h+.011,0);for(const s of [-1,1])box(g,.015,h*.75,.025,mat('#856f54'),s*w*.31,h*.5,d/2+.004);return g;}
  function splitExtrudedCaps(geo){
    const old=geo.groups.map(g=>({...g})),normal=geo.attributes.normal;
    geo.clearGroups();
    for(const group of old){
      if(group.materialIndex!==0){geo.addGroup(group.start,group.count,1);continue;}
      let start=group.start,last=null;
      for(let i=group.start;i<group.start+group.count;i+=3){
        const next=normal.getZ(i)>0?0:2;
        if(last!==null&&next!==last){geo.addGroup(start,i-start,last);start=i;}
        last=next;
      }
      if(last!==null)geo.addGroup(start,group.start+group.count-start,last);
    }
    return geo;
  }
  function garmentGeometry(w,h,long=false){const s=new T.Shape();const p=long?[[-.23,-.5],[.23,-.5],[.28,.23],[.54,-.06],[.60,.06],[.40,.43],[.18,.50],[.08,.42],[-.08,.42],[-.18,.50],[-.40,.43],[-.60,.06],[-.54,-.06],[-.28,.23]]:[[-.28,-.5],[.28,-.5],[.3,.23],[.52,.18],[.58,.36],[.36,.49],[.16,.50],[.08,.40],[-.08,.40],[-.16,.50],[-.36,.49],[-.58,.36],[-.52,.18],[-.3,.23]];p.forEach(([x,y],i)=>i?s.lineTo(x*w,y*h):s.moveTo(x*w,y*h));s.closePath();const geo=splitExtrudedCaps(new T.ExtrudeGeometry(s,{depth:.065,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,curveSegments:2}));const pos=geo.attributes.position,normal=geo.attributes.normal,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++)if(Math.abs(normal.getZ(i))>.7)uv.setXY(i,pos.getX(i)/w+.5,pos.getY(i)/h+.5);uv.needsUpdate=true;return geo;}
  const shirtGeometry=garmentGeometry(.50,.79),jacketGeometry=garmentGeometry(.57,.95,true);
  function garment(p,x,y,z,k,long=false,angle=0){const g=group(p,x,y,z,angle),clothBase=fabric(['#d7cbc0','#577f87','#b97680','#56545b','#bdb6a5','#62445d','#7d90a2','#77716e'][k%8]);const body=mesh(g,long?jacketGeometry:shirtGeometry,[garmentFaces[k%16],clothBase,clothBase],0,0,0);body.castShadow=true;rod(g,[-.13,long?.49:.43,-.02],[0,long?.56:.49,-.02],.008,iron);rod(g,[0,long?.56:.49,-.02],[.13,long?.49:.43,-.02],.008,iron);return g;}
  function canvasBag(p,x,y,z,angle=0,variant=0){const g=group(p,x,y,z,angle),denim=fabric(variant?'#725967':'#536983'),strap=fabric(variant?'#a68d91':'#d1c3ac');
    const profile=new T.Shape();profile.moveTo(-.205,0);profile.lineTo(.205,0);profile.lineTo(.255,.43);profile.lineTo(-.255,.43);profile.closePath();
    const bagGeometry=splitExtrudedCaps(new T.ExtrudeGeometry(profile,{depth:.12,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:2}));
    const position=bagGeometry.attributes.position,normal=bagGeometry.attributes.normal,uv=bagGeometry.attributes.uv;
    for(let i=0;i<position.count;i++)if(Math.abs(normal.getZ(i))>.7)uv.setXY(i,position.getX(i)/.51+.5,position.getY(i)/.43);
    uv.needsUpdate=true;
    const shell=mesh(g,bagGeometry,[variant?plumBagFabric:denim,denim,denim],0,.025,-.06);shell.castShadow=true;
    for(const sx of [-.18,.18]){box(g,.065,.42,.014,strap,sx,.35,.071);rod(g,[sx,.43,.015],[sx,.66,.015],.025,strap);}
    const handle=new T.Mesh(new T.TorusGeometry(.18,.025,6,20,Math.PI),strap);handle.position.set(0,.64,.018);handle.rotation.z=Math.PI;g.add(handle);
    if(!variant){const print=mesh(g,new T.PlaneGeometry(.43,.36),garmentFaces[15],0,.25,.079);print.castShadow=false;}
    return g;}
  function basket(p,x,y,z,w=.55,d=.4){const g=group(p,x,y,z);box(g,w,.045,d,mat('#a4734e'),0,.025,0);for(let i=0;i<4;i++){for(const zz of [-d/2,d/2])box(g,w,.025,.025,wood,0,.07+i*.045,zz);for(const xx of [-w/2,w/2])box(g,.025,.025,d,wood,xx,.07+i*.045,0);}return g;}
  function shelf(p,x,z,w=2.4,h=2.25){const g=group(p,x,0,z);for(const xx of [-w/2,w/2])box(g,.045,h,.36,iron,xx,h/2,0);for(let row=0;row<5;row++)box(g,w,.045,.4,timber,0,.22+row*.44,0);return g;}
  function utilities(p,w,d){
    const bin=group(p,-w/2+.28,0,d/2-.45);cyl(bin,.14,.4,mat('#61766a'),0,.2,0);cyl(bin,.15,.04,iron,0,.41,0);
    box(p,.12,.16,.035,cream,w/2-.16,.52,-d/2+.14);rod(p,[w/2-.14,.65,-d/2+.16],[w/2-.14,2.75,-d/2+.16],.012,cream);
    const broom=group(p,-w/2+.2,0,-d/2+.3,.12);rod(broom,[0,.15,0],[.12,1.25,0],.013,wood);box(broom,.19,.18,.07,mat('#a18b51'),0,.12,0);
  }
  function bakery(p,w,d){
    const g=group(p,-.25,0,.5);soft(g,2.25,.62,.72,mat('#9e6b5d'),0,.4,0);box(g,2.36,.065,.83,steel,0,.76,0);
    for(const x of [-1.12,1.12])for(const z of [-.35,.35])rod(g,[x,.78,z],[x,1.51,z],.025,steel);
    for(const y of [.9,1.25]){box(g,2.18,.025,.68,steel,0,y,0);for(let i=0;i<7;i++){const x=-.9+i*.3;bun(g,x,y+.08,.08,i,.7);}}
    const bakeryGlass=new T.MeshStandardMaterial({color:'#d8e5d8',transparent:true,opacity:.085,roughness:.12,depthWrite:false,side:T.DoubleSide});
    box(g,2.24,.7,.012,bakeryGlass,0,1.14,.36);box(g,2.25,.018,.76,bakeryGlass,0,1.52,0);
    const rack=shelf(p,-.7,-d/2+.35,2.15);for(let row=0;row<5;row++)for(let j=0;j<5;j++){bun(rack,-.83+j*.4,.33+row*.44,0,j+row,.78);}
    const oven=group(p,w/2-.62,0,-d/2+.65);soft(oven,.85,1.8,.88,steel,0,.9,0);for(let r=0;r<3;r++){box(oven,.69,.39,.03,dark,0,.4+r*.5,.455);box(oven,.54,.25,.015,mat('#5b4330'),0,.4+r*.5,.48);rod(oven,[-.28,.55+r*.5,.51],[.28,.55+r*.5,.51],.022,steel);cyl(oven,.035,.02,mat('#b94b38'),.33,.42+r*.5,.49);}
    basket(p,-w/2+.48,.18,d/2-.62,.65,.45);const board=table(p,w/2-.6,1.0,.8,.6,.85);box(board,.6,.025,.45,timber,0,.9,0);bun(board,0,1.05,0,1,1.25);
  }
  function shop(p,w,d){
    const back=shelf(p,-.5,-d/2+.34,w-1.35);for(let row=0;row<5;row++)for(let col=0;col<9;col++){
      if((row===1&&col===3)||(row===3&&col===6)||(row===4&&col===1))continue;
      const x=-(w-1.65)/2+col*(w-1.65)/8+(((row*7+col*3)%5)-2)*.014;
      if(row<2){const item=bottle(back,x,.25+row*.44,((col+row)%3-1)*.025,col);item.rotation.y=((col*3+row)%5-2)*.12;}
      else{const k=(row*7+col*5)%16,item=packet(back,x,.37+row*.44,((row+col)%3-1)*.03,k,.16+((row+col)%3)*.025,.22+((col*2+row)%4)*.025,.065+((col+row)%2)*.02);item.rotation.y=((col*2+row)%5-2)*.075;}
    }
    const fridge=group(p,w/2-.59,0,-.7);soft(fridge,.83,1.95,.75,mat('#ac4337'),0,.99,0);box(fridge,.68,1.58,.06,dark,0,.99,.39);for(let row=0;row<4;row++){box(fridge,.63,.025,.38,cream,0,.35+row*.37,.35);for(let j=0;j<4;j++)bottle(fridge,-.23+j*.15,.36+row*.37,.38,j);}
    box(fridge,.67,1.58,.015,glass,0,.99,.52);rod(fridge,[.25,.65,.54],[.25,1.23,.54],.018,cream);
    const counter=group(p,-.55,0,d/2-.9);soft(counter,1.8,.9,.65,mat('#8d7555'),0,.5,0);box(counter,1.9,.065,.73,timber,0,.98,0);for(let i=0;i<3;i++){const notebook=box(counter,.31,.035,.25,mat(colors[i]),-.63+i*.38,1.04,0);const face=mesh(counter,new T.PlaneGeometry(.29,.23),productFaces[14],-.63+i*.38,1.063,0);face.rotation.x=-Math.PI/2;}const till=group(counter,.59,1.02,-.08);soft(till,.36,.19,.3,mat('#a7aaa1'),0,.1,0);box(till,.28,.11,.025,mat('#3c4c50'),0,.18,.16);for(let r=0;r<3;r++)for(let c=0;c<4;c++)box(till,.035,.012,.026,cream,-.11+c*.073,.22,-.08+r*.07);
    const hooks=group(p,-w/2+.16,0,-.35,Math.PI/2);for(let row=0;row<3;row++)for(let col=0;col<5;col++){const x=-.68+col*.34,y=1.02+row*.39,k=(row*5+col)%16;rod(hooks,[x,y+.09,0],[x,y+.09,.1],.01,iron);packet(hooks,x,y,.14,k,.23,.30,.07);}
    const loose=basket(p,-w/2+.55,0,d/2-.58,.7,.48);
    for(let i=0;i<7;i++){const item=packet(loose,-.22+(i%4)*.145,.26+Math.floor(i/4)*.075,-.10+(i%3)*.085,(i*7+3)%16,.13,.19,.045);item.rotation.z=(i%3-1)*.19;item.rotation.y=(i%4-1.5)*.18;}
    // The counter has two imperfectly filled sweet jars, not another row of boxes.
    for(const [xx,zz,fill] of [[-.78,-.25,.66],[.28,.23,.46]]){
      const jar=group(counter,xx,1.02,zz);
      cyl(jar,.105,.24,new T.MeshPhysicalMaterial({color:'#d5b698',transparent:true,opacity:.36,roughness:.18,metalness:0,depthWrite:false}),0,.13,0,.105,20);
      cyl(jar,.112,.025,mat('#b93e35'),0,.27,0,.112,20);
      for(let n=0;n<8*fill;n++)orb(jar,.027,mat(['#d6b46b','#c75942','#8da76f','#d8c7a3'][n%4]),(n%3-1)*.047,.055+Math.floor(n/3)*.048,((n*2)%3-1)*.04);
    }
  }
  function barber(p,w,d){
    const mirror=new T.MeshBasicMaterial({color:'#dce6e3',side:T.DoubleSide,toneMapped:false});
    const studentMap=new T.TextureLoader().load(texturePath('./textures/fast/student-mirror-reflection-v1.webp'));studentMap.colorSpace=T.SRGBColorSpace;studentMap.anisotropy=8;
    for(const x of [-1.0,.85]){
      soft(p,1.18,1.37,.10,mat('#405f59'),x,1.97,-d/2+.15);
      if(x<0){const surface=mesh(p,new T.PlaneGeometry(1.02,1.2),mirror.clone(),x,1.97,-d/2+.24);surface.name='barber-reflection-surface';surface.castShadow=false;surface.userData.dynamic=true;
        const ghost=new T.Mesh(new T.PlaneGeometry(.62,1.0),new T.MeshBasicMaterial({map:studentMap,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));ghost.position.set(x-.04,1.96,-d/2+.241);ghost.name='barber-student-reflection';ghost.visible=false;ghost.userData.dynamic=true;p.add(ghost);
      }else{const surface=mesh(p,new T.PlaneGeometry(1.02,1.2),mirror.clone(),x,1.97,-d/2+.24);surface.name='barber-reflection-surface';surface.castShadow=false;surface.userData.dynamic=true;}
      box(p,1.35,.09,.43,timber,x,1.18,-d/2+.35);for(let i=0;i<3;i++)bottle(p,x-.43+i*.17,1.23,-d/2+.3,i,.8,'care');
      // The chair's local forward is +Z; mirrors are on the rear (-Z) wall.
      const seat=group(p,x,0,-.25,Math.PI);seat.name='barber-chair-facing-mirror';cyl(seat,.31,.07,steel,0,.12,0);cyl(seat,.065,.49,steel,0,.36,0);soft(seat,.59,.15,.6,mat('#6d3935'),0,.66,0);soft(seat,.6,.68,.14,mat('#6d3935'),0,.94,-.28);
      for(const sx of [-.37,.37]){rod(seat,[sx,.63,-.2],[sx,.94,-.2],.026,steel);soft(seat,.1,.08,.55,dark,sx,.97,0);}rod(seat,[-.22,.3,.42],[.22,.3,.42],.035,steel);rod(seat,[0,.58,.12],[0,.3,.42],.035,steel);
    }
    // Left wall as seen entering from the street; back faces -X, seating faces +X.
    const sofa=group(p,-w/2+.39,0,.92,Math.PI/2);sofa.name='barber-sofa-left-wall';
    const upholstery=fabric('#52726c');
    soft(sofa,1.25,.18,.55,upholstery,0,.5,0);soft(sofa,1.25,.48,.12,upholstery,0,.8,-.28);
    for(const sx of [-.65,.65]){soft(sofa,.12,.28,.64,upholstery,sx,.62,0);for(const sz of [-.2,.2])cyl(sofa,.035,.32,wood,sx,.2,sz);}
    const sink=group(p,w/2-.52,0,-d/2+.65);soft(sink,.62,.65,.65,cream,0,.43,0);mesh(sink,new T.TorusGeometry(.23,.065,8,24),cream,0,.82,0).rotation.x=Math.PI/2;cyl(sink,.19,.03,dark,0,.78,0);rod(sink,[0,.8,-.2],[0,1.05,-.2],.025,steel);rod(sink,[0,1.05,-.2],[0,1.05,0],.025,steel);
    const towel=group(p,w/2-.35,0,1);for(let i=0;i<4;i++)box(towel,.4,.055,.27,mat(i%2?'#bec4b1':'#8daca3'),0,.7+i*.06,0);box(towel,.5,.65,.4,timber,0,.33,0);
  }
  function fashion(p,w,d){
    function sneaker(parent,x,y,z,k){
      const g=group(parent,x,y,z),upper=fabric(['#57535a','#a18d78','#526d75','#875d70'][k%4]);g.rotation.y=Math.PI/2;
      const high=k%3===1,outline=new T.Shape();
      outline.moveTo(-.17,.02);outline.lineTo(.17,.02);outline.quadraticCurveTo(.205,.05,.18,.082);
      outline.lineTo(.115,.103);outline.lineTo(.03,.109);outline.lineTo(-.045,high?.18:.142);
      outline.lineTo(-.13,high?.185:.148);outline.lineTo(-.17,.075);outline.closePath();
      soft(g,.36,.038,.195,mat('#dfd7c9'),0,.019,0,.012);
      const body=mesh(g,new T.ExtrudeGeometry(outline,{depth:.17,bevelEnabled:true,bevelThickness:.005,bevelSize:.005,bevelSegments:1}),upper,0,.014,-.085);body.castShadow=true;
      soft(g,.085,.033,.174,mat('#d3c7ba'),.135,.064,0,.009);
      for(let j=0;j<3;j++){const xx=-.035+j*.043,yy=(high?.152:.115)-j*.014;
        rod(g,[xx,yy,-.077],[xx+.015,yy,.077],.0065,mat('#d9cfba'));}
      box(g,.09,.012,.177,mat('#eee5d6'),-.116,.048,0);
      return g;
    }
    const rack=group(p,0,0,-d/2+.98);for(const x of [-1.4,1.4])rod(rack,[x,.15,0],[x,2.25,0],.026,steel);rod(rack,[-1.4,2.25,0],[1.4,2.25,0],.026,steel);
    for(let i=0;i<8;i++){
      const x=-1.26+i*.36,long=i>4;
      rod(rack,[x,2.22,0],[x-.12,2.05,0],.01,iron);rod(rack,[x,2.22,0],[x+.12,2.05,0],.01,iron);
      garment(rack,x,1.65,.055,i,long,(i%3-1)*.11);
    }
    const peg=group(p,-w/2+.13,0,-.1,Math.PI/2);
    box(peg,1.7,1.9,.08,mat('#66546f'),0,1.58,0);
    const accessoryLayout=[
      [-.55,2.23,.31,.27,-.06],[-.03,2.14,.34,.28,.035],[.50,2.23,.33,.27,.045],
      [-.57,1.62,.33,.31,.055],[-.02,1.68,.35,.30,-.04],[.53,1.60,.33,.31,.065],
      [-.52,1.07,.30,.34,-.035],[.02,1.04,.32,.32,.045],[.54,1.08,.30,.32,-.025]
    ];
    accessoryLayout.forEach(([x,y,ww,hh,angle],i)=>{
      const item=group(peg,x,y,.09);item.rotation.z=angle;
      const onCard=[0,1,2,6,8].includes(i);
      if(onCard){
        soft(item,ww+.035,hh+.035,.017,mat(i===8?'#ad9575':'#c9b69c'),0,0,0,.008);
        cyl(item,.013,.006,mat('#514a43'),0,hh*.44,.013,.013,8).rotation.x=Math.PI/2;
      }else{
        const support=mesh(item,new T.TorusGeometry(i===5?.13:.105,.011,6,16),steel,0,0,.018);
        support.castShadow=false;
      }
      rod(item,[0,hh*.57,-.02],[0,hh*.57,.11],.009,steel);
      const art=mesh(item,new T.PlaneGeometry(ww,hh),accessoryFaces[i],0,0,.045);
      art.castShadow=false;
    });
    const island=table(p,.3,.5,1.2,.8,.75);
    for(const [pile,x,z,count,color] of [[0,-.36,-.12,3,'#5b7190'],[2,-.04,.19,2,'#b19b83']]){
      const clothMat=fabric(color);
      for(let layer=0;layer<count;layer++){
        const folded=soft(island,.31+(layer%2)*.035,.055,.29-(layer%2)*.018,clothMat,x+(layer%2)*.014,.84+layer*.054,z+(layer%2)*.012,.018);
        folded.rotation.y=(pile-1)*.09+(layer%2)*.035;
        soft(island,.115,.015,.15,clothMat,x-.075,.875+layer*.054,z+.062,.008);
        const print=mesh(island,new T.PlaneGeometry(.28,.24),foldFaces[(pile*3+layer)%12],x,.872+layer*.054,z);print.rotation.x=-Math.PI/2;print.rotation.z=(pile-1)*.09;print.castShadow=false;
      }
    }
    const side=group(p,w/2-.27,0,.15,-Math.PI/2),shoeSpots=[];
    for(const y of [.48,1.03,1.58]){
      box(side,2.15,.055,y===1.03?.58:.34,timber,0,y,0);
      for(const x of [-.78,-.26,.26,.78]){
        if(y===1.03&&x>0)continue;
        shoeSpots.push({x,y,k:(Math.round((x+1)*3)+Math.round(y*4))%4});
      }
    }
    new GLTFLoader().load('./blender_assets/canvas_sneaker_v1.glb?v=74-multisurface-uv',gltf=>{
      const uvColors=['blue','rose','sand','slate'];
      const uvMaps=uvColors.map(color=>{
        const texture=new T.TextureLoader().load('./blender_assets/canvas_sneaker_uv_'+color+'.png?v=74');
        texture.colorSpace=T.SRGBColorSpace;
        texture.flipY=false; // glTF UV coordinates are already flipped for Three.js.
        texture.anisotropy=8;
        return texture;
      });
      const variantMaterials=new Map();
      for(const {x,y,k} of shoeSpots){
        const shoe=gltf.scene.clone(true);shoe.position.set(x,y+.029,.02);
        // Blender +X is the toe; turn it toward the shopper-facing shelf edge.
        shoe.rotation.y=-Math.PI/2;shoe.scale.setScalar(.86);
        shoe.traverse(o=>{if(!o.isMesh)return;
          o.castShadow=true;o.receiveShadow=true;
          const name=o.material.name,key=k+':'+name;
          if(!variantMaterials.has(key)){
            const m=o.material.clone();
            m.map=uvMaps[k];
            m.color.set('#ffffff');
            m.needsUpdate=true;
            variantMaterials.set(key,m);
          }
          o.material=variantMaterials.get(key);
        });
        side.add(shoe);
      }
      document.querySelector('#scene').dataset.fashionShoes='ready';
    },undefined,error=>{
      console.error('帆布鞋 Blender 模型加载失败，使用简化后备鞋',error);
      for(const {x,y,k} of shoeSpots)sneaker(side,x,y+.029,.02,k);
    });
    // One bag is a featured product on the island; the other occupies a real
    // cleared shelf bay, with its base aligned to the shelf surface.
    canvasBag(island,.36,.80,-.04,-.12).scale.setScalar(.74);
    canvasBag(side,.55,1.057,.08,Math.PI/2,1).scale.setScalar(.67);
    fixture(p,w/2-.78,2.65,.38,'#ffe3c2',2.1,'room');
    const curtain=group(p,w/2-.56,0,-d/2+.75);rod(curtain,[-.4,2.45,.15],[.4,2.45,.15],.018,steel);for(let i=0;i<5;i++){const panel=box(curtain,.16,1.55,.045,mat(i%2?'#876977':'#9f8490'),-.3+i*.15,1.65,.17);panel.rotation.y=(i%2?1:-1)*.08;}
    box(p,.75,1.9,.05,steel,w/2-.45,1.13,-d/2+.13);box(p,.65,1.8,.02,new T.MeshStandardMaterial({color:'#c5d6d8',metalness:.22,roughness:.18,emissive:'#839ba2',emissiveIntensity:.22}),w/2-.45,1.13,-d/2+.17);
    const till=table(p,w/2-.6,d/2-.65,.85,.6,.86);box(till,.3,.17,.3,dark,0,1,0);stool(p,w/2-.6,d/2-1.35,'#8a718d');
  }
  function mianpi(p,w,d){
    const bench=group(p,0,0,-d/2+.62);soft(bench,w-.55,.9,.78,mat('#6c8f86'),0,.48,0);box(bench,w-.42,.08,.9,steel,0,.97,0);
    cyl(bench,.36,.045,timber,-.8,1.04,0);for(let i=0;i<7;i++)box(bench,.39,.024,.19,mat('#dcc69b'),-.8,1.08+i*.025,0);box(bench,.035,.13,.26,steel,-.44,1.15,.14);rod(bench,[-.44,1.22,.14],[-.44,1.42,.14],.026,wood);
    for(let i=0;i<4;i++){cyl(bench,.13,.16,steel,.05+i*.34,1.1,.1);cyl(bench,.115,.015,mat(['#9e3b22','#d2c28b','#4c452d','#89a261'][i]),.05+i*.34,1.19,.1);rod(bench,[.05+i*.34,1.17,.1],[.12+i*.34,1.38,.15],.009,steel);}
    for(let i=0;i<4;i++){cyl(bench,.3,.13,steel,1.25,1.14+i*.14,-.15);mesh(bench,new T.TorusGeometry(.29,.018,6,24),iron,1.25,1.2+i*.14,-.15).rotation.x=Math.PI/2;}
    const serve=table(p,-.5,.3,1.7,.65,.85);for(let i=0;i<3;i++){const cx=-.53+i*.53;cyl(serve,.19,.045,cream,cx,.94,0);cyl(serve,.16,.015,mat('#a7542e'),cx,.969,0);for(let n=0;n<8;n++){const curve=new T.CatmullRomCurve3([new T.Vector3(cx-.11,.99+n*.002,-.09+n*.025),new T.Vector3(cx-.03,1.01+n*.002,-.07+n*.023),new T.Vector3(cx+.08,.99+n*.002,-.11+n*.023)]);mesh(serve,new T.TubeGeometry(curve,8,.012,4,false),mat('#d9bd81'));}for(let n=0;n<5;n++)box(serve,.09,.012,.018,mat('#578449'),cx-.07+n*.03,1.04,-.04+n*.023).rotation.y=n*.7;}
    for(const x of [-1.3,1.2]){const t=table(p,x,1.2,.65,.58,.73);stool(p,x,1.7,'#79654d');bottle(t,.15,.78,0,1,.7);}
  }
  function station(p,x,z,angle=0){const g=group(p,x,0,z,angle),desk=table(g,0,0,1.16,.68,.76);crt(desk,0,.8,-.1);box(desk,.49,.025,.17,cream,-.06,.81,.22);for(let r=0;r<3;r++)for(let c=0;c<10;c++)box(desk,.032,.01,.024,mat('#827f72'),-.26+c*.042,.831,.17+r*.04);orb(desk,.045,cream,.38,.83,.23,1,.5,1.3);box(g,.22,.45,.4,cream,.42,.33,-.1);chair(g,0,.65);rod(g,[.2,.7,-.3],[.2,.1,-.3],.012,iron);return g;}
  function cyber(p,w,d,upper){
    for(const x of [-1.75,-.45,.85]){station(p,x,-.6,Math.PI);station(p,x,.5,0);}box(p,3.65,.45,.055,mat('#4b5e64'),-.45,1.02,-.05);
    if(!upper){const cash=table(p,-2.15,1.9,1.25,.6,.82);crt(cash,-.22,.86,0);box(cash,.22,.045,.25,mat('#ae8b57'),.38,.9,.05);stool(p,-2.15,1.25,'#555e68');const rack=shelf(p,1,-d/2+.25,1.55,1.6);for(let r=0;r<3;r++)for(let i=0;i<5;i++)bottle(rack,-.6+i*.3,.25+r*.44,0,i);}
    box(p,1.1,.7,.22,dark,-2.2,2.0,-d/2+.17);for(let i=0;i<8;i++){box(p,.8,.018,.025,steel,-2.2,1.72+i*.07,-d/2+.3);orb(p,.012,mat('#76bc82'),-1.74,1.8+i*.055,-d/2+.3);}
    for(let i=0;i<3;i++)rod(p,[-2.8,.2,-d/2+.18],[1.4,.2+i*.025,-d/2+.18],.012,iron);
    fan(p,-2.6,1.8,-d/2+.5);fan(p,1.6,1.8,-d/2+.5);
  }
  function stairs(p,w,d,upper){const x=w/2-.53;if(!upper){for(let i=0;i<15;i++){const z=1.35-i*.235;box(p,.8,.22*(i+1),.245,mat('#8e8980'),x,.11*(i+1),z);}for(let i=0;i<6;i++){const z=1.35-i*.59,y=.22+i*.55;rod(p,[x-.43,y,z],[x-.43,y+.75,z],.018,iron);}rod(p,[x-.43,.95,1.45],[x-.43,4,-2.0],.023,iron);}else{for(let i=0;i<6;i++)rod(p,[x-.43,.17,-2.1+i*.58],[x-.43,.9,-2.1+i*.58],.018,iron);rod(p,[x-.43,.9,-2.1],[x-.43,.9,.8],.023,iron);}}
  function furnish(p,def,upper=false){({bakery,shop,barber,fashion,mianpi,cyber}[def.kind])?.(p,def.w,def.d,upper);utilities(p,def.w,def.d);if(def.levels>1)stairs(p,def.w,def.d,upper);}
  function architecture(h){const {w,d,kind,levels}=h,p=h.outside;
    for(const x of [-w/2,w/2]){box(p,.22,.15,d+.1,mat('#8b7f6a'),x,.25,0);box(p,.22,.10,d+.1,cream,x,3.15,0);}
    for(let row=0;row<4;row++)for(let j=0;j<5;j++)box(p,.24,.1,.04,mat(j%2?'#966b4e':'#a37d5f'),-w/2+.14+j*.26,.36+row*.115,d/2+.17);
    const side=group(p,w/2+.12,0,-.6,Math.PI/2);box(side,1.1,1.05,.05,mat('#425b5a'),0,2.0,0);for(const x of [-.53,0,.53])box(side,.035,1.08,.055,cream,x,2,.035);for(const y of [1.47,2,2.53])box(side,1.1,.035,.055,cream,0,y,.035);box(side,1.25,.09,.24,mat('#8b8171'),0,1.43,.05);
    const meter=group(p,-w/2-.13,0,.15,-Math.PI/2);soft(meter,.36,.52,.13,mat('#84908b'),0,1.25,0);box(meter,.21,.16,.02,dark,0,1.34,.075);rod(meter,[0,1.5,0],[0,2.95,0],.015,iron);
    for(const f of h.floors){for(let i=0;i<7;i++)box(f.front,w-.4,.045,.035,mat('#849186'),0,2.69+i*.045,d/2+.15);}
    const roof=h.floors[levels-1].roof;
    if(['shop','barber','fashion','mianpi'].includes(kind)){
      const slope=Math.atan2(.6,w/2),span=Math.hypot(w/2,.6);
      for(const side of [-1,1]){const panel=box(roof,span+.04,.09,d+.3,roofFinish,side*w/4,3.73,0);panel.rotation.z=-side*slope;}
      const gable=new T.Shape();gable.moveTo(-w/2,3.3);gable.lineTo(w/2,3.3);gable.lineTo(w/2,3.43);gable.lineTo(0,4.03);gable.lineTo(-w/2,3.43);gable.closePath();
      const gableGeo=new T.ExtrudeGeometry(gable,{depth:.1,bevelEnabled:false});
      for(const z of [-d/2-.05,d/2-.05])mesh(roof,gableGeo,mat(h.color||'#b8ae9b'),0,0,z);
      // One flush ridge cap follows the roof span; the former chain of pale
      // cylinders projected past the eave and looked like a pipe clipping in.
      box(roof,.18,.055,d+.1,mat('#4c5351',.9),0,4.035,0);
    }
    else{for(const x of [-w*.34,w*.34])rod(roof,[x,3.5,-.4],[x,4.3,-.4],.025,iron);rod(roof,[-w*.34,4.3,-.4],[w*.34,4.3,-.4],.012,iron);for(let i=0;i<3;i++){const x=-w*.2+i*w*.2;box(roof,.42,.64,.018,mat(['#b5b2a1','#607d87','#b58c81'][i]),x,3.94,-.4);}}
    if(kind==='barber'){const g=group(p,-w/2+.15,0,d/2+.35);cyl(g,.105,.9,cream,0,1.9,0,.105,24);for(let i=0;i<12;i++){const band=mesh(g,new T.TorusGeometry(.108,.028,5,20),mat(i%2?'#547caa':'#b84f48'),0,1.5+i*.07,0);band.rotation.x=Math.PI/2+.35;}cyl(g,.15,.1,steel,0,1.4,0);cyl(g,.15,.1,steel,0,2.4,0);}
    if(kind==='fashion'){const rack=group(p,w/2-.7,0,d/2+.55);rod(rack,[-.5,.1,0],[-.5,1.6,0],.02,steel);rod(rack,[.5,.1,0],[.5,1.6,0],.02,steel);rod(rack,[-.5,1.6,0],[.5,1.6,0],.02,steel);for(let i=0;i<4;i++){const item=garment(rack,-.36+i*.24,1.16,.045,i,false,(i-1.5)*.08);item.scale.setScalar(.57);}}
    if(kind==='shop'){for(let i=0;i<2;i++){basket(p,-w/2+.5,.13+i*.25,d/2+.65,.8,.5);for(let j=0;j<4;j++)bottle(p,-w/2+.24+j*.17,.18+i*.25,d/2+.65,j);}}
    if(['tea','noodles','bakery','mianpi','fashion','barber','bookshop','cyber'].includes(kind)){
      // Bicycles and most utility clutter occupy the right edge of the facade.
      // This stays on the left edge, leaving the entrance and walking route open.
      sidewalkBoard(p,-w/2+.43,d/2+.56,kind);
    }
    if(kind==='shop'||kind==='bakery'||kind==='bookshop'){
      const x=w/2-.35,z=d/2+.22;
      stockBox(p,x,z,.36,.25,.35);
      if(kind==='shop')stockBox(p,x-.05,z-.05,.31,.18,.29);
      if(kind==='bookshop'){
        const positions=[[-.08,.275,-.10,-.10],[.07,.302,.04,.13],[-.02,.329,.01,-.05]];
        positions.forEach(([dx,y,dz,angle],i)=>{
          const book=group(p,x+dx,y,z+dz,angle);
          const coverIndex=[2,4,10][i];
          box(book,.29,.024,.38,[paperEdge,paperEdge,bookCovers[coverIndex],bookBacks[coverIndex],paperEdge,bookSpines[coverIndex]],0,0,0);
        });
      }
    }
  }
  function soupToppings(parent,x,variant){
    // The photograph reads as a shallow bed of broth and seasoning; each
    // recognizable ingredient is a separate volume above that surface.
    const food=group(parent,x,1.105,0);
    const ball=soupIngredientMaterials[variant?3:0],tofu=soupIngredientMaterials[1],leaf=soupIngredientMaterials[2],chili=mat('#a9472d',.52);
    for(const [dx,dz,r] of [[-.075,-.23,.048],[.078,-.15,.052],[-.055,.035,.055],[.085,.18,.045]])
      orb(food,r,ball,dx,.026,dz,1,.86,1.05);
    for(const [dx,dz,angle] of [[-.09,.21,-.38],[.075,-.02,.48]]){
      const greens=orb(food,.085,leaf,dx,0,dz,1,.17,.65);greens.rotation.y=angle;
      const rib=rod(food,[dx-.045,.018,dz-.025],[dx+.05,.026,dz+.045],.006,mat('#9eaf6a'));
      rib.castShadow=false;
    }
    for(const [dx,dz] of [[.005,-.30],[-.015,.29]]){
      const cube=soft(food,.073,.05,.09,tofu,dx,.005,dz,.012);cube.rotation.y=variant?.24:-.23;
    }
    for(const [dx,dz] of [[-.105,-.05],[.115,.285]]){
      const pepper=orb(food,.021,chili,dx,.045,dz,1,.45,1.55);pepper.rotation.y=.7;
    }
    const lotus=mesh(food,new T.TorusGeometry(.043,.014,6,16),tofu,-.008,.024,.115);lotus.rotation.x=Math.PI/2;
    const mushroom=orb(food,.057,soupIngredientMaterials[3],.095,.022,-.285,1,.42,1);mushroom.rotation.z=.18;
  }
  function stall(parent,x,z,type){const g=group(parent,x,.1,z,type==='fried'?.14:-.18),soup=type==='soup',c=soup?'#9e493c':'#567e85';
    soft(g,soup?2.15:1.85,.8,.95,mat(c),0,.55,0);box(g,soup?2.25:1.95,.07,1.03,steel,0,.99,0);
    for(const xx of [-.7,.7]){const wh=mesh(g,new T.TorusGeometry(.23,.04,7,20),iron,xx,.22,.39);for(let j=0;j<6;j++){const q=j*Math.PI/3;rod(g,[xx,.22,.39],[xx+Math.cos(q)*.2,.22+Math.sin(q)*.2,.39],.008,steel);}}
    if(soup){cyl(g,.32,.35,steel,-.58,1.2,0);cyl(g,.29,.015,mat('#a86631'),-.58,1.38,0);for(let i=0;i<2;i++){const xx=.24+i*.44;box(g,.40,.075,.72,steel,xx,1.05,0);box(g,.36,.006,.68,mat(i?'#67533e':'#634632',.42),xx,1.092,0);soupToppings(g,xx,i);for(let n=0;n<3;n++){const x=xx-.13+n*.1;rod(g,[x,1.12,-.16],[x+.06,1.16,.22],.007,wood);}}}
    else{box(g,.66,.24,.66,steel,-.43,1.1,0);box(g,.53,.015,.54,mat('#5b3f22'),-.43,1.24,0);box(g,.72,.06,.73,steel,.48,1.07,.02);const food=mesh(g,new T.PlaneGeometry(.67,.68),friedTrayMaterial,.48,1.106,.02);food.rotation.x=-Math.PI/2;food.castShadow=false;for(let i=0;i<4;i++){rod(g,[.23+i*.15,1.14,-.25],[.23+i*.15,1.14,.4],.009,wood);for(let j=0;j<2;j++)orb(g,.047,mat(j%2?'#c7924c':'#a86a38'),.23+i*.15,1.165,-.08+j*.18);}cyl(g,.18,.56,mat('#776c5a'),-1.18,.3,-.1);rod(g,[-1.18,.55,-.1],[-.65,.8,-.1],.025,iron);}
    if(soup){for(const xx of [-.95,.95])for(const zz of [-.4,.4])rod(g,[xx,1,zz],[xx,2.25,zz],.025,iron);for(let i=0;i<12;i++)box(g,.2,.05,1.5,mat(i%2?c:'#c4ab7b'),-1.1+i*.2,2.28,0);}
    else{rod(g,[0,.1,-.6],[0,2.45,-.6],.025,iron);const canopy=mesh(g,new T.ConeGeometry(1.5,.47,8,1,true),mat('#667c93'),0,2.48,-.6);canopy.rotation.y=.2;}
    label(g,soup?'麻 辣 烫':'现 炸 串 串',1.55,.35,c,'#e6cf9b',75).position.set(0,.6,.49);fixture(g,0,2.14,0,'#ffcd8f',3,'street');stool(g,1.4,.7,c);basket(g,-1.3,0,.5,.55,.4);return g;
  }
  return {furnish,architecture,stall,basket,bottle,soft};
}
