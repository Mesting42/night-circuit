import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Race} from '../src/race.js';
import {tracks} from '../src/tracks.js';
import {SaveStore,freshProfile} from '../src/save.js';
import {carStats} from '../src/catalog.js';
import {driverInput} from '../src/ai.js';

const reports=[];
for(const [name,pace] of [['steady',.78],['fast',1.1]]){
 const map=new Map(),store=new SaveStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}),runs=[];
 for(let i=0;i<10;i++){
  store.seasonStart();store.beforeRace();const race=new Race(tracks[0],'championship',store.profile);
  while(!race.finished&&race.time<550)race.step(driverInput(race.player,race.track,race.cars,{adaptive:{pace,stability:1,mistake:.03,aggression:1}}));
  assert.ok(race.finished);const result=race.result();store.settle(result);
  assert.equal(result.resets,0);assert.ok(race.cars.every(c=>c.penalty===0));
  runs.push({run:i+1,rank:result.rank,score:store.profile.adaptive.score,pace:race.adaptive.pace,gapAhead:result.gapAhead,gapBehind:result.gapBehind,gapLeader:result.gapLeader,live:race.adaptive.live});
 }
 const gap=x=>x.rank===1?x.gapBehind:x.gapLeader;
 const early=runs.slice(0,3).reduce((n,r)=>n+Math.abs(gap(r)),0)/3,late=runs.slice(-3).reduce((n,r)=>n+Math.abs(gap(r)),0)/3;
 assert.ok(late<early,name+' does not close the initial mismatch');
 reports.push({name,controllerPace:pace,earlyMeanGap:early,lateMeanGap:late,runs});
 console.log(JSON.stringify({name,earlyMeanGap:early,lateMeanGap:late,first:runs[0],last:runs.at(-1)}));
}
const equipment=[];
for(const [index,id,tuned] of [[0,'swift',false],[1,'swift',true],[2,'pulse',false],[3,'pulse',true],[4,'atlas',false],[5,'atlas',true]]){
 const profile=freshProfile();profile.owned=['swift','pulse','atlas'];profile.selected=id;profile.adaptive.score=70;
 if(tuned)profile.tunes[id]={engine:3,tires:3,suspension:3,nitro:3};
 const race=new Race(tracks[index],'championship',profile),stats=carStats(id,profile.tunes[id]);
 while(!race.finished&&race.time<550)race.step(driverInput(race.player,race.track,race.cars,{player:true}));
 assert.ok(race.finished);assert.deepEqual(race.player.stats,stats);assert.equal(race.result().resets,0);
 assert.equal(race.result().conditions.car,id);assert.equal(race.result().conditions.tune,JSON.stringify(profile.tunes[id]));
 equipment.push({car:id,tuned,track:race.track.id,rank:race.result().rank,time:race.result().time,resets:race.result().resets});
}
console.log('PASS all three cars, stock and fully tuned, legally finish and retain their actual stats.');
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/adaptive-driving.json',JSON.stringify({method:'unchanged 120 Hz physics, normal throttle/brake/steering/nitro inputs, ten completed attempts per controller, actual settlement and local skill learning',reports,equipment},null,2));
console.log('PASS adaptive learning narrows the initial mismatch for both controllers.');

