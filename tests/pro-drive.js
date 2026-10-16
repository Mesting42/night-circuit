import {tracks} from '../src/tracks.js';
import {Race} from '../src/race.js';
import {SaveStore} from '../src/save.js';
import {driverInput} from '../src/ai.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const map=new Map(),s=new SaveStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)});s.profile.settings.difficulty='pro';s.seasonStart();
for(const t of tracks){s.beforeRace();const r=new Race(t,'championship',s.profile);while(!r.finished&&r.time<480)r.step(driverInput(r.player,t,r.cars,{player:true}));assert.ok(r.finished);s.settle(r.result());console.log(t.id,r.result().rank,r.result().time);if(t!==tracks.at(-1))s.next();}
assert.equal(s.profile.season.done,true);const champion=s.standings()[0].id;assert.notEqual(champion,0,'advanced drivers should beat the conservative input controller in this acceptance scenario');fs.writeFileSync('artifacts/pro-season-profile.json',JSON.stringify(s.profile,null,2));fs.writeFileSync('artifacts/pro-season.json',JSON.stringify({method:'normal control inputs, unchanged pro difficulty and vehicle parameters; actual results',champion,standings:s.standings(),results:s.profile.season.results},null,2));assert.equal(s.retry(),true);assert.equal(s.profile.season.done,false);assert.equal(s.profile.season.results.length,tracks.length-1);assert.equal(s.beforeRace(),true);console.log('PASS: normally driven losing season, safe retry and continued access.');
