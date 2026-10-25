import {texturePath} from './texture-format.js';
import * as T from './vendor/three.module.js';
import {createMilkTeaCup} from './milk-tea-kit.js?v=47-texture-format-fallback';

// Object photography and period typography are deliberately separate layers:
// generated images provide the goods, while canvas keeps Chinese copy exact.
const atlasFiles={tea:'tea-objects-atlas-v1.webp',noodles:'food-objects-atlas-v1.webp',mianpi:'food-objects-atlas-v1.webp',bakery:'food-objects-atlas-v1.webp',shop:'shop-products-atlas-v1.webp',fashion:'fashion-garments-atlas-v1.webp',bookshop:'rental-books-atlas-v1.webp'};
const foodLoader=new T.TextureLoader();
const mealTexture={
  noodles:foodLoader.load(texturePath('./textures/fast/noodle-soup-top-uv-v1.webp')),
  mianpi:foodLoader.load(texturePath('./textures/fast/mianpi-top-uv-v1.webp'))
};
for(const [kind,tex] of Object.entries(mealTexture)){tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;if(kind==='mianpi'){tex.repeat.set(.91,.91);tex.offset.set(.045,.045);}}
const mealMaterials=Object.fromEntries(Object.entries(mealTexture).map(([kind,map])=>[kind,new T.MeshStandardMaterial({map,roughness:.57,side:T.DoubleSide})]));
const bowlProfile=[new T.Vector2(.11,0),new T.Vector2(.16,.025),new T.Vector2(.202,.10),new T.Vector2(.215,.14)];
const bowlGeometry=new T.LatheGeometry(bowlProfile,32),mealGeometry=new T.CircleGeometry(.198,40),bowlRimGeometry=new T.TorusGeometry(.214,.011,8,40);
const bowlMaterial=new T.MeshStandardMaterial({color:'#dfdbcc',roughness:.58}),rimMaterial=new T.MeshStandardMaterial({color:'#e9e5d9',roughness:.43});
const loaded={};
for(const [kind,file] of Object.entries(atlasFiles)){
  if(loaded[file])continue;
  const image=new Image();image.src=texturePath('./textures/fast/'+file);loaded[file]=image;
}
const specs={
  tea:{title:'七杯茶',sub:'放学路上 · 来一杯',items:['珍珠奶茶  3元','红豆奶茶  4元','柠檬绿茶  3元'],photos:[0,1,2,4],paper:'#e9dcb9',ink:'#315c51'},
  noodles:{title:'小玲米线',sub:'小锅现煮 · 热汤鲜香',items:['牛肉米线  6元','酸菜米线  5元','麻辣米线  5元'],photos:[0,1,2,3],paper:'#e9d5b3',ink:'#8a4230'},
  mianpi:{title:'汉中擀面皮',sub:'现拌 · 加辣可选',items:['擀面皮  4元','加菜  1元','加蛋  1元'],photos:[4,5,6,7],paper:'#dfd7bd',ink:'#694638'},
  bakery:{title:'面包坊',sub:'新鲜出炉 · 放学点心',items:['奶油面包  2元','香葱面包  2元','甜甜圈  2元'],photos:[12,13,14,15],paper:'#ead8bd',ink:'#814a39'},
  shop:{title:'红星小卖部',sub:'零食 · 饮料 · 文具',items:['汽水  2元','饼干  1元起','作业本  1元'],photos:[5,1,12,14],paper:'#ded9bb',ink:'#3d6056'},
  fashion:{title:'火星地带',sub:'青春衣橱 · 2005',items:['印花 T 恤  25元起','牛仔外套  68元','围巾饰品  8元起'],photos:[0,6,13,14],paper:'#ded0d7',ink:'#61435e'},
  barber:{title:'青春理发',sub:'男生女生 · 学生优惠',items:['学生剪发  8元','洗剪吹  12元','刘海修剪  3元'],paper:'#cfdcd4',ink:'#365f5a'},
  cyber:{title:'星光网吧',sub:'营业时间 08:00—23:00',items:['上网  2元/小时','包夜  8元','冰红茶  2元'],paper:'#d2d9d2',ink:'#315363'},
  bookshop:{title:'诸葛亮读书社',sub:'漫画 · 小说 · 学习资料',items:['漫画借阅  1元/本','旧书交换  请询店主','作文选  5元起'],photos:[0,2,5,10],paper:'#e2d2ae',ink:'#66503a'}
};
function art(kind,variant){
  const s=specs[kind],canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;
  const g=canvas.getContext('2d'),tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
  const draw=()=>{
    g.fillStyle=s.paper;g.fillRect(0,0,512,768);
    for(let i=0;i<1500;i++){g.fillStyle=i%3?'#594a2a0b':'#fff8e522';g.fillRect((i*131)%512,(i*71)%768,3,2);}
    // The sheet itself is the paper edge; a printed double border read as a frame.
    g.fillStyle=s.ink+'22';g.fillRect(36,163,440,2);
    g.fillStyle=s.ink;g.textAlign='center';g.font='bold 52px "Songti SC",serif';g.fillText(s.title,256,103);
    g.font='23px "Songti SC",serif';g.fillText(s.sub,256,148);
    const img=loaded[atlasFiles[kind]];
    if(img?.complete&&img.naturalWidth){
      for(let q=0;q<2;q++){
        const index=s.photos[(variant*2+q)%s.photos.length],sx=(index%4)*img.width/4,sy=Math.floor(index/4)*img.height/4;
        g.drawImage(img,sx+3,sy+3,img.width/4-6,img.height/4-6,51+q*208,181,202,207);
      }
    }else if(kind==='cyber'){
      g.fillStyle='#394b5e';g.fillRect(54,183,404,210);g.fillStyle='#b9ccce';g.fillRect(84,205,344,155);
      g.fillStyle='#576786';for(let i=0;i<4;i++)g.fillRect(102+i*80,231,58,71);
    }else if(kind==='barber'){
      g.fillStyle='#53766d';for(let i=0;i<8;i++)g.fillRect(65+i*50,186,24,207);
      g.fillStyle='#c1d0be';g.font='bold 42px sans-serif';g.fillText('✂  青春理发',256,312);
    }else{
      g.fillStyle='#8d7860';g.fillRect(65,190,382,195);g.fillStyle='#efe5c8';g.font='bold 42px serif';g.fillText('漫 画 · 书 籍',256,310);
    }
    g.fillStyle=s.ink;g.font='bold 28px "Songti SC",serif';g.textAlign='left';
    s.items.forEach((line,i)=>{const y=465+i*76;g.fillText(line,58,y);g.fillRect(58,y+16,397,1);});
    g.textAlign='center';g.font='18px sans-serif';g.fillText('2005 · 校门口',256,710);
    tex.needsUpdate=true;
  };
  draw();const img=loaded[atlasFiles[kind]];if(img&&!img.complete)img.addEventListener('load',draw,{once:true});
  return tex;
}
const mediaPosterSlots=[];
const mediaSources={tv:new Image(),game:new Image()};
mediaSources.tv.src=texturePath('./textures/fast/fictional-tv-stills-v1.webp');
mediaSources.game.src=texturePath('./textures/fast/fictional-cyber-screens-v1.webp');
function mediaPoster(kind,variant){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;
  const g=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const source=kind==='cyber'?mediaSources.game:(loaded[atlasFiles[kind]]||mediaSources.tv);
  const titles={tea:['今日特饮','夏日冰茶'],noodles:['热汤米线','小锅现煮'],mianpi:['现拌擀面皮','辣椒香醋'],bakery:['每日出炉','放学点心'],shop:['零食上新','冰饮文具'],fashion:['换季新衣','学生搭配'],barber:['学生剪发','洗剪吹'],bookshop:['借阅新书','本周书架'],cyber:['网络对战','游戏之夜']};
  const title=(titles[kind]||['店内告示','今日供应'])[variant];
  const draw=()=>{g.fillStyle='#e7ddc9';g.fillRect(0,0,512,768);
    if(source.complete&&source.naturalWidth){const columns=kind==='cyber'||kind==='barber'?2:4,i=(variant*3+kind.length)% (columns*columns),tw=source.width/columns,th=source.height/columns;g.drawImage(source,(i%columns)*tw,Math.floor(i/columns)*th,tw,th,0,0,512,632);}
    else{g.fillStyle='#8d786a';g.fillRect(0,0,512,632);}
    g.fillStyle='#eadcbb';g.fillRect(0,632,512,136);g.fillStyle='#3b3936';g.textAlign='center';g.font='bold 57px "Songti SC",serif';g.fillText(title,256,691);g.font='23px serif';g.fillText('2005 · 放学以后',256,731);texture.needsUpdate=true;};
  draw();source.addEventListener('load',draw,{once:true});mediaPosterSlots.push({canvas,texture,draw});return texture;
}
export function applyAuthorizedPosters(files){
  const images=[...files].filter(f=>f.type.startsWith('image/')).slice(0,12);
  images.forEach((file,i)=>{const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{for(let k=i;k<mediaPosterSlots.length;k+=images.length){const slot=mediaPosterSlots[k],c=slot.canvas,g=c.getContext('2d');g.fillStyle='#e5dbc8';g.fillRect(0,0,c.width,c.height);const scale=Math.max(470/image.width,715/image.height),sw=470/scale,sh=715/scale;g.drawImage(image,(image.width-sw)/2,(image.height-sh)/2,sw,sh,21,21,470,715);slot.texture.needsUpdate=true;}URL.revokeObjectURL(url);};image.src=url;});
  return images.length;
}
export function addPeriodPrints(parent,def){
  const kind=def.kind,s=specs[kind];if(!s)return;
  // Papers occupy irregular gaps on the front halves of both side walls.
  // Give the price list, promo and smaller handbill their own sizes and tilts;
  // none is a framed picture or a floating billboard.
  const seed=kind.split('').reduce((n,ch)=>n+ch.charCodeAt(0),0);
  const placements=[
    {side:-1,y:1.41+(seed%3)*.09,back:.48,w:.55,h:.77,angle:-.028,type:'prices',variant:0},
    {side:-1,y:2.39+(seed%4)*.045,back:1.05,w:.43,h:.61,angle:.041,type:'promo',variant:0},
    {side: 1,y:1.65+((seed+2)%4)*.075,back:.34,w:.50,h:.69,angle:-.047,type:'prices',variant:1},
    {side: 1,y:2.43-((seed+1)%3)*.07,back:.90,w:.31,h:.43,angle:.055,type:'promo',variant:1}
  ];
  for(const place of placements){
    const sheet=new T.Group();sheet.position.set(place.side*(def.w/2-.105),place.y,def.d/2-place.back);sheet.rotation.y=place.side<0?Math.PI/2:-Math.PI/2;sheet.rotation.z=place.angle;parent.add(sheet);
    const geo=new T.PlaneGeometry(place.w,place.h,3,3),pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setZ(i,.006*Math.abs(pos.getX(i))/(place.w/2)+.004*Math.abs(pos.getY(i))/(place.h/2));
    geo.computeVertexNormals();
    const map=place.type==='prices'?art(kind,place.variant):mediaPoster(kind,place.variant);
    const paper=new T.Mesh(geo,new T.MeshStandardMaterial({map,roughness:.96,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}));paper.position.z=.022;paper.castShadow=false;sheet.add(paper);
  }
}

export function shopSignTexture(def,text){
  const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');
  g.fillStyle=def.sign;g.fillRect(0,0,1024,256);
  const kind=def.kind,ink=def.ink||'#f0d5aa';
  if(['tea','noodles','mianpi','bakery'].includes(kind)){
    g.fillStyle=kind==='tea'?'#315b51':kind==='noodles'?'#914532':kind==='mianpi'?'#5b4d3b':'#864e42';
    g.fillRect(0,0,168,256);g.fillRect(856,0,168,256);
    g.fillStyle='#f2e3bc';g.textAlign='center';g.font='bold 92px serif';g.fillText(({tea:'茶',noodles:'米',mianpi:'面',bakery:'麦'})[kind],84,155);g.fillText('✦',940,155);
    g.strokeStyle=ink;g.lineWidth=6;g.strokeRect(183,18,657,219);
  }else if(kind==='cyber'){
    g.fillStyle='#272943';g.fillRect(0,0,1024,256);g.strokeStyle='#e18bd3';g.lineWidth=11;g.strokeRect(20,21,984,215);g.fillStyle='#e18bd3';for(let i=0;i<6;i++)g.fillRect(38+i*24,45,11,11);
  }else if(kind==='fashion'){
    g.fillStyle='#59435f';g.fillRect(0,0,1024,256);g.strokeStyle='#dec5b1';g.lineWidth=3;g.strokeRect(17,17,990,222);g.font='66px serif';g.fillStyle='#ecc4c6';g.fillText('★',70,158);g.fillText('★',958,158);
  }else if(kind==='shop'){
    g.fillStyle='#476856';g.fillRect(0,0,1024,256);g.fillStyle='#e9d790';for(let i=0;i<13;i++)g.fillRect(i*80,0,42,19);
  }else if(kind==='barber'){
    g.fillStyle='#315d56';g.fillRect(0,0,1024,256);g.fillStyle='#e4e2bf';g.font='bold 80px serif';g.fillText('✂',79,158);
  }else if(kind==='bookshop'){
    g.fillStyle='#5c4c36';g.fillRect(0,0,1024,256);g.fillStyle='#e4bd79';g.fillRect(0,0,1024,12);g.fillRect(0,244,1024,12);
  }
  g.fillStyle=kind==='cyber'?'#ffe0f2':ink;g.textAlign='center';
  g.font=`bold ${kind==='fashion'?87:kind==='cyber'?88:kind==='tea'?96:82}px "Songti SC","SimSun",serif`;
  g.fillText(text,512,137,kind==='tea'||kind==='mianpi'||kind==='noodles'||kind==='bakery'?650:850);
  g.font='27px "Songti SC",serif';g.fillText(({tea:'珍珠奶茶 · 冰饮',noodles:'小锅米线 · 热汤',mianpi:'汉中风味 · 现拌',bakery:'每日现烤 · 面包点心',cyber:'INTERNET · 2005',fashion:'服饰 · 饰品 · 新潮',shop:'零食 · 饮料 · 文具',barber:'洗剪吹 · 学生优惠',bookshop:'漫画 · 书籍 · 阅读'})[kind],512,215,760);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return tex;
}

export function addPhotographicGoods(parent,def){
  const kind=def.kind;
  if(kind==='tea'){
    // One cup archetype; the visible products vary by wrapped skin, not by a flat photo.
    for(let i=0;i<3;i++){
      const cup=createMilkTeaCup(i);
      cup.scale.setScalar(.72);
      cup.position.set(-.25+i*.25,1.035,.82);
      parent.add(cup);
    }
  }
  if(kind==='noodles'||kind==='mianpi'){
    // In the mianpi shop the prep counter already carries loose ingredients.
    // Finished bowls belong on the two dining tables, clear of those toppings.
    const positions=kind==='noodles'?[[-1.15,.87,1.1],[1.2,.87,1.1]]:[[-1.45,.77,1.16],[1.05,.77,1.16]];
    for(let i=0;i<positions.length;i++){
      const dish=new T.Group();dish.position.set(...positions[i]);parent.add(dish);
      const bowl=new T.Mesh(bowlGeometry,bowlMaterial);bowl.castShadow=true;bowl.receiveShadow=true;dish.add(bowl);
      const rim=new T.Mesh(bowlRimGeometry,rimMaterial);rim.rotation.x=Math.PI/2;rim.position.y=.14;dish.add(rim);
      const food=new T.Mesh(mealGeometry,mealMaterials[kind]);food.rotation.x=-Math.PI/2;food.rotation.z=i*.38;food.position.y=.128;dish.add(food);
      if(kind==='noodles'&&i===1){const chili=new T.MeshStandardMaterial({color:'#ac3f1f',roughness:.5,transparent:true,opacity:.84});for(let n=0;n<5;n++){const drop=new T.Mesh(new T.SphereGeometry(.022+n%2*.008,8,4),chili);drop.scale.y=.2;drop.position.set(Math.sin(n*2.2)*.12,.133,Math.cos(n*2.2)*.11);dish.add(drop);}}
    }
  }
  // Bakery goods are already modeled on the racks and in the display case by
  // district-details. A second photographic set here overlapped those meshes.
}
