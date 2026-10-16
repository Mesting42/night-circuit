import {clamp,mod,lerp,angle} from './math.js';
export const TRACKS=[
 {id:'harbor',name:'雨港仓道',area:'南湾港口',desc:'开阔长弧接仓库折角。先学会刹车，再找准出弯时机。',width:23,scale:1.42,theme:'harbor',color:'#65bfc5',laps:3,points:[[0,0],[0,150],[75,215],[195,205],[245,130],[240,30],[340,-35],[320,-155],[205,-190],[90,-140],[0,-140],[-45,-65]]},
 {id:'oldtown',name:'灯市旧街',area:'永宁街区',desc:'连续小弯穿过旧城灯市，轻量车的灵巧在这里派上用场。',width:20,scale:1.45,theme:'oldtown',color:'#ec9a57',laps:3,points:[[0,0],[0,130],[65,190],[145,160],[145,65],[225,65],[275,135],[355,110],[370,-20],[290,-80],[285,-180],[170,-210],[100,-140],[0,-160],[-65,-70]]},
 {id:'viaduct',name:'临江高架',area:'滨江引道',desc:'沿江快速路与大半径回转，稳住车身后释放氮气。',width:24,scale:1.5,theme:'viaduct',color:'#89a8e0',laps:3,points:[[0,0],[0,200],[90,265],[240,265],[335,170],[335,45],[250,-20],[310,-125],[245,-215],[90,-215],[-30,-125]]},
 {id:'industry',name:'钢火工业环',area:'东区工厂',desc:'长直道尽头是紧凑回头弯，制动点决定下一段的速度。',width:22,scale:1.45,theme:'industry',color:'#d6b84d',laps:3,points:[[0,0],[0,230],[85,270],[160,200],[150,80],[240,75],[285,210],[370,215],[410,80],[370,-80],[275,-150],[210,-70],[135,-180],[15,-155],[-45,-65]]},
 {id:'coast',name:'雾岬海岸',area:'青岬公路',desc:'沿海发卡与连续弧线，短漂移后尽快恢复轮胎抓地。',width:20,scale:1.4,theme:'coast',color:'#7fb599',laps:3,points:[[0,0],[0,150],[70,210],[145,165],[145,55],[220,20],[275,100],[355,90],[390,-20],[330,-140],[250,-195],[145,-180],[90,-100],[-20,-155],[-80,-85]]},
 {id:'metro',name:'午夜城市环',area:'中央商务区',desc:'宽阔主街、高速弧和压轴 S 弯。城市段压轴，留好每一罐氮气。',width:24,scale:1.55,theme:'metro',color:'#bca4de',laps:3,points:[[0,0],[0,200],[90,275],[230,260],[315,180],[300,65],[395,-10],[360,-130],[245,-200],[130,-195],[70,-95],[-35,-120],[-85,-50]]},
 {id:'forest',name:'松岚山径',area:'北岭森林',desc:'雨雾穿过针叶林与岩壁，连续中速弯考验走线。出弯摆正车身，再驶向林间直道。',width:22,scale:1.5,theme:'forest',surfaceGrip:1,surfaceBrake:1,color:'#8dc4a3',laps:3,weather:'细雨 · 林雾',surface:'湿润柏油',points:[[0,0],[0,150],[70,245],[170,270],[260,225],[300,135],[250,60],[335,-30],[345,-150],[235,-235],[100,-245],[35,-170],[-80,-170],[-110,-75]]},
 {id:'canyon',name:'赤岩峡谷',area:'西境荒漠',desc:'暮色下的砂岩峡谷，长直道接收紧回转。干燥路面更适合迅速出弯，氮气留给开阔路段。',width:24,scale:1.55,theme:'canyon',surfaceGrip:1.07,surfaceBrake:1.03,color:'#dfa16e',laps:3,weather:'暮色 · 无雨',surface:'干燥柏油',points:[[0,0],[0,235],[95,300],[245,290],[340,205],[300,95],[380,10],[365,-160],[245,-240],[85,-250],[-65,-165],[-75,-55]]},
 {id:'alpine',name:'霜湖雪岭',area:'极北冰湖',desc:'环绕冰湖的雪岭公路，开阔长弧与回转交替。路肩积雪，低温路面需要更早制动。',width:23,scale:1.5,theme:'alpine',surfaceGrip:.88,surfaceBrake:.94,color:'#b3d9ed',laps:3,weather:'月夜 · 轻雪',surface:'低温柏油',points:[[0,0],[0,180],[95,280],[260,270],[375,150],[365,10],[285,-70],[340,-185],[245,-260],[80,-230],[-70,-125],[-65,-30]]}
];
function catmull(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);}
export class Track {
 constructor(def){Object.assign(this,def);this.version='route-1';this.samples=[];const ps=def.points,n=ps.length;for(let i=0;i<n*64;i++){let k=Math.floor(i/64),t=i%64/64;this.samples.push({x:catmull(ps[mod(k-1,n)][0],ps[k][0],ps[(k+1)%n][0],ps[(k+2)%n][0],t)*def.scale,z:catmull(ps[mod(k-1,n)][1],ps[k][1],ps[(k+1)%n][1],ps[(k+2)%n][1],t)*def.scale,s:0});}
 this.length=0;for(let i=0;i<this.samples.length;i++){let p=this.samples[i],q=this.samples[(i+1)%this.samples.length];p.s=this.length;p.len=Math.hypot(q.x-p.x,q.z-p.z);p.tx=(q.x-p.x)/p.len;p.tz=(q.z-p.z)/p.len;p.yaw=Math.atan2(p.tx,p.tz);this.length+=p.len;}this.gateCount=32;this.gates=Array.from({length:this.gateCount},(_,i)=>this.at(i*this.length/this.gateCount));
 }
 at(s,offset=0){s=mod(s,this.length);let lo=0,hi=this.samples.length-1;while(lo<hi){let mid=Math.ceil((lo+hi)/2);if(this.samples[mid].s<=s)lo=mid;else hi=mid-1;}const p=this.samples[lo],q=this.samples[(lo+1)%this.samples.length],t=(s-p.s)/p.len;return{x:lerp(p.x,q.x,t)+p.tz*offset,z:lerp(p.z,q.z,t)-p.tx*offset,tx:p.tx,tz:p.tz,yaw:p.yaw,s,index:lo};}
 nearest(x,z,hint=null){let best=null,bestD=Infinity;const n=this.samples.length;let from=hint==null?0:hint-32,to=hint==null?n:hint+33;for(let i=from;i<to;i++){const index=mod(i,n),p=this.samples[index],q=this.samples[(index+1)%n],dx=x-p.x,dz=z-p.z,t=clamp((dx*p.tx+dz*p.tz)/p.len,0,1),px=lerp(p.x,q.x,t),pz=lerp(p.z,q.z,t),d=(x-px)**2+(z-pz)**2;if(d<bestD){bestD=d;best={x:px,z:pz,tx:p.tx,tz:p.tz,yaw:p.yaw,index,s:p.s+p.len*t,lateral:(x-px)*p.tz-(z-pz)*p.tx,distance:Math.sqrt(d)};}}return best;}
 curvature(s,d=12){return Math.abs(angle(this.at(s+d).yaw-this.at(s-d).yaw))/(2*d);}
}
export const tracks=TRACKS.map(t=>new Track(t));


// Existing seasons keep their original route list; new seasons include all routes.
export const LEGACY_ROUTE_IDS=TRACKS.slice(0,6).map(t=>t.id);
export function seasonTracks(season){return (season?.routes||LEGACY_ROUTE_IDS).map(id=>tracks.find(t=>t.id===id));}
