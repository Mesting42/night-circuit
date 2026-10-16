import {chromium} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
fs.mkdirSync('artifacts/screenshots',{recursive:true});
for(const [name,viewport,mobile] of [['desktop',{width:1440,height:900},false],['phone',{width:390,height:844},true],['tablet',{width:1024,height:768},true]]){
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5188');await page.waitForTimeout(1800);await page.screenshot({path:`artifacts/screenshots/${name}-menu.png`});console.log(name,JSON.stringify({errors,text:(await page.locator('body').innerText()).slice(0,300),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));await page.getByRole('button',{name:'自由练习',exact:true}).click();await page.getByRole('button',{name:'驶入赛道',exact:true}).click();await page.waitForTimeout(4200);await page.screenshot({path:`artifacts/screenshots/${name}-race.png`});console.log(name,'race',JSON.stringify(await page.evaluate(()=>window.__nightCircuit?.snapshot()?.track)),errors);await context.close();
}
await browser.close();
