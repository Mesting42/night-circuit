import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const reports=[],errors=[],external=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(!request.url().startsWith('http://localhost:5178')&&!request.url().startsWith('data:'))external.push(request.url());});
const check=(name,pass)=>{assert.ok(pass,name);reports.push({name,pass:true});console.log('PASS '+name);};
try{
  await page.goto('http://localhost:5178/');
  await page.locator('#orientation-lock.is-visible').waitFor();
  check('production portrait page shows landscape and fullscreen actions',await page.locator('#orientation-lock').getByRole('button',{name:'全屏游玩'}).isVisible());
  await page.setViewportSize({width:844,height:390});
  await page.waitForTimeout(200);
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.locator('[data-setting="steering"]').selectOption('buttons');
  await page.getByRole('button',{name:'保存并返回',exact:true}).click();
  await page.getByRole('button',{name:'自由练习',exact:true}).click();
  await page.getByRole('button',{name:'驶入赛道',exact:true}).click();
  await page.locator('[data-control="left"]').waitFor();
  check('production game shows arrow controls and hides the wheel',await page.locator('[data-control="left"]').isVisible()&&await page.locator('[data-control="right"]').isVisible()&&await page.locator('[data-control="steer"]').isHidden());
  await page.screenshot({path:'artifacts/screenshots/production-touch-arrows.png'});
  check('production build runs without dev telemetry or page errors',await page.evaluate(()=>window.__nightCircuit===undefined)&&errors.length===0&&external.length===0);
  fs.writeFileSync('artifacts/browser-production-options.json',JSON.stringify(reports,null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{await browser.close();}
