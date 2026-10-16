import test from 'node:test';
import assert from 'node:assert/strict';
import {RenderMotion,VisualBudget} from '../src/frame-flow.js';
const car=()=>({x:0,z:0,yaw:Math.PI-.02,speed:24,vx:24,vz:0});
test('240 Hz rendering fills intermediate positions without mutating simulation',()=>{
 const c=car(),m=new RenderMotion();m.reset([c]);m.capture([c]);c.x=.2;c.yaw=-Math.PI+.02;
 const source={...c};const first=m.sample([c],0)[0].x,middle=m.sample([c],.5)[0].x,last=m.sample([c],1)[0].x;
 assert.equal(first,0);assert.equal(middle,.1);assert.equal(last,.2);assert.deepEqual(c,source);
 assert.ok(Math.abs(m.sample([c],.5)[0].yaw-Math.PI)<1e-9);
});
test('resets and discontinuous AI recovery snap, while paused rendering remains current',()=>{
 const c=car(),m=new RenderMotion();m.reset([c]);c.x=120;assert.equal(m.sample([c],.2)[0].x,120);
 m.reset([c]);c.x=120.2;assert.equal(m.sample([c],1)[0].x,120.2);m.reset([c]);assert.equal(m.sample([c],0)[0].x,120.2);
});
test('sustained frame pressure reduces secondary effects and recovery is gradual',()=>{
 const b=new VisualBudget();for(let i=0;i<160;i++)b.update(1/25,.02);
 assert.equal(b.level,2);assert.equal(b.effects.weather,.35);
 for(let i=0;i<610;i++)b.update(1/60,.002);assert.equal(b.level,1);
 for(let i=0;i<610;i++)b.update(1/60,.002);assert.equal(b.level,0);
});
test('healthy 120, 144 and 240 Hz schedules are supported without an artificial 60 Hz limit',()=>{
 for(const hz of [120,144,240]){
  const b=new VisualBudget();for(let i=0;i<hz*12;i++)b.update(1/hz,.001);
  assert.equal(b.level,0);assert.ok(Math.abs(b.target-1/hz)<1e-9);
 }
 const b=new VisualBudget();for(let i=0;i<180;i++)b.update(1/60,.002);b.update(.24,.02);assert.equal(b.level,1);
});
