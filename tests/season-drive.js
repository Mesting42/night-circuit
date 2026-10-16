import {tracks} from '../src/tracks.js';
import {Race} from '../src/race.js';
import {SaveStore} from '../src/save.js';
import {driverInput} from '../src/ai.js';
import {progress} from '../src/physics.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const values=new Map(),store=new SaveStore({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}),reports=[];
store.seasonStart();
for(const track of tracks){store.beforeRace();const race=new Race(track,'championship',store.profile);let steps=0;while(!race.finished&&race.time<480){race.step(driverInput(race.player,track,race.cars,{player:true}));steps++;}assert.ok(race.finished,track.id+' failed to finish');const result=race.result();assert.equal(store.settle(result),true);const report={name:track.name,length:Math.round(track.length),...result,cash:store.profile.cash,ai:race.cars.slice(1).map(c=>({id:c.id,lap:c.lap,progress:Math.round(progress(c,track)),penalty:c.penalty,finish:c.finish})),steps};reports.push(report);console.log(JSON.stringify(report));if(track.id==='harbor')assert.equal(store.upgrade('tires'),true);if(track.id==='industry'){assert.equal(store.buyCar('pulse'),true);assert.equal(store.select('swift'),true);}if(track!==tracks.at(-1))assert.equal(store.next(),true);}
assert.equal(store.profile.season.done,true);assert.equal(store.profile.adaptive.plays,tracks.length);assert.ok(store.profile.season.results.every(r=>r.adaptation));assert.ok(store.profile.owned.includes('pulse'));assert.equal(store.profile.tunes.swift.tires,1);fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/season-drive.json',JSON.stringify({method:'unchanged 120 Hz simulation; control inputs only; real economy; no position, performance, checkpoint or ranking overrides',reports,standings:store.standings(),profile:store.profile},null,2));console.log('PASS: nine stations, earned reward, tire upgrade, car purchase, skill learning and actual season standings.');
