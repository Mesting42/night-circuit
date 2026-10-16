import test from 'node:test';
import assert from 'node:assert/strict';
import {tracks,LEGACY_ROUTE_IDS,seasonTracks} from '../src/tracks.js';
import {SaveStore,KEY,freshProfile,validProfile} from '../src/save.js';
import {carStats} from '../src/catalog.js';
import {makeCar,integrate,STEP} from '../src/physics.js';
import {Race} from '../src/race.js';
import {driverInput} from '../src/ai.js';
const memory=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const result=t=>({completed:true,rank:2,order:[1,0,2,3,4],time:220,lapTimes:[70,75,75],resets:0,track:t.id});

test('legacy six-station seasons retain results, equipment and finish boundary',()=>{
 for(const done of [false,true]){
  const m=memory(),s=new SaveStore(m);s.profile.cash=9000;s.profile.tunes.swift.tires=2;s.profile.adaptive.score=64;s.seasonStart();
  // This is an actual legacy shape: routes did not exist before the expansion.
  delete s.profile.season.routes;
  for(let i=0;i<(done?6:4);i++){s.beforeRace();s.settle(result(tracks[i]));if(i<(done?5:3))s.next();}
  s.save();const prior=structuredClone(s.profile),loaded=new SaveStore(m);
  assert.equal(loaded.warning,'');assert.deepEqual(loaded.profile.season.results,prior.season.results);assert.deepEqual(loaded.profile.season.points,prior.season.points);
  assert.deepEqual(loaded.profile.season.routes,LEGACY_ROUTE_IDS);assert.equal(seasonTracks(loaded.profile.season).length,6);assert.equal(loaded.profile.cash,prior.cash);assert.equal(loaded.profile.tunes.swift.tires,2);assert.equal(loaded.profile.adaptive.score,prior.adaptive.score);assert.equal(loaded.profile.season.done,done);
  if(!done){loaded.next();for(let i=4;i<6;i++){loaded.beforeRace();assert.ok(loaded.settle(result(tracks[i])));if(i<5)assert.ok(loaded.next());}assert.equal(loaded.profile.season.done,true);}
  loaded.seasonStart();assert.equal(loaded.profile.season.routes.length,9);assert.equal(loaded.profile.tunes.swift.tires,2);
 }
});

test('new nine-station seasons finish only at the ninth result and reload safely',()=>{
 const m=memory();let s=new SaveStore(m);s.seasonStart();
 for(let i=0;i<tracks.length;i++){
  assert.equal(seasonTracks(s.profile.season)[i].id,tracks[i].id);assert.ok(s.beforeRace());assert.ok(s.settle(result(tracks[i])));
  assert.equal(s.profile.season.done,i===8);assert.ok(validProfile(s.profile));const cash=s.profile.cash;s=new SaveStore(m);assert.equal(s.warning,'');assert.equal(s.profile.cash,cash);
  if(i<8)assert.ok(s.next());
 }
 assert.equal(s.profile.adaptive.plays,9);assert.equal(s.retry(),true);assert.equal(s.profile.season.station,8);assert.equal(s.profile.season.done,false);assert.equal(s.profile.season.results.length,8);assert.ok(s.beforeRace());
 const bad=structuredClone(s.profile);bad.season.routes[8]='missing';assert.equal(validProfile(bad),false);
});

test('dry and cold road conditions affect tire grip and braking equally for every driver',()=>{
 const road={...tracks[0]};Object.setPrototypeOf(road,Object.getPrototypeOf(tracks[0]));
 const records=[];
 for(const track of [tracks[0],...tracks.slice(6)]){
  road.surfaceGrip=track.surfaceGrip;road.surfaceBrake=track.surfaceBrake;
  const c=makeCar(carStats('swift'),road),p=road.at(80);Object.assign(c,p,{vx:p.tx*30,vz:p.tz*30});
  const before={...c.stats};for(let i=0;i<60;i++)integrate(c,{brake:true},STEP,road);
  assert.deepEqual(c.stats,before);records.push({id:track.id,speed:c.speed});
 }
 assert.ok(records.find(x=>x.id==='canyon').speed<records[0].speed);assert.ok(records.find(x=>x.id==='alpine').speed>records[0].speed);
});

test('all three cars finish each natural circuit with stock and full upgrades',()=>{
 for(const track of tracks.slice(6))for(const id of ['swift','pulse','atlas'])for(const tuned of [false,true]){
  const p=freshProfile();p.selected=id;p.owned=['swift','pulse','atlas'];if(tuned)p.tunes[id]={engine:3,tires:3,suspension:3,nitro:3};
  const r=new Race(track,'time',p);while(!r.finished&&r.time<500)r.step(driverInput(r.player,track,r.cars,{player:true}));
  assert.ok(r.finished,`${track.id} ${id} tuned=${tuned}`);assert.equal(r.player.passed,96);assert.equal(r.result().resets,0);assert.equal(r.player.penalty,0);assert.deepEqual(r.player.stats,carStats(id,p.tunes[id]));
 }
});
