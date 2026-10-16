import {chromium} from '@playwright/test';
import fs from 'node:fs';
const stage=process.argv[2]||'after';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const report=[];
try{
 for(const [name,width,height,touch,dpr] of [['desktop',1280,720,false,1],['phone',844,390,true,3]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:dpr});
  const page=await context.newPage();page.setDefaultTimeout(90000);
  await page.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.__frameSamples=[];window.__profiling=false;window.requestAnimationFrame=callback=>raf(t=>{const start=performance.now();callback(t);const work=performance.now()-start;if(window.__profiling&&work>.25)window.__frameSamples.push({time:t,work});});});
  const click=name=>page.getByRole('button',{name,exact:true}).click();
  await page.goto('http://localhost:5188/');await click('驶入锦标赛');await click('跳过教学');await click('开始本站比赛');
  await page.waitForFunction(()=>window.__nightCircuit.snapshot()?.countdown<=0);await click('暂停');
  // Warm shaders before measuring the same parked five-car scene.
  await page.evaluate(()=>{window.__frameSamples=[];window.__profiling=true;});
  await page.waitForFunction(()=>window.__frameSamples.length>=24);
  const data=await page.evaluate(()=>{window.__profiling=false;return{frames:window.__frameSamples.slice(-20),render:window.__nightCircuit.renderInfo()};});
  const work=data.frames.map(f=>f.work).sort((a,b)=>a-b);data.medianCallbackMs=work[Math.floor(work.length/2)];
  const intervals=data.frames.slice(1).map((f,i)=>f.time-data.frames[i].time).sort((a,b)=>a-b);data.medianIntervalMs=intervals[Math.floor(intervals.length/2)];
  report.push({name,stage,...data});console.log(`${name}: ${data.render.drawCalls} draw calls, median callback ${data.medianCallbackMs.toFixed(2)}ms`);
  fs.writeFileSync(`artifacts/frame-profile-${stage}.json`,JSON.stringify(report,null,2));await context.close();
 }
}finally{await browser.close();}
