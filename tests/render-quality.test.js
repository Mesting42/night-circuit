import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPixelRatio} from '../src/render-quality.js';

test('phone and tablet retain more detail without allocating their full device DPR',()=>{
 for(const [width,height,dpr] of [[844,390,3],[1024,768,2]]){
  const dimensions={width,height,dpr,touch:true};
  assert.equal(renderPixelRatio({...dimensions,quality:'medium'}),1.75);
  assert.equal(renderPixelRatio({...dimensions,quality:'high'}),2);
  assert.equal(renderPixelRatio({...dimensions,quality:'low'}),1);
 }
});
test('desktop DPR 1 benefits from supersampling and quality levels remain ordered',()=>{
 const screen={width:1440,height:900,dpr:1};
 assert.equal(renderPixelRatio({...screen,quality:'medium'}),1.25);
 assert.equal(renderPixelRatio({...screen,quality:'high'}),1.5);
});
test('large drawing buffers respect pixel budgets without falling below native size',()=>{
 for(const [width,height] of [[1920,1080],[2560,1440],[3840,2160],[7680,4320]]){
  const pixels=width*height;
  let previous=0;
  for(const [quality,budget] of [['low',2000000],['medium',3000000],['high',6000000]]){
   const ratio=renderPixelRatio({width,height,dpr:3,quality});
   assert.ok(ratio>=1&&ratio>=previous);previous=ratio;
   assert.ok(Math.floor(width*ratio)*Math.floor(height*ratio)<=Math.max(pixels,budget));
  }
 }
});
test('DPR and viewport changes recalculate the ratio, including portrait rotation',()=>{
 assert.equal(renderPixelRatio({width:1440,height:900,dpr:1}),1.25);
 assert.equal(renderPixelRatio({width:1440,height:900,dpr:2}),Math.sqrt(3000000/(1440*900)));
 assert.equal(renderPixelRatio({width:844,height:390,dpr:3,touch:true}),renderPixelRatio({width:390,height:844,dpr:3,touch:true}));
});
