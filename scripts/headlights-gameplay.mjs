import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],results=[];page.setDefaultTimeout(45000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const click=name=>page.getByRole('button',{name,exact:true}).click();const state=()=>page.evaluate(()=>window.__nightCircuit.snapshot());
try{
 await page.goto('http://localhost:5188');await click('驶入锦标赛');await click('跳过教学');await click('开始本站比赛');await page.waitForFunction(()=>window.__nightCircuit.snapshot()?.countdown<=0);await page.keyboard.down('w');await page.waitForTimeout(1100);await page.keyboard.down('d');await page.keyboard.down('Space');await page.waitForTimeout(320);await page.keyboard.up('Space');await page.keyboard.up('d');await page.keyboard.up('w');await page.keyboard.press('Escape');
 const s=await state();assert.equal(s.cars.length,5);assert.ok(s.player.speed>2);results.push({name:'five-car championship, actual keyboard acceleration and chassis turn',pass:true,speed:s.player.speed,yaw:s.player.yaw});
 for(const quality of ['medium','high','low','medium']){
  await click('设置');await page.locator('[data-setting="quality"]').selectOption(quality);await click('保存并返回');await page.waitForTimeout(350);const memory=await page.evaluate(()=>window.__nightCircuit.renderInfo());results.push({name:'live quality change '+quality,pass:true,memory});
  await page.locator('.overlay').evaluate(el=>el.style.visibility='hidden');await page.screenshot({path:`artifacts/screenshots/headlights-championship-${quality}.png`});await page.locator('.overlay').evaluate(el=>el.style.visibility='');
 }
 await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(200);await page.locator('.overlay').evaluate(el=>el.style.visibility='hidden');await page.screenshot({path:'artifacts/screenshots/headlights-tablet-championship.png'});await page.locator('.overlay').evaluate(el=>el.style.visibility='');
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);await page.locator('.overlay').evaluate(el=>el.style.visibility='hidden');await page.screenshot({path:'artifacts/screenshots/headlights-landscape-championship.png'});await page.locator('.overlay').evaluate(el=>el.style.visibility='');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);results.push({name:'intermediate and phone landscape still fit',pass:true});
 await click('继续驾驶');await page.waitForFunction(t=>window.__nightCircuit.snapshot()?.time>t,s.time);await page.keyboard.press('r');await page.waitForTimeout(1600);assert.equal((await state()).player.penalty,5);assert.equal(errors.length,0);results.push({name:'reset and ghost blinking do not produce shader errors',pass:true,errors});
}catch(e){results.push({name:'headlights gameplay',pass:false,error:e.message,errors});process.exitCode=1;console.error(e.message);}finally{fs.writeFileSync('artifacts/headlights-gameplay.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close();}
