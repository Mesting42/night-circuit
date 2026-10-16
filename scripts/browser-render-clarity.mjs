import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderPixelRatio} from '../src/render-quality.js';

const stage=process.argv[2]||'after',base=process.argv[3]||'http://localhost:5188/';
const baseline=stage==='before',dev=base.includes(':5188');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const report=[];
fs.mkdirSync('artifacts/screenshots',{recursive:true});
try{
 for(const [name,width,height,dpr,mobile] of [['desktop',1440,900,1,false],['phone',844,390,3,true],['tablet',1024,768,2,true]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);
  // Pace only the test browser's frame scheduling, keeping the actual fixed-step
  // game loop. Software WebGL should not flood the GPU queue during UI checks.
  if(!baseline)await page.addInitScript(()=>{const frame=requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>frame(t=>setTimeout(()=>callback(performance.now()),80));});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const click=name=>page.getByRole('button',{name,exact:true}).click();
  const metrics=()=>page.evaluate(()=>{const c=document.querySelector('#world');return{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,bufferWidth:c.width,bufferHeight:c.height,resolution:window.__nightCircuit?.renderInfo().resolution};});
  const quality=async value=>{await click('设置');await page.locator('[data-setting="quality"]').selectOption(value);await click('保存并返回');};
  await page.goto(base);await quality('medium');await click('自由练习');await click('驶入赛道');await page.locator('#minimap').waitFor();
  await click('暂停');await page.evaluate(()=>document.fonts.ready);
  await page.locator('.overlay').evaluate(el=>el.style.visibility='hidden');
  await page.screenshot({path:`artifacts/screenshots/clarity-${stage}-${name}.png`,scale:'css'});
  if(!baseline)await page.screenshot({path:`artifacts/screenshots/clarity-${stage}-${name}-car.png`,clip:{x:width/2-80,y:height*.62,width:160,height:Math.min(130,height*.38)},scale:'device'});
  await page.locator('.overlay').evaluate(el=>el.style.visibility='');
  const medium=await metrics(),tiers={medium};
  console.log(`${name}: parked screenshot and resolution captured`);
  if(!baseline){
   const expected=mobile?1.75:1.25;
   assert.equal(medium.bufferWidth,Math.floor(width*expected));assert.equal(medium.bufferHeight,Math.floor(height*expected));
   if(dev){assert.equal(medium.resolution.antialias,true);assert.ok(medium.resolution.samples>0);}
   if(dev){
    for(const q of ['high','low','medium']){await quality(q);tiers[q]=await metrics();console.log(`${name}: ${q} quality checked`);}
    assert.ok(tiers.high.bufferWidth>medium.bufferWidth);assert.equal(tiers.low.bufferWidth,width);assert.equal(tiers.low.bufferHeight,height);
   }
   await click('继续驾驶');
   if(dev){
    await page.waitForFunction(()=>window.__nightCircuit.snapshot()?.countdown<=0);
    await page.keyboard.down('w');await page.waitForFunction(()=>window.__nightCircuit.snapshot().player.speed>12);
    const driving=await page.evaluate(()=>window.__nightCircuit.snapshot().player);assert.ok(driving.speed>12);
    await click('暂停');await page.keyboard.up('w');
    await page.locator('.overlay').evaluate(el=>el.style.visibility='hidden');await page.screenshot({path:`artifacts/screenshots/clarity-driving-${name}.png`,scale:'css'});await page.locator('.overlay').evaluate(el=>el.style.visibility='');
    tiers.driving={speed:driving.speed};
    if(mobile){
     await page.setViewportSize({width:height,height:width});
     await page.waitForFunction(()=>window.__nightCircuit.snapshot().orientationBlocked);
     await page.setViewportSize({width,height});await page.waitForFunction(()=>!window.__nightCircuit.snapshot().orientationBlocked);
     assert.equal((await metrics()).bufferWidth,medium.bufferWidth);
    }else{
     const cdp=await context.newCDPSession(page);
     await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:false});
     const nextWidth=Math.floor(width*renderPixelRatio({quality:'medium',width,height,dpr:2}));
     try{await page.waitForFunction(w=>document.querySelector('#world').width===w,nextWidth);}catch(e){console.error('DPR update:',await metrics(),'expected width',nextWidth);throw e;}
     tiers.dprChange=await metrics();
     await page.setViewportSize({width:1920,height:1080});
     const largeWidth=Math.floor(1920*renderPixelRatio({quality:'medium',width:1920,height:1080,dpr:2}));
     await page.waitForFunction(w=>document.querySelector('#world').width===w,largeWidth);const large=await metrics();
     assert.ok(large.bufferWidth>=large.width);assert.ok(large.bufferHeight>=large.height);
     assert.ok(large.bufferWidth*large.bufferHeight<=Math.max(large.width*large.height,3000000));tiers.largeScreen=large;
    }
   }else{await click('暂停');assert.equal(await page.evaluate(()=>typeof window.__nightCircuit),'undefined');}
  }
  assert.deepEqual(errors,[]);report.push({name,pass:true,base,tiers,errors});console.log(`PASS ${name}: ${medium.bufferWidth}×${medium.bufferHeight} medium drawing buffer`);
  await context.close();
 }
}finally{fs.writeFileSync(`artifacts/render-clarity-${stage}.json`,JSON.stringify(report,null,2));await browser.close();}
