import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    Object.defineProperty(Document.prototype,'fullscreenEnabled',{configurable:true,get:()=>true});
    Object.defineProperty(Document.prototype,'fullscreenElement',{configurable:true,get:()=>null});
    Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{configurable:true,value:async function(){throw new Error('test permission rejection');}});
  });
  await page.goto('http://localhost:5188');
  const lock=page.locator('#orientation-lock');
  await lock.getByRole('button',{name:'全屏游玩'}).click();
  await page.waitForFunction(()=>document.querySelector('[data-fullscreen-status]')?.textContent.includes('未能切换全屏'));
  assert.ok(await lock.evaluate(el=>el.classList.contains('is-visible')));
  assert.deepEqual(errors,[]);
  const report=[{name:'rejected fullscreen shows a fallback while preserving portrait lock',pass:true,errors}];
  fs.writeFileSync('artifacts/browser-fullscreen-reject.json',JSON.stringify(report,null,2));
  console.log('PASS rejected fullscreen shows a fallback while preserving portrait lock');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{await browser.close();}
