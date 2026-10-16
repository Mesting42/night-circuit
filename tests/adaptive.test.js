import test from 'node:test';
import assert from 'node:assert/strict';
import {freshAdaptive,normalizeAdaptive,observeAdaptive,applyDailyDecay,raceAdaptive,livePace,LIVE_LIMIT,PACE_MIN,PACE_MAX} from '../src/adaptive.js';
import {freshProfile,SaveStore,KEY,validProfile} from '../src/save.js';
import {Race} from '../src/race.js';
import {tracks} from '../src/tracks.js';
import {carStats} from '../src/catalog.js';
import {makeCar,integrate,collideCars,updateGates,STEP} from '../src/physics.js';
import {driverInput,aiRecovery} from '../src/ai.js';

const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map};};
const championship={mode:'championship',difficulty:'street'},date=new Date('2026-10-07T20:00:00');
const result=(rank=1,id='')=>({completed:true,attemptId:id,rank,order:rank===1?[0,1,2,3,4]:[1,2,3,4,0],time:200,lapTimes:[70,65,65],track:'harbor',resets:0,gapAhead:rank===5?12:0,gapBehind:rank===1?12:0});

test('repeated wins and losses move difficulty gradually in both directions',()=>{
 let a=freshAdaptive();const initial=raceAdaptive(a,'street','championship',date);
 for(let i=0;i<12;i++){const old=a;a=observeAdaptive(a,result(1,'win-'+i),championship,date);assert.ok(a.score>=old.score);assert.ok(a.score-old.score<=4.000001);}
 const strong=raceAdaptive(a,'street','championship',date);assert.ok(strong.pace>initial.pace+.15);assert.ok(strong.pace<=PACE_MAX);
 const high=a.score;for(let i=0;i<15;i++)a=observeAdaptive(a,result(5,'loss-'+i),championship,date);
 assert.ok(a.score<high-20);assert.equal(a.recent.length,10);assert.equal(a.plays,27);assert.ok(raceAdaptive(a,'street','championship',date).pace>=PACE_MIN);
});

test('close races hold pace while an accident carries less negative weight',()=>{
 const state={...freshAdaptive(),score:70,confidence:1};
 const clean=observeAdaptive(state,result(5),championship,date),crash=observeAdaptive(state,{...result(5),resets:3,performance:{wallRatio:.3,wrongRatio:.1}},championship,date);
 assert.ok(Math.abs(crash.lastDelta)<Math.abs(clean.lastDelta));
 const close=observeAdaptive(freshAdaptive(),{...result(3),gapAhead:2,gapBehind:2},championship,date);assert.equal(close.score,50);
 for(const mode of ['tutorial','practice','time'])assert.equal(observeAdaptive(state,result(),{mode},date).plays,0);
 const once=observeAdaptive(state,result(1,'same'),championship,date);assert.deepEqual(observeAdaptive(once,result(1,'same'),championship,date),once);
});

test('daily decay runs before the next race and cannot repeat on one day',()=>{
 const old={...freshAdaptive(),score:80,confidence:1,lastDay:'2026-09-30',decayedThrough:'2026-09-30'};
 const decayed=applyDailyDecay(old,date);assert.ok(decayed.score<80&&decayed.score>50);assert.ok(decayed.confidence<1);
 assert.deepEqual(applyDailyDecay(decayed,date),decayed);assert.equal(decayed.lastDay,'2026-09-30');
 assert.equal(raceAdaptive(old,'street','championship',date).score,decayed.score);
 assert.deepEqual(applyDailyDecay(decayed,new Date('2026-09-20T12:00:00')),decayed);
});

test('legacy and malformed adaptive saves preserve garage and genuine zero values',()=>{
 const m=memory(),old=freshProfile();old.cash=8888;old.tunes.swift.tires=2;delete old.adaptive;
 m.setItem(KEY,JSON.stringify(old));const store=new SaveStore(m);
 assert.equal(store.profile.adaptive.score,50);assert.equal(store.profile.cash,8888);assert.equal(store.profile.tunes.swift.tires,2);assert.ok(validProfile(store.profile));
 assert.equal(normalizeAdaptive({score:0,lastTarget:0}).score,0);
 old.adaptive={score:'broken',confidence:null,recent:[null,{rank:2,target:NaN}]};m.setItem(KEY,JSON.stringify(old));
 const repaired=new SaveStore(m);assert.equal(repaired.profile.cash,8888);assert.ok(validProfile(repaired.profile));
});

test('legacy control settings migrate to the wheel and visible fullscreen button',()=>{
 const m=memory(),old=freshProfile();delete old.settings.steering;delete old.settings.fullscreenButton;m.setItem(KEY,JSON.stringify(old));const store=new SaveStore(m);
 assert.equal(store.profile.settings.steering,'wheel');assert.equal(store.profile.settings.fullscreenButton,true);assert.ok(validProfile(store.profile));
});

test('control transparency upgrades and repairs settings without losing garage progress',()=>{
 const m=memory(),old=freshProfile();old.cash=8888;old.tunes.swift.tires=2;
 for(const [value,expected] of [[undefined,0],[0,0],[55,55],[80,80],[-10,0],[110,80],[25.4,25],['broken',0],[null,0]]){
  old.settings.controlTransparency=value;m.setItem(KEY,JSON.stringify(old));const store=new SaveStore(m);
  assert.equal(store.profile.settings.controlTransparency,expected);assert.equal(store.profile.cash,8888);
  assert.equal(store.profile.tunes.swift.tires,2);assert.ok(validProfile(store.profile));assert.equal(store.warning,'');
  store.save();assert.equal(new SaveStore(m).profile.settings.controlTransparency,expected);
 }
});

test('settlement learns exactly once; retry keeps experience and reload interruption learns nothing',()=>{
 const m=memory(),s=new SaveStore(m);s.seasonStart();s.beforeRace();const r=result(1,'attempt-1');assert.ok(s.settle(r));
 assert.equal(s.profile.adaptive.plays,1);assert.ok(r.adaptation.reason);assert.equal(s.settle(r),false);assert.equal(s.profile.adaptive.plays,1);
 const score=s.profile.adaptive.score;s.retry();assert.equal(s.profile.adaptive.score,score);assert.equal(s.profile.cash,1200);s.beforeRace();
 const reload=new SaveStore(m);assert.equal(reload.profile.adaptive.plays,1);assert.equal(reload.profile.season.inRace,false);
});

test('live corrections are slow, bounded, reversible, and absent inside the close-race band',()=>{
 let fast=1,slow=1;
 for(let i=0;i<36000;i++){const old=fast;fast=livePace(fast,50,STEP);slow=livePace(slow,-50,STEP);assert.ok(fast-old<.00003);assert.ok(fast<=1+LIVE_LIMIT);assert.ok(slow>=1-LIVE_LIMIT);}
 assert.ok(fast>1.029&&slow<.971);assert.equal(livePace(1,1.99,STEP),1);
 const neutral=livePace(fast,50,12,false);assert.ok(neutral<fast&&neutral>1);
});

test('pause and reset guards freeze or suppress catch-up without altering vehicle stats',()=>{
 const profile=freshProfile();profile.adaptive.score=90;const r=new Race(tracks[0],'championship',profile),original=r.cars.map(c=>({...c.stats}));
 r.adaptive.live=[1.02,.98,1.01,.99];r.pause();const previous=JSON.stringify({balance:r.adaptive,metrics:r.performance,time:r.time});
 for(let i=0;i<200;i++)r.step({throttle:1});
 assert.equal(JSON.stringify({balance:r.adaptive,metrics:r.performance,time:r.time}),previous);assert.deepEqual(r.cars.map(c=>c.stats),original);
 r.paused=false;r.time=30;r.player.speed=20;r.reset();r.updateBalance(1);assert.ok(r.adaptive.live[0]<1.02);
 const low=freshProfile(),high=freshProfile();low.adaptive.score=0;high.adaptive.score=100;
 const a=new Race(tracks[0],'time',low),b=new Race(tracks[0],'time',high);
 for(let i=0;i<1000;i++){a.step({throttle:1,steer:.1});b.step({throttle:1,steer:.1});}
 assert.deepEqual(a.player,b.player);assert.equal(a.adaptive.enabled,false);
});

test('a first-place finish measures unfinished rear cars using legal progress',()=>{
 const t=tracks[0],r=new Race(t,'championship',freshProfile());r.time=180;r.finished=true;r.player.finish=180;r.player.passed=96;r.player.lap=3;
 for(const c of r.cars.slice(1))Object.assign(c,t.at(t.length-50),{passed:95,lastGate:31,lap:2});
 const first=r.result();assert.equal(first.rank,1);assert.ok(first.gapBehind>1);assert.equal(first.gapBehindEstimated,true);
 r.cars[1].finish=176;const second=r.result();assert.equal(second.rank,2);assert.equal(second.gapAhead,4);assert.ok(second.gapBehind>0);
});

test('all rivals legally finish every route at minimum and maximum adaptive strength',()=>{
 for(const score of [0,100])for(const track of tracks){
  const tuning=raceAdaptive({...freshAdaptive(),score,confidence:1},'street','championship',date);
  // Include the full live correction at each end of the supported range.
  tuning.pace*=score===0?1-LIVE_LIMIT:1+LIVE_LIMIT;
  const cars=['swift','pulse','atlas','pulse'].map((id,i)=>makeCar(carStats(id),track,i+1));
  let time=0;
  while(time<520&&cars.some(c=>c.finish===null)){
   time+=STEP;
   for(const c of cars)if(c.finish===null)integrate(c,driverInput(c,track,cars,{adaptive:tuning}),STEP,track,true);
   for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++)if(cars[i].finish===null&&cars[j].finish===null)collideCars(cars[i],cars[j]);
   for(const c of cars)if(c.finish===null){updateGates(c,track,time,track.laps);aiRecovery(c,track,cars);}
  }
  for(const c of cars){assert.notEqual(c.finish,null,`${track.id} score ${score} driver ${c.id}`);assert.equal(c.passed,96);assert.equal(c.penalty,0,`${track.id} score ${score} resets`);}
 }
});

