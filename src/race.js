import {carStats} from './catalog.js';
import {makeCar,integrate,collideCars,updateGates,progress,resetCar,STEP} from './physics.js';
import {driverInput,aiRecovery} from './ai.js';
import {raceAdaptive,livePace} from './adaptive.js';

export class Race {
 constructor(track,mode,profile){
  this.track=track;this.mode=mode;this.laps=mode==='tutorial'?99:mode==='practice'?999:track.laps;
  this.time=0;this.countdown=3.5;this.resumeCountdown=0;this.paused=false;this.finished=false;this.events=[];
  this.difficulty=profile.settings.difficulty;this.assist=profile.settings.assist;
  this.adaptive=raceAdaptive(profile.adaptive,this.difficulty,mode);this.incidentUntil=0;
  this.attemptId=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  this.conditions={car:profile.selected,tune:JSON.stringify(profile.tunes[profile.selected]),assist:this.assist,difficulty:this.difficulty,version:track.version};
  this.performance={distance:0,movingSeconds:0,wallSeconds:0,collisionSeconds:0,wrongSeconds:0,boostSeconds:0};
  this.player=makeCar(carStats(profile.selected,profile.tunes[profile.selected]),track,0);
  this.cars=[this.player];
  if(mode==='championship')for(let i=1;i<=4;i++)this.cars.push(makeCar(carStats(['swift','pulse','atlas','pulse'][i-1]),track,i));
  this.finishOrder=[];this.tutorial={step:0,progress:0,done:false};
 }
 referenceSpeed(){return Math.max(12,Math.min(65,this.performance.movingSeconds>5?this.performance.distance/this.performance.movingSeconds:25));}
 updateBalance(dt){
  if(!this.adaptive.enabled)return;
  const p=this.player,playerProgress=progress(p,this.track),remaining=this.laps*this.track.length-playerProgress;
  if(p.collision>0||p.ghost>0||p.wallTime>0||p.wrong>1)this.incidentUntil=this.time+10;
  const eligible=this.time>12&&remaining>180&&this.time>this.incidentUntil&&p.speed>3;
  const speed=this.referenceSpeed();
  for(const c of this.cars.slice(1)){
   const gap=(playerProgress-progress(c,this.track))/speed;
   this.adaptive.live[c.id-1]=livePace(this.adaptive.live[c.id-1],gap,dt,eligible&&c.finish===null);
  }
 }
 step(input,dt=STEP){
  if(this.paused||this.finished)return;
  if(this.resumeCountdown>0){this.resumeCountdown=Math.max(0,this.resumeCountdown-dt);return;}
  if(this.countdown>0){const old=Math.ceil(this.countdown);this.countdown-=dt;if(Math.ceil(this.countdown)!==old)this.events.push({type:'count',value:Math.ceil(this.countdown)});return;}
  this.time+=dt;this.updateBalance(dt);
  const before=progress(this.player,this.track);
  for(const c of this.cars){
   if(c.finish!==null)continue;
   const tuning=c.id?{...this.adaptive,pace:this.adaptive.pace*this.adaptive.live[c.id-1]}:null;
   const control=c.id===0?input:driverInput(c,this.track,this.cars,{difficulty:this.difficulty,adaptive:tuning});
   integrate(c,control,dt,this.track,c.id===0?this.assist:true);
  }
  for(let i=0;i<this.cars.length;i++)for(let j=i+1;j<this.cars.length;j++)if(this.cars[i].finish===null&&this.cars[j].finish===null)collideCars(this.cars[i],this.cars[j]);
  for(const c of this.cars){
   if(c.finish!==null)continue;
   const prevLap=c.lap;
   if(updateGates(c,this.track,this.time,this.laps)){this.finishOrder.push(c.id);this.events.push({type:'finish',id:c.id});if(c.id===0)this.finished=true;}
   else if(c.lap>prevLap)this.events.push({type:'lap',id:c.id});
   if(c.id!==0)aiRecovery(c,this.track,this.cars);
  }
  const p=this.player,m=this.performance;
  if(p.speed>3&&p.ghost===0&&p.wrong<.1){m.movingSeconds+=dt;m.distance+=Math.max(0,Math.min(2,progress(p,this.track)-before));}
  if(p.wallTime>0)m.wallSeconds+=dt;if(p.collision>0)m.collisionSeconds+=dt;if(p.wrong>0)m.wrongSeconds+=dt;if(p.boosting)m.boostSeconds+=dt;
  if(this.mode==='tutorial')this.updateTutorial(input,dt);
 }
 updateTutorial(input,dt){let t=this.tutorial,p=this.player;if(t.done)return;const conditions=[p.speed>14,input.brake&&p.speed<10,Math.abs(input.steer)>.25&&p.speed>9,p.drifting,p.boosting];if(conditions[t.step])t.progress+=dt;const required=[.8,.4,1.2,.35,.7][t.step];if(t.progress>=required){t.step++;t.progress=0;this.events.push({type:'tutorial',step:t.step});if(t.step>=5)t.done=true;}}
 reset(id=0){const reset=resetCar(this.cars[id],this.track,this.cars);if(reset&&id===0)this.incidentUntil=this.time+12;return reset;}
 pause(){this.paused=true;}
 resume(){this.paused=false;this.resumeCountdown=2;}
 ranking(){return [...this.cars].sort((a,b)=>{if(a.finish!==null&&b.finish!==null)return a.finish-b.finish;if(a.finish!==null)return-1;if(b.finish!==null)return 1;return progress(b,this.track)-progress(a,this.track);});}
 result(){
  const p=this.player,playerTime=p.finish??this.time+p.penalty,order=this.ranking(),rank=order.findIndex(c=>c.id===0)+1,total=this.track.length*this.laps;
  const ahead=order[rank-2],behind=order[rank],speed=this.referenceSpeed();
  const gapAhead=ahead?Math.max(0,ahead.finish!==null?playerTime-ahead.finish:(progress(ahead,this.track)-progress(p,this.track))/speed):0;
  // The game settles immediately on the player's finish. An unfinished rear
  // rival's remaining legal distance is an estimate, never a fabricated finish.
  const gapBehind=behind?Math.max(0,behind.finish!==null?behind.finish-playerTime:(total-progress(behind,this.track))/speed+behind.penalty-p.penalty):0;
  const leader=order[0],gapLeader=rank===1?0:Math.max(0,leader.finish!==null?playerTime-leader.finish:(progress(leader,this.track)-progress(p,this.track))/speed);
  return{attemptId:this.attemptId,track:this.track.id,time:playerTime,rank,order:order.map(c=>c.id),lapTimes:[...p.lapTimes],drift:Math.floor(p.drift),resets:Math.round(p.penalty/5),completed:this.finished,
   gapAhead,gapBehind,gapLeader,gapBehindEstimated:!!behind&&behind.finish===null,conditions:{...this.conditions},
   performance:{averageSpeed:speed,wallRatio:this.performance.wallSeconds/Math.max(1,this.time),collisionRatio:this.performance.collisionSeconds/Math.max(1,this.time),wrongRatio:this.performance.wrongSeconds/Math.max(1,this.time),boostRatio:this.performance.boostSeconds/Math.max(1,this.time)},
   adaptive:{score:this.adaptive.score,pace:this.adaptive.pace,base:this.adaptive.base,label:this.adaptive.label,live:[...this.adaptive.live]}};
 }
}

