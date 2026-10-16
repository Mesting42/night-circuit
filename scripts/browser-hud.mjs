import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://localhost:5188/';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const reports=[];
try{
 for(const [name,width,height,touch,dpr] of [['phone',844,390,true,3],['small-phone',667,375,true,2],['compact-phone',568,320,true,2],['tablet',1024,768,true,2],['desktop',1440,900,false,1]]){
  if(process.argv[3]&&!process.argv[3].split(',').includes(name))continue;
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:dpr});
  const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const click=name=>page.getByRole('button',{name,exact:true}).click();
  await page.goto(base);await click('自由练习');await click('驶入赛道');await page.locator('#minimap').waitFor();await click('暂停');await page.evaluate(()=>document.fonts.ready);
  const rectangles=await page.evaluate(()=>{
   const rect=selector=>{const {left,right,top,bottom,width,height}=document.querySelector(selector).getBoundingClientRect();return{left,right,top,bottom,width,height};};
   return{map:rect('.map-panel'),clock:rect('.clock-panel'),telemetry:rect('.telemetry'),speed:rect('.speed'),steer:rect('.steering'),pedals:rect('.pedals'),nitro:rect('[data-control="nitro"]'),throttle:rect('[data-control="throttle"]'),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  const r=rectangles;assert.equal(r.overflow,false);assert.ok(Math.abs(r.map.right-r.clock.right)<1);assert.ok(r.map.top-r.clock.bottom>=11);
  assert.ok(Math.abs((r.telemetry.left+r.telemetry.right)/2-width/2)<1);assert.ok(r.telemetry.bottom<=height);assert.ok(height-r.telemetry.bottom<=64);
  assert.ok(Math.abs((r.speed.left+r.speed.right)/2-width/2)<1);
  assert.ok(r.map.left>width/2);
  if(touch){assert.ok(r.map.width<=116);assert.ok(r.pedals.left-r.telemetry.right>=7);assert.ok(r.telemetry.left-r.steer.right>=7);assert.ok(r.pedals.top-r.map.bottom>=8);assert.ok(r.throttle.left-r.nitro.right>=20);assert.ok(r.throttle.top-r.nitro.bottom>=20);}
  await page.locator('.overlay').evaluate(el=>el.style.visibility='hidden');await page.screenshot({path:`artifacts/screenshots/hud-${base.includes('localhost')?'local':'online'}-${name}.png`,scale:'css'});await page.locator('.overlay').evaluate(el=>el.style.visibility='');
  await click('继续驾驶');assert.deepEqual(errors,[]);
  reports.push({name,pass:true,base,rectangles,errors});console.log('PASS HUD '+name);await context.close();
 }
}finally{fs.writeFileSync(`artifacts/hud-${base.includes('localhost')?'local':'online'}.json`,JSON.stringify(reports,null,2));await browser.close();}
