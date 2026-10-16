import {clamp,angle,dist,mod} from './math.js';
export const STEP=1/120;
export function makeCar(stats,track,index=0){const p=track.at(-10-Math.floor(index/2)*8,index%2?-3.4:3.4);return{...p,id:index,stats,vx:0,vz:0,speed:0,steer:0,slip:0,drifting:false,nitro:stats.capacity,boosting:false,collision:0,wallTime:0,penalty:0,ghost:0,resetCooldown:0,lastGate:0,passed:0,lap:0,lapStart:0,lapTimes:[],finish:null,drift:0,driftChain:0,bestChain:0,clean:0,wrong:0,stuck:0,braking:false,input:{},prevX:p.x,prevZ:p.z};}
export function integrate(c,input,dt,track,assist=true){
 c.input=input;c.prevX=c.x;c.prevZ=c.z;c.collision=Math.max(0,c.collision-dt);c.ghost=Math.max(0,c.ghost-dt);c.resetCooldown=Math.max(0,c.resetCooldown-dt);
 const fX=Math.sin(c.yaw),fZ=Math.cos(c.yaw),rX=fZ,rZ=-fX;let longitudinal=c.vx*fX+c.vz*fZ,lateral=c.vx*rX+c.vz*rZ;
 let target=clamp(input.steer||0,-1,1);c.steer+=(target-c.steer)*Math.min(1,dt*(7+c.stats.stability*2));
 let brake=input.brake?1:0,throttle=brake?0:clamp(input.throttle||0,0,1);c.braking=!!brake;
 c.boosting=!!input.nitro&&c.nitro>0&&throttle>0&&longitudinal>3;
 const dragCoefficient=Math.max(.0001,(c.stats.accel*.45-.035*c.stats.max)/(c.stats.max*c.stats.max));
 const drag=dragCoefficient*longitudinal*Math.abs(longitudinal)+.035*longitudinal;
 let force=throttle*c.stats.accel*(1-.55*clamp(longitudinal/c.stats.max,0,1))-drag;
 if(brake)force-=longitudinal>1?c.stats.brake*(track.surfaceBrake??1):longitudinal>-7?4.8:0;
 if(c.boosting){force+=c.stats.nitro;c.nitro=Math.max(0,c.nitro-dt*26);}
 if(input.handbrake&&longitudinal>8)force-=2.0;
 longitudinal=clamp(longitudinal+force*dt,-7,c.stats.max*(c.boosting?1.13:1));
 const hand=!!input.handbrake&&longitudinal>9;
 const steerAngle=c.steer*c.stats.steer/(1+Math.abs(longitudinal)*.038);
 let yawRate=longitudinal/2.85*Math.tan(steerAngle)*(hand?1.35:1);
 if(assist)yawRate=clamp(yawRate,-1.32,1.32);
 c.yaw=angle(c.yaw+yawRate*dt);
 // Velocity stays in world space as the chassis turns. Tires remove lateral slip gradually.
 const nfX=Math.sin(c.yaw),nfZ=Math.cos(c.yaw),nrX=nfZ,nrZ=-nfX;
 const wx=fX*longitudinal+rX*lateral,wz=fZ*longitudinal+rZ*lateral;
 longitudinal=wx*nfX+wz*nfZ;lateral=wx*nrX+wz*nrZ;
 const grip=c.stats.grip*(track.surfaceGrip??1)*(hand?.18:1)*(assist?1.08:1);
 lateral*=Math.exp(-grip*dt);
 c.vx=nfX*longitudinal+nrX*lateral;c.vz=nfZ*longitudinal+nrZ*lateral;
 c.x+=c.vx*dt;c.z+=c.vz*dt;c.speed=Math.hypot(c.vx,c.vz);c.slip=Math.atan2(lateral,Math.max(1,Math.abs(longitudinal)));
 const road=track.nearest(c.x,c.z,c.index);Object.assign(c,{index:road.index,s:road.s});
 const side=Math.sign(road.lateral)||1,normalX=road.tz*side,normalZ=-road.tx*side;
 const support=1.03*Math.abs(nrX*normalX+nrZ*normalZ)+2.32*Math.abs(nfX*normalX+nfZ*normalZ);
 const penetration=Math.abs(road.lateral)+support-track.width/2;
 if(penetration>0){c.x-=normalX*(penetration+.005);c.z-=normalZ*(penetration+.005);const outward=c.vx*normalX+c.vz*normalZ;if(outward>0){c.vx-=normalX*outward*1.08;c.vz-=normalZ*outward*1.08;const loss=clamp(1-outward*.018,.6,.99);c.vx*=loss;c.vz*=loss;c.collision=Math.max(c.collision,.28);c.driftChain=0;}c.wallTime+=dt;}else c.wallTime=0;
 c.drifting=hand&&c.speed>12&&Math.abs(c.slip)>.09&&Math.abs(c.slip)<1.05&&c.collision===0;
 const forward=c.vx*road.tx+c.vz*road.tz;
 if(c.drifting&&forward>7&&c.ghost===0){let earned=dt*c.speed*Math.abs(c.slip)*7;c.drift+=earned;c.driftChain+=earned;c.nitro=clamp(c.nitro+dt*8*Math.abs(c.slip),0,c.stats.capacity);}else if(!hand){c.bestChain=Math.max(c.bestChain,c.driftChain);c.driftChain=0;}
 if(!c.boosting&&forward>10&&c.collision===0&&c.wallTime===0)c.nitro=clamp(c.nitro+dt*1.7,0,c.stats.capacity);
 c.wrong=forward<-3?c.wrong+dt:Math.max(0,c.wrong-dt*2);c.stuck=c.speed<1.5?c.stuck+dt:0;c.clean=c.collision===0?c.clean+dt:0;
}
export function collideCars(a,b){if(a.ghost>0||b.ghost>0||dist(a,b)>5.5)return;let depth=Infinity,nx=0,nz=0;const dx=b.x-a.x,dz=b.z-a.z;
 for(const yaw of[a.yaw,b.yaw])for(const side of[0,Math.PI/2]){const ax=Math.sin(yaw+side),az=Math.cos(yaw+side);const radius=c=>2.32*Math.abs(Math.sin(c.yaw)*ax+Math.cos(c.yaw)*az)+1.03*Math.abs(Math.cos(c.yaw)*ax-Math.sin(c.yaw)*az);const signed=dx*ax+dz*az,overlap=radius(a)+radius(b)-Math.abs(signed);if(overlap<=0)return;if(overlap<depth){depth=overlap;nx=ax*Math.sign(signed||1);nz=az*Math.sign(signed||1);}}
 const total=a.stats.mass+b.stats.mass,wa=b.stats.mass/total,wb=a.stats.mass/total;a.x-=nx*depth*wa;a.z-=nz*depth*wa;b.x+=nx*depth*wb;b.z+=nz*depth*wb;
 const rel=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(rel<0){const impulse=-rel*1.08;a.vx-=nx*impulse*wa;a.vz-=nz*impulse*wa;b.vx+=nx*impulse*wb;b.vz+=nz*impulse*wb;a.collision=b.collision=.25;a.driftChain=b.driftChain=0;}
}
export function updateGates(c,track,time,laps){if(c.finish!==null||c.ghost>0)return false;const next=(c.lastGate+1)%track.gateCount,g=track.gates[next];const before=(c.prevX-g.x)*g.tx+(c.prevZ-g.z)*g.tz,after=(c.x-g.x)*g.tx+(c.z-g.z)*g.tz;if(before<=0&&after>0){const ratio=-before/(after-before),x=c.prevX+(c.x-c.prevX)*ratio,z=c.prevZ+(c.z-c.prevZ)*ratio;const lateral=(x-g.x)*g.tz-(z-g.z)*g.tx;if(Math.abs(lateral)>track.width/2)return false;c.lastGate=next;c.passed++;if(next===0){c.lap++;const exact=time-(1-ratio)*STEP;c.lapTimes.push(exact+c.penalty-c.lapStart);c.lapStart=exact+c.penalty;if(c.lap>=laps){c.finish=exact+c.penalty;return true;}}}return false;}
export function progress(c,track){const base=c.passed*track.length/track.gateCount;let portion=mod(c.s-c.lastGate*track.length/track.gateCount,track.length);if(portion>track.length*.8)portion=-Math.min(30,track.length-portion);return base+clamp(portion,-30,track.length/track.gateCount-.001);}
export function resetCar(c,track,cars){if(c.resetCooldown>0||c.finish!==null)return false;const base=c.lastGate*track.length/track.gateCount;let spot=null;for(const off of[0,-3.5,3.5,-6,6]){let p=track.at(base+2,off);if(cars.every(o=>o===c||dist(o,p)>7)){spot=p;break;}}spot??=track.at(base+2,0);Object.assign(c,spot,{vx:0,vz:0,speed:0,steer:0,slip:0,drifting:false,boosting:false,ghost:2,penalty:c.penalty+5,resetCooldown:5,wallTime:0,stuck:0,wrong:0,driftChain:0,prevX:spot.x,prevZ:spot.z});return true;}

