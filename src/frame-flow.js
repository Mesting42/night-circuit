import {angle,clamp,lerp} from './math.js';

// Rendering interpolates between fixed 120 Hz simulation states. Physics and
// race results remain independent of the browser's repaint frequency.
export class RenderMotion {
 constructor(){this.previous=[];this.poses=[];}
 reset(cars=[]){this.previous=cars.map(c=>({x:c.x,z:c.z,yaw:c.yaw,speed:c.speed,vx:c.vx,vz:c.vz}));this.poses=this.previous.map(p=>({...p}));}
 capture(cars){if(this.previous.length!==cars.length)this.reset(cars);for(let i=0;i<cars.length;i++){const c=cars[i],p=this.previous[i];p.x=c.x;p.z=c.z;p.yaw=c.yaw;p.speed=c.speed;p.vx=c.vx;p.vz=c.vz;}}
 sample(cars,alpha=1){
  if(this.previous.length!==cars.length)this.reset(cars);
  for(let i=0;i<cars.length;i++){
   const c=cars[i],p=this.previous[i],v=this.poses[i];
   const t=Math.hypot(c.x-p.x,c.z-p.z)>8?1:clamp(alpha,0,1);
   v.x=lerp(p.x,c.x,t);v.z=lerp(p.z,c.z,t);v.yaw=p.yaw+angle(c.yaw-p.yaw)*t;
   v.speed=lerp(p.speed,c.speed,t);v.vx=lerp(p.vx,c.vx,t);v.vz=lerp(p.vz,c.vz,t);
  }
  return this.poses;
 }
}

// Reduce secondary effects gradually; never reduce the user's pixel ratio.
// Cadence is observed browser timing, not a claim about the monitor's Hz.
export class VisualBudget {
 constructor(){this.level=1;this.target=1/60;this.warmup=0;this.slow=0;this.good=0;this.fast=0;this.samples=0;this.changed=false;}
 update(dt,work=0){
  this.changed=false;
  if(dt<=0||dt>.25)return this.level;
  this.warmup+=dt;if(this.warmup<2)return this.level;
  if(dt>=1/500&&dt<this.target*.9){this.fast+=dt;if(this.fast>.25){this.target=Math.max(1/360,dt);this.fast=0;}}else this.fast=0;
  const overloaded=dt>Math.max(this.target*1.65,1/45)||work>this.target*.85;
  this.samples++;
  if(overloaded){this.slow+=dt;this.good=0;}else{this.good+=dt;this.slow=Math.max(0,this.slow-dt*2);}
  if(this.slow>=1.5&&this.samples>=20&&this.level<2){this.level++;this.slow=0;this.good=0;this.samples=0;this.changed=true;}
  else if(this.good>=8&&work<this.target*.55&&this.level>0){this.level--;this.good=0;this.slow=0;this.samples=0;this.changed=true;}
  return this.level;
 }
 get effects(){return[{radius:320,weather:1,shadowHz:60},{radius:240,weather:.65,shadowHz:30},{radius:160,weather:.35,shadowHz:15}][this.level];}
}
