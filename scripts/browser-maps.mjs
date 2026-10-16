import {chromium} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {freshProfile} from '../src/save.js';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage();
const errors=[],external=[],checks=[];page.setDefaultTimeout(45000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,800));});
page.on('request',r=>{if(!r.url().startsWith('http://localhost:5188')&&!r.url().startsWith('data:'))external.push(r.url());});
const profile=freshProfile();profile.tutorial=true;profile.settings.quality='medium';
await page.addInitScript(p=>{if(!localStorage.getItem('night-circuit.save.v1'))localStorage.setItem('night-circuit.save.v1',JSON.stringify(p));const original=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>original(t=>cb(t*15));},profile);
const click=name=>page.getByRole('button',{name,exact:true}).click();
const ok=(name,details={})=>{checks.push({name,pass:true,...details});console.log('PASS '+name+' '+JSON.stringify(details));};
const exit=async()=>{await page.keyboard.press('Escape');await click('退出当前比赛');await click('离开比赛');};
try{
 fs.mkdirSync('artifacts/screenshots',{recursive:true});await page.goto('http://localhost:5188');
 await page.getByRole('button',{name:'自由练习',exact:true}).waitFor();await page.screenshot({path:'artifacts/screenshots/maps-desktop-menu.png'});
 await click('驶入锦标赛');assert.match(await page.locator('.page-heading').innerText(),/1 \/ 9 站/);assert.equal(await page.locator('.schedule li').count(),9);await page.screenshot({path:'artifacts/screenshots/maps-desktop-season.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'artifacts/screenshots/maps-phone-season.png'});ok('new championship exposes all nine stations on desktop and phone');
 await page.locator('.page-heading [data-action="menu"]').click();await page.setViewportSize({width:1280,height:800});await click('自由练习');assert.equal(await page.locator('[data-action="track"]').count(),9);await page.locator('[data-action="track"][data-index="6"]').click();await page.screenshot({path:'artifacts/screenshots/maps-desktop-select.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('[data-action="track"][data-index="8"]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await page.locator('.track-list .selected').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;}));await page.screenshot({path:'artifacts/screenshots/maps-phone-select.png'});await page.locator('.page-heading [data-action="menu"]').click();
 for(const [index,id,weather] of [[6,'forest','rain'],[7,'canyon','clear'],[8,'alpine','snow']]){
  await page.setViewportSize({width:1280,height:800});await click('自由练习');await page.locator(`[data-action="track"][data-index="${index}"]`).click();await click('驶入赛道');await page.waitForTimeout(800);
  const info=await page.evaluate(()=>window.__nightCircuit.renderInfo());assert.equal(info.environment,id);assert.equal(info.precipitation,weather);assert.equal(info.terrain,true);assert.equal(info.iceLake,id==='alpine');
  await page.screenshot({path:`artifacts/screenshots/maps-desktop-${id}.png`});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`artifacts/screenshots/maps-phone-${id}.png`});
  await page.setViewportSize({width:800,height:600});
  const pad=await page.locator('[data-control="steer"]').boundingBox();await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2);await page.mouse.down();
  await page.evaluate(async()=>{
   const {tracks}=await import('/src/tracks.js'),{driverInput}=await import('/src/ai.js');let held=new Set();
   await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('natural route drive timeout')),90000);function frame(){
    const s=window.__nightCircuit.snapshot();if(!s||s.time>=40){for(const code of held)dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));clearTimeout(timeout);resolve();return;}
    if(s.paused)dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));
    const t=tracks.find(t=>t.id===s.track),input=driverInput(s.player,t,s.cars,{player:true}),el=document.querySelector('[data-control="steer"]'),r=el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:r.x+r.width/2+input.steer*r.width*.42,clientY:r.y+r.height/2,bubbles:true}));
    const next=new Set([...(input.brake?['KeyS']:input.throttle?['KeyW']:[]),...(input.nitro?['ShiftLeft']:[])]);for(const code of held)if(!next.has(code))dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));for(const code of next)if(!held.has(code))dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));held=next;requestAnimationFrame(frame);
   }requestAnimationFrame(frame);});
  });
  await page.mouse.up();const driven=await page.evaluate(()=>window.__nightCircuit.snapshot());assert.ok(driven.player.passed>8);assert.equal(driven.player.penalty,0);await page.screenshot({path:`artifacts/screenshots/maps-driving-${id}.png`});ok(id+' has its own scenery, weather and usable driving route',{info,time:driven.time,passed:driven.player.passed});await exit();
 }
 await click('计时挑战');await page.locator('[data-action="track"][data-index="8"]').click();assert.match(await page.locator('.track-detail').innerText(),/3\s*圈/);await click('驶入赛道');assert.equal((await page.evaluate(()=>window.__nightCircuit.snapshot())).mode,'time');await exit();
 await click('继续锦标赛');await click('开始本站比赛');assert.equal((await page.evaluate(()=>window.__nightCircuit.snapshot())).cars.length,5);await exit();
 assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(external.length,0);ok('practice, time and championship launch correctly without browser or shader errors and without external requests',{errors,external});
}catch(e){checks.push({name:'maps browser suite',pass:false,error:e.message,errors});console.error(e);await page.screenshot({path:'artifacts/screenshots/maps-failure.png'}).catch(()=>{});process.exitCode=1;}
finally{fs.writeFileSync('artifacts/browser-maps.json',JSON.stringify({method:'Chromium desktop and touch phone; ordinary UI navigation and driving inputs with accelerated frame timestamps; unchanged fixed 120 Hz physics; no position or checkpoint overrides',checks},null,2));await browser.close();}
