import {angle,clamp} from './math.js';
import {progress,resetCar} from './physics.js';
import {basePace,PACE_MIN,PACE_MAX,LIVE_LIMIT} from './adaptive.js';
const PERSONALITY=[{pace:.99,line:1.3,attack:.97},{pace:1.008,line:-1.5,attack:1.05},{pace:1.018,line:.8,attack:1},{pace:.997,line:-.7,attack:1.03}];
export function driverInput(c,track,cars,{difficulty='street',player=false,adaptive=null}={}){
 const tuning=player?{}:adaptive||{},person=PERSONALITY[(c.id-1+4)%4],aggression=(tuning.aggression??1)*(player?1:person.attack);
 const caution=player?1:clamp((tuning.pace??basePace(difficulty))*person.pace,PACE_MIN*(1-LIVE_LIMIT)*.98,PACE_MAX*(1+LIVE_LIMIT)*1.02);
 let offset=player?0:person.line/(tuning.stability??1);
 if(!player)offset+=Math.sin(c.s*.035+c.id*1.7)*(tuning.mistake??.1);
 let targetSpeed=c.stats.max*.87*caution;
 for(const other of cars){if(other===c||other.finish!==null)continue;let gap=progress(other,track)-progress(c,track);if(gap>0&&gap<24*aggression&&Math.hypot(other.x-c.x,other.z-c.z)<26){offset=clamp((c.id%2?1:-1)*(track.width/2-4),-6,6);if(gap<7)targetSpeed=Math.min(targetSpeed,Math.max(9,other.speed-1));}}
 for(let ahead=6;ahead<100;ahead+=7){const k=track.curvature(c.s+ahead,9),safe=Math.sqrt(7.7*caution*(track.surfaceGrip??1)/Math.max(k,.002));const allowed=Math.sqrt(safe*safe+2*10.5*(track.surfaceBrake??1)*Math.max(0,ahead-9));targetSpeed=Math.min(targetSpeed,allowed);}
 const look=10+c.speed*(.55-.03*(aggression-1)),target=track.at(c.s+look,offset),desired=Math.atan2(target.x-c.x,target.z-c.z),err=angle(desired-c.yaw);
 const steer=clamp(Math.atan(2*2.85*Math.sin(err)/look)*(1+c.speed*.038)/c.stats.steer*1.06*(tuning.stability??1),-1,1);
 return{steer,throttle:c.speed<targetSpeed+.8?1:0,brake:c.speed>targetSpeed+1.5,handbrake:false,nitro:Math.abs(err)<.06&&track.curvature(c.s+45)<.003&&targetSpeed>c.speed+4/aggression&&c.nitro>15};
}
export function aiRecovery(c,track,cars){if(c.stuck>5||c.wallTime>6||c.wrong>5)resetCar(c,track,cars);}

