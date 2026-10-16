import {chromium} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[],external=[],checks=[];page.setDefaultTimeout(45000);page.on("request",r=>{if(!r.url().startsWith("http://localhost:5188")&&!r.url().startsWith("data:"))external.push(r.url());});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
for(const [index,name] of [[0,'harbor'],[6,'forest'],[7,'canyon'],[8,'alpine']]){
 await page.goto('http://localhost:5188');await page.getByRole('button',{name:'自由练习',exact:true}).click();await page.locator(`[data-action="track"][data-index="${index}"]`).click();await page.getByRole('button',{name:'驶入赛道',exact:true}).click();await page.waitForFunction(()=>window.__nightCircuit.snapshot()?.time>1);await page.keyboard.press('Escape');await page.locator('.overlay').evaluate(el=>el.style.display='none');await page.screenshot({path:`artifacts/screenshots/headlights-desktop-${name}.png`});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await page.screenshot({path:`artifacts/screenshots/headlights-phone-${name}.png`});await page.setViewportSize({width:1280,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push({track:name,desktop:"1280x800",phone:"390x844",pass:true});console.log(name,JSON.stringify(errors));
}
assert.equal(errors.length,0);assert.equal(external.length,0);fs.writeFileSync("artifacts/headlights-visual.json",JSON.stringify({checks,errors,external},null,2));await browser.close();
