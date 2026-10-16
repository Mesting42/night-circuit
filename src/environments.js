import * as T from 'three';
import {rng,clamp} from './math.js';

// Natural circuits extend the existing night-driving world with authored terrain.
// Forest uses wet stone and dense firs; canyon uses dry strata; alpine exposes a
// real recessed ice lake. All geometry and textures are built locally.
export const ENVIRONMENTS={
 forest:{sky:'#172c35',horizon:'#516f73',fog:.0028,sun:'#b4d5d0',sunIntensity:1.65,ground:'#35493e',shoulder:'#565d4c',road:'#7a8585',roughness:.29,metalness:.34,weather:'rain'},
 canyon:{sky:'#56434b',horizon:'#bb8461',fog:.00155,sun:'#ffd2a0',sunIntensity:2.4,ground:'#a6734c',shoulder:'#ba8657',road:'#978f81',roughness:.88,metalness:.04,weather:'clear'},
 alpine:{sky:'#283f59',horizon:'#829fb4',fog:.0018,sun:'#d7eaff',sunIntensity:2.05,ground:'#bdcdd3',shoulder:'#dae7e8',road:'#6b7c8a',roughness:.43,metalness:.24,weather:'snow'}
};
const mesh=(g,m,parent,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.castShadow=g.type!=='PlaneGeometry'&&!m.transparent;o.position.set(x,y,z);parent.add(o);return o;};
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
function texture(size,draw){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
function bounds(t){const xs=t.samples.map(p=>p.x),zs=t.samples.map(p=>p.z);const x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);return{x0,x1,z0,z1,cx:(x0+x1)/2,cz:(z0+z1)/2,w:x1-x0,d:z1-z0};}
function terrainSampler(t){
 const b=bounds(t),road=t.samples.filter((_,i)=>i%5===0),lake=t.theme==='alpine'?{x:b.cx+12,z:b.cz,rx:b.w*.20,rz:b.d*.225}:null;
 const distance=(x,z)=>{let d=Infinity;for(const p of road)d=Math.min(d,(x-p.x)**2+(z-p.z)**2);return Math.sqrt(d);};
 const height=(x,z,d=distance(x,z))=>{
  const fade=smooth(t.width/2+15,t.width/2+85,d);
  const wave=Math.sin(x*.012+z*.004)*Math.cos(z*.011)+.4*Math.sin(x*.027-z*.019);
  let h=-.13+fade*(t.theme==='canyon'?4.2+wave*3.2:t.theme==='alpine'?3.8+wave*3:2.6+wave*2);
  if(lake){const e=Math.hypot((x-lake.x)/lake.rx,(z-lake.z)/lake.rz);h=h*(smooth(.87,1.16,e))+(-1.1)*(1-smooth(.87,1.16,e));}
  return h;
 };
 return{...b,distance,height,lake};
}
export function buildNaturalGround(renderer,t){
 const env=ENVIRONMENTS[t.theme],land=terrainSampler(t);renderer.land=land;
 const random=rng(137+t.theme.length),tex=texture(512,(c,w)=>{c.fillStyle=env.ground;c.fillRect(0,0,w,w);for(let i=0;i<22000;i++){c.fillStyle=i%2?'rgba(15,22,25,.10)':'rgba(240,224,193,.13)';c.fillRect(random()*w,random()*w,1+random()*3,1+random()*2);}if(t.theme==='forest'){for(let i=0;i<180;i++){c.strokeStyle='rgba(93,113,64,.28)';c.beginPath();const x=random()*w,y=random()*w;c.moveTo(x,y);c.lineTo(x+random()*14,y-3);c.stroke();}}});
 tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(45,45);tex.anisotropy=4;
 const geo=new T.PlaneGeometry(land.w+1300,land.d+1300,164,164);geo.rotateX(-Math.PI/2);geo.translate(land.cx,0,land.cz);
 const pos=geo.attributes.position,colors=[];const low=new T.Color(t.theme==='alpine'?'#9fb5c2':t.theme==='canyon'?'#946044':'#364638'),high=new T.Color(t.theme==='alpine'?'#eef5f1':t.theme==='canyon'?'#e3ba89':'#798467');
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,land.height(x,z));const variation=.5+.22*Math.sin(x*.021)*Math.cos(z*.017);const c=low.clone().lerp(high,variation);colors.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
 const ground=mesh(geo,new T.MeshStandardMaterial({map:tex,vertexColors:true,roughness:t.theme==='forest'?.78:.96,metalness:0}),renderer.group);ground.receiveShadow=true;ground.userData.kind='terrain';
 return land;
}
export function buildNaturalShoulders(renderer,t){
 const env=ENVIRONMENTS[t.theme],random=rng(728),tex=texture(256,(c,w)=>{c.fillStyle=env.shoulder;c.fillRect(0,0,w,w);for(let i=0;i<4500;i++){c.fillStyle=i%3?'rgba(25,30,23,.17)':'rgba(241,226,195,.20)';c.fillRect(random()*w,random()*w,1+random()*2,1+random()*2);}});tex.wrapS=tex.wrapT=T.RepeatWrapping;
 const material=new T.MeshStandardMaterial({map:tex,color:'#d5d5ce',roughness:.95,metalness:0,side:T.DoubleSide});
 for(const side of[-1,1]){
  const vertices=[],uv=[],indices=[],n=t.samples.length;
  for(let i=0;i<=n;i++){const p=t.samples[i%n];for(const [edge,off] of [t.width/2+.25,t.width/2+4.5].entries()){vertices.push(p.x+p.tz*off*side,t.theme==='alpine'?(edge===0?.12:-.03):-.04,p.z-p.tx*off*side);uv.push(edge,i*.065);}}
  for(let i=0;i<n;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const shoulder=mesh(g,material,renderer.group);shoulder.receiveShadow=true;
 }
}
function instanced(parent,geometry,material,items){if(!items.length){geometry.dispose();return;}const m=new T.InstancedMesh(geometry,material,items.length),dummy=new T.Object3D();for(let i=0;i<items.length;i++){const p=items[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx||0,p.yaw||0,p.rz||0);dummy.scale.set(p.w||1,p.h||1,p.d||p.w||1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;}
function pineGeometry(){
 const verts=[],uv=[],ids=[],segments=19,layers=16;
 for(let j=0;j<=layers;j++)for(let k=0;k<=segments;k++){
  const fraction=j/layers,a=k/segments*Math.PI*2;
  const fringe=(j%2===0?1:.62)*(1+.16*Math.sin(k*5.7+j*.9)+.08*Math.cos(k*2.4));
  const r=Math.max(.006,(1-fraction)*fringe);
  verts.push(Math.cos(a)*r,fraction-.5-.017*Math.sin(k*4.6),Math.sin(a)*r);uv.push(k/segments,fraction);
 }
 for(let j=0;j<layers;j++)for(let k=0;k<segments;k++){const a=j*(segments+1)+k,b=a+segments+1;ids.push(a,b,a+1,a+1,b,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();return g;
}
function trees(renderer,t,land,random){
 const trunks=[],needles=[[],[],[]],snow=[],count=t.theme==='forest'?1850:480;
 const needleTex=texture(256,(c,w)=>{c.fillStyle='#b7c9af';c.fillRect(0,0,w,w);for(let i=0;i<10000;i++){const x=random()*w,y=random()*w;c.strokeStyle=i%3?'rgba(32,64,45,.27)':'rgba(230,237,188,.30)';c.lineWidth=.65;c.beginPath();c.moveTo(x,y);c.lineTo(x+2+random()*4,y-1-random()*4);c.stroke();}});
 const place=(x,z)=>{
  const d=land.distance(x,z);if(d<t.width/2+12||d>220)return;
  if(land.lake&&Math.hypot((x-land.lake.x)/land.lake.rx,(z-land.lake.z)/land.lake.rz)<1.2)return;
  const h=8+random()*13,w=2.2+random()*2.1,y=land.height(x,z,d)-.25,yaw=random()*Math.PI*2;
  const trunkWidth=.6+random()*.36;trunks.push({x,y:y+h*.35,z,w:trunkWidth,h:h*.7,d:trunkWidth});
  const crown={x,y:y+h*.58,z,w,h:h*.87,yaw};needles[Math.floor(random()*3)].push(crown);
  if(t.theme==='alpine')snow.push({...crown,y:crown.y+.14,w:crown.w*.81,h:crown.h*.965});
 };
 for(let i=0;i<count;i++)place(land.x0-180+random()*(land.w+360),land.z0-180+random()*(land.d+360));
 if(t.theme==='forest')for(let s=5;s<t.length;s+=12)for(const side of[-1,1]){const p=t.at(s+random()*8,side*(t.width/2+16+random()*18));place(p.x,p.z);}
 instanced(renderer.group,new T.CylinderGeometry(.6,.85,1,7),renderer.common('bark','#514d42',1,0),trunks);
 for(let i=0;i<3;i++)instanced(renderer.group,pineGeometry(),new T.MeshStandardMaterial({color:['#49614c','#597155','#6a835f'][i],map:needleTex,roughness:.95,metalness:0}),needles[i]);
 if(snow.length)instanced(renderer.group,pineGeometry(),renderer.common('fir-snow','#d6e4e6',.95,0),snow);
}
function mountainGeometry(radius,height,random,theme){
 const vertices=[],colors=[],uv=[],indices=[],segments=14,levels=theme==='canyon'?[0,.08,.22,.42,.63,.82,.91,1]:[0,.12,.35,.61,.81,1];
 const color=new T.Color(),base=new T.Color(theme==='canyon'?'#9e6449':theme==='alpine'?'#6c8594':'#3c5355');
 for(let j=0;j<levels.length;j++)for(let k=0;k<=segments;k++){
  const angle=k/segments*Math.PI*2,level=levels[j],ridge=1+.13*Math.sin(k*2.1)+.07*Math.cos(k*4.5);
  const taper=theme==='canyon'?(1-level*.40)*(j%2?1:.97):Math.max(.018,1-level)*ridge;
  const r=radius*taper;vertices.push(Math.cos(angle)*r,height*level*(1+.065*Math.sin(k*2.6)),Math.sin(angle)*r);
  if(theme==='alpine'&&level>.6)color.set('#e0ebed');else if(theme==='canyon'){color.copy(base).multiplyScalar([.88,.99,1.08,.84,1.15,.94,1.18,1][j]);}else color.copy(base).multiplyScalar(.85+level*.55);
  colors.push(color.r,color.g,color.b);uv.push(k/segments,level);
 }
 for(let j=0;j<levels.length-1;j++)for(let k=0;k<segments;k++){const a=j*(segments+1)+k,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
 // A mesa's cap is solid, so overhead chase cameras never see through it.
 const top=(levels.length-1)*(segments+1);for(let k=1;k<segments-1;k++)indices.push(top,top+k+1,top+k);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function rocks(renderer,t,land,random){
 const items=[];
 for(let s=15;s<t.length;s+=t.theme==='canyon'?17:28)for(const side of[-1,1]){
  const radius=t.theme==='canyon'?5+random()*9:2+random()*5,off=t.width/2+10+radius+random()*25,p=t.at(s,off*side),d=land.distance(p.x,p.z);
  if(d<t.width/2+radius+5)continue;if(land.lake&&Math.hypot((p.x-land.lake.x)/land.lake.rx,(p.z-land.lake.z)/land.lake.rz)<1.14)continue;
  items.push({x:p.x,y:land.height(p.x,p.z,d)+radius*.4,z:p.z,w:radius,h:radius*(t.theme==='canyon'?1.6:.65),d:radius*.85,yaw:random()*6.28});
 }
 const strata=t.theme==='canyon'?texture(512,(c,w)=>{
 c.fillStyle='#c7a080';c.fillRect(0,0,w,w);const grain=rng(992);
 for(let y=0;y<w;y+=4+Math.floor(grain()*13)){c.fillStyle=['#795039','#e2bd99','#ac7350','#c99066'][Math.floor(grain()*4)];c.globalAlpha=.4+grain()*.35;c.fillRect(0,y,w,1+grain()*6);}
 c.globalAlpha=1;for(let i=0;i<10000;i++){c.fillStyle=i%2?'#64402c20':'#fff1cd28';c.fillRect(grain()*w,grain()*w,1+grain()*3,1);}
 }):null;
 const material=new T.MeshStandardMaterial({map:strata,vertexColors:true,roughness:.98,metalness:0,flatShading:true});
 if(t.theme==='canyon'){const g=mountainGeometry(1,1,random,'canyon');g.translate(0,-.5,0);instanced(renderer.group,g,material,items);}else instanced(renderer.group,new T.IcosahedronGeometry(1,1),renderer.common('boulders',t.theme==='alpine'?'#7d919a':'#66716b',.96,0),items);
 const ringRadius=Math.max(land.w,land.d)*.65+200;
 for(let i=0;i<22;i++){
  const a=i/22*Math.PI*2,r=ringRadius+random()*100,x=land.cx+Math.cos(a)*r,z=land.cz+Math.sin(a)*r,radius=75+random()*90;
  const d=land.distance(x,z);if(d<radius+t.width/2+20)continue;
  const h=t.theme==='alpine'?140+random()*150:t.theme==='canyon'?65+random()*95:80+random()*90;
  const m=mesh(mountainGeometry(radius,h,random,t.theme),material,renderer.group,x,-2,z);m.rotation.y=random()*6.28;m.userData.kind='mountain';
 }
 if(t.theme==='canyon')for(let s=60;s<t.length;s+=155)for(const side of[-1,1]){
  const radius=18+random()*18,p=t.at(s,side*(t.width/2+radius+32)),d=land.distance(p.x,p.z);if(d<radius+t.width/2+14)continue;
  mesh(mountainGeometry(radius,20+random()*45,random,'canyon'),material,renderer.group,p.x,land.height(p.x,p.z,d)-1,p.z);
 }
}
function iceLake(renderer,land){
 const l=land.lake,random=rng(932),tex=texture(512,(c,w)=>{c.fillStyle='#a2c7d6';c.fillRect(0,0,w,w);for(let i=0;i<90;i++){const x=random()*w,y=random()*w,r=18+random()*55,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#eaf9fa70');g.addColorStop(1,'#d6eef000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);};for(let i=0;i<120;i++){c.strokeStyle=i%4?'rgba(226,249,255,.66)':'rgba(255,255,255,.98)';c.lineWidth=i%4?1.3:3.5;const x=random()*w,y=random()*w;c.beginPath();c.moveTo(x,y);let px=x,py=y;for(let j=0;j<4;j++){px+=(random()-.5)*65;py+=(random()-.5)*65;c.lineTo(px,py);}c.stroke();}});
 const lake=mesh(new T.CircleGeometry(1,96),new T.MeshPhysicalMaterial({map:tex,color:'#e4f1f3',roughness:.32,metalness:.08,clearcoat:.45}),renderer.group,l.x,-.65,l.z);lake.rotation.x=-Math.PI/2;lake.scale.set(l.rx*.96,l.rz*.96,1);lake.userData.kind='ice-lake';
 const shore=[];for(let i=0;i<90;i++){const a=i/90*Math.PI*2,x=l.x+Math.cos(a)*l.rx*1.1,z=l.z+Math.sin(a)*l.rz*1.1;if(land.distance(x,z)<24)continue;shore.push({x,y:land.height(x,z)+.22,z,w:3+random()*4,h:.7+random(),d:3,yaw:a});}
 instanced(renderer.group,new T.IcosahedronGeometry(1,1),renderer.common('ice-shore','#d9e9eb',.9,0),shore);
}
function roadside(renderer,t,land,random){
 const posts=[],caps=[],grass=[],steel=renderer.common('rural-steel','#6f7776',.48,.35),reflector=new T.MeshStandardMaterial({color:'#f3d9a2',emissive:'#d6ba78',emissiveIntensity:.65});
 for(let s=12;s<t.length;s+=18)for(const side of[-1,1]){const p=t.at(s,side*(t.width/2+1.8));posts.push({x:p.x,y:.7,z:p.z,w:.17,h:1.4,d:.17,yaw:p.yaw});caps.push({x:p.x,y:1.3,z:p.z,w:.21,h:.12,d:.22,yaw:p.yaw});}
 renderer.instances(posts,steel);renderer.instances(caps,reflector);
 if(t.theme==='canyon'){
  const cactus=[];for(let s=20;s<t.length;s+=58){const side=random()>.5?1:-1,p=t.at(s,side*(t.width/2+17+random()*20)),d=land.distance(p.x,p.z);if(d<t.width/2+10)continue;const h=2+random()*3,y=land.height(p.x,p.z,d);cactus.push({x:p.x,y:y+h/2,z:p.z,w:.45,h,d:.45});for(const sign of[-1,1]){cactus.push({x:p.x+sign*.65,y:y+h*.55,z:p.z,w:1,h:.28,d:.3});cactus.push({x:p.x+sign*1.04,y:y+h*.68,z:p.z,w:.3,h:h*.3,d:.3});}}
  renderer.instances(cactus,renderer.common('cactus','#627052',.97,0));
 }else if(t.theme==='forest'){
  for(let s=0;s<t.length;s+=4.5)for(const side of[-1,1]){const p=t.at(s,side*(t.width/2+4+random()*5)),d=land.distance(p.x,p.z);if(d<t.width/2+3)continue;grass.push({x:p.x,y:land.height(p.x,p.z,d)+.22,z:p.z,w:.25+random()*.45,h:.4+random()*.45,d:.25,yaw:random()*6.28});}
  instanced(renderer.group,new T.ConeGeometry(1,1,5),renderer.common('undergrowth','#78835d',1,0),grass);
 }
 // Start-area floodlights are sparse: the rural circuits do not inherit city blocks.
 for(const s of[-28,18,65])for(const side of[-1,1]){const p=t.at(s,side*(t.width/2+2.6));const pole=mesh(new T.CylinderGeometry(.1,.14,7,8),steel,renderer.group,p.x,3.5,p.z);const light=mesh(new T.BoxGeometry(.8,.12,.4),new T.MeshStandardMaterial({color:'#fff0cf',emissive:'#ffe1af',emissiveIntensity:2}),renderer.group,p.x,7,p.z);light.rotation.y=p.yaw;}
}
function sky(renderer,t,env){
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color(env.sky)},horizon:{value:new T.Color(env.horizon)}},vertexShader:'varying float vHeight; void main(){vHeight=position.y/1100.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying float vHeight; uniform vec3 top; uniform vec3 horizon; void main(){float f=smoothstep(-.04,.5,vHeight);gl_FragColor=vec4(mix(horizon,top,f),1.);\n#include <tonemapping_fragment>\n #include <colorspace_fragment>\n}'});
 const dome=mesh(new T.SphereGeometry(1100,24,16),material,renderer.group,renderer.land.cx,0,renderer.land.cz);dome.renderOrder=-10;
}
export function buildNaturalScenery(renderer,t){
 const land=renderer.land,random=rng(481+t.theme.length),env=ENVIRONMENTS[t.theme];sky(renderer,t,env);rocks(renderer,t,land,random);if(t.theme!=='canyon')trees(renderer,t,land,random);if(land.lake)iceLake(renderer,land);roadside(renderer,t,land,random);
}
