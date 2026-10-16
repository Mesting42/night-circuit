import {chromium} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {freshProfile} from '../src/save.js';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true}),page=await context.newPage(),errors=[],external=[],checks=[];
page.setDefaultTimeout(45000);page.on('console',m=>{if(m.text().startsWith('adaptive drive '))console.log(m.text());});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://localhost:5188')&&!r.url().startsWith('data:'))external.push(r.url());});
const ok=(name,details={})=>{checks.push({name,pass:true,...details});console.log('PASS '+name);};
const click=name=>page.getByRole('button',{name,exact:true}).click();
const legacy=freshProfile();delete legacy.adaptive;legacy.cash=3210;legacy.tutorial=true;legacy.settings.quality='low';
await page.addInitScript(profile=>{
 if(!localStorage.getItem('night-circuit.save.v1'))localStorage.setItem('night-circuit.save.v1',JSON.stringify(profile));
 // Accelerate only the browser frame clock for this test. The game continues
 // to execute unchanged fixed 1/120 physics and receives ordinary input events.
 const original=requestAnimationFrame.bind(window);
 window.requestAnimationFrame=callback=>original(t=>callback(t*15));
},legacy);
try{
 fs.mkdirSync('artifacts/screenshots',{recursive:true});
 await page.goto('http://localhost:5188');await click('设置');
 await page.locator('.dialog .adaptive-status').waitFor();assert.match(await page.locator('.adaptive-status').innerText(),/已学习 0 场/);
 assert.equal((await page.evaluate(()=>window.__nightCircuit.profile())).cash,3210);ok('legacy profile migrates and settings explain adaptive difficulty');
 await page.screenshot({path:'artifacts/screenshots/adaptive-desktop-settings.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'artifacts/screenshots/adaptive-phone-settings.png'});
 await page.locator('[data-setting="difficulty"]').selectOption('pro');assert.match(await page.locator('.adaptive-status').innerText(),/100%/);
 await page.locator('[data-setting="difficulty"]').selectOption('street');await click('保存并返回');
 await page.setViewportSize({width:1440,height:900});await click('驶入锦标赛');await page.locator('.next-race .adaptive-status').waitFor();ok('pre-race feedback and phone settings fit');
 await page.setViewportSize({width:800,height:600});await click('开始本站比赛');await page.locator('#adaptive-label').waitFor();assert.match(await page.locator('#adaptive-label').innerText(),/动态平衡/);
 const pad=await page.locator('[data-control="steer"]').boundingBox();await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2);await page.mouse.down();
 await page.evaluate(async()=>{
  const {tracks}=await import('/src/tracks.js'),{driverInput}=await import('/src/ai.js');let held=new Set(),steps=0;
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('browser adaptive drive timed out')),180000);
   function frame(){
    const s=window.__nightCircuit.snapshot();
    if(!s){for(const code of held)dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));clearTimeout(timeout);resolve();return;}
    if(s.paused){dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));}
    const t=tracks.find(t=>t.id===s.track),input=driverInput(s.player,t,s.cars,{player:true}),el=document.querySelector('[data-control="steer"]'),r=el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:r.x+r.width/2+input.steer*r.width*.42,clientY:r.y+r.height/2,bubbles:true}));
    const next=new Set([...(input.brake?['KeyS']:input.throttle?['KeyW']:[]),...(input.nitro?['ShiftLeft']:[])]);
    for(const code of held)if(!next.has(code))dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));
    for(const code of next)if(!held.has(code))dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));
    held=next;
    if(++steps%300===0)console.log('adaptive drive '+Math.round(s.time)+'s lap '+s.player.lap);
    requestAnimationFrame(frame);
   }requestAnimationFrame(frame);
  });
 });
 await page.mouse.up();await page.locator('.result-page').waitFor();const profile=await page.evaluate(()=>window.__nightCircuit.profile());
 assert.equal(profile.adaptive.plays,1);assert.equal(profile.season.results.length,1);assert.equal(profile.season.results[0].resets,0);assert.equal(profile.adaptive.recent[0].car,'swift');
 assert.match(await page.locator('.result-page>.adaptive-status').innerText(),/已学习 1 场/);
 fs.writeFileSync('artifacts/browser-adaptive-profile.json',JSON.stringify(profile,null,2));await page.setViewportSize({width:1440,height:900});await page.locator('.result-page>.adaptive-status').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/screenshots/adaptive-desktop-result.png'});ok('normal browser control events finish a race, learn once and show the actual result',{rank:profile.season.results[0].rank,score:profile.adaptive.score});
 await page.setViewportSize({width:390,height:844});await page.locator('.result-page>.adaptive-status').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/screenshots/adaptive-phone-result.png'});
 await page.reload();await click('继续赛程');await click('查看本站成绩');assert.match(await page.locator('.result-page>.adaptive-status').innerText(),/已学习 1 场/);
 await click('重试本站');await page.getByRole('dialog').getByRole('button',{name:'重试本站',exact:true}).click();assert.equal((await page.evaluate(()=>window.__nightCircuit.profile())).adaptive.plays,1);ok('reload persists skill and retry preserves real driving experience');
 assert.equal(errors.length,0);assert.equal(external.length,0);ok('no browser exceptions or external requests',{errors,external});
}catch(e){checks.push({name:'browser adaptive suite',pass:false,error:e.message,errors});console.error(e);await page.screenshot({path:'artifacts/screenshots/adaptive-failure.png'}).catch(()=>{});process.exitCode=1;}
finally{fs.writeFileSync('artifacts/browser-adaptive.json',JSON.stringify({method:'Chromium, accelerated frame clock, unchanged fixed-step physics, pointer and keyboard control events; no position, stats, checkpoint, ranking or finish-state overrides',checks},null,2));await browser.close();}

