import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const reports=[];
const check=(name,pass,details={})=>{assert.ok(pass,`${name}: ${JSON.stringify(details)}`);reports.push({name,pass:true,...details});console.log('PASS '+name);};
try{
  const desktop=await browser.newPage({viewport:{width:1280,height:800}});
  await desktop.addInitScript(()=>{
    Object.defineProperty(Document.prototype,'fullscreenEnabled',{configurable:true,get:()=>true});
    Object.defineProperty(Document.prototype,'fullscreenElement',{configurable:true,get(){return this.__testFullscreen||null;}});
    Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{configurable:true,value:async function(){document.__testFullscreen=this;document.dispatchEvent(new Event('fullscreenchange'));}});
    Object.defineProperty(Document.prototype,'exitFullscreen',{configurable:true,value:async function(){this.__testFullscreen=null;this.dispatchEvent(new Event('fullscreenchange'));}});
  });
  const errors=[];desktop.on('pageerror',e=>errors.push(e.message));
  await desktop.goto('http://localhost:5188');
  await desktop.getByRole('button',{name:'全屏游玩',exact:true}).click();
  await desktop.waitForFunction(()=>!!document.fullscreenElement);
  check('menu full-screen control enters fullscreen',await desktop.evaluate(()=>document.fullscreenElement?.tagName==='HTML'));
  await desktop.getByRole('button',{name:'退出全屏',exact:true}).click();
  await desktop.waitForFunction(()=>!document.fullscreenElement);
  check('fullscreen control exits fullscreen',await desktop.evaluate(()=>!document.fullscreenElement));
  await desktop.getByRole('button',{name:'自由练习',exact:true}).click();
  await desktop.getByRole('button',{name:'驶入赛道',exact:true}).click();
  await desktop.waitForTimeout(4200);
  await desktop.getByRole('button',{name:'暂停',exact:true}).click();
  await desktop.getByRole('button',{name:'全屏游玩',exact:true}).click();
  await desktop.waitForFunction(()=>!!document.fullscreenElement);
  check('pause screen also enters fullscreen',await desktop.evaluate(()=>document.fullscreenElement?.tagName==='HTML'));
  await desktop.getByRole('button',{name:'退出全屏',exact:true}).click();
  await desktop.waitForFunction(()=>!document.fullscreenElement);
  check('fullscreen control exits from pause screen',await desktop.evaluate(()=>!document.fullscreenElement));

  const portrait=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await portrait.addInitScript(()=>{
    Object.defineProperty(Document.prototype,'fullscreenEnabled',{configurable:true,get:()=>true});
    Object.defineProperty(Document.prototype,'fullscreenElement',{configurable:true,get(){return this.__testFullscreen||null;}});
    Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{configurable:true,value:async function(){document.__testFullscreen=this;document.dispatchEvent(new Event('fullscreenchange'));}});
    Object.defineProperty(Document.prototype,'exitFullscreen',{configurable:true,value:async function(){this.__testFullscreen=null;this.dispatchEvent(new Event('fullscreenchange'));}});
  });
  portrait.on('pageerror',e=>errors.push(e.message));
  await portrait.goto('http://localhost:5188');
  const lock=portrait.locator('#orientation-lock');
  check('portrait prompt shows fullscreen action',await lock.getByRole('button',{name:'全屏游玩'}).isVisible());
  await lock.getByRole('button',{name:'全屏游玩'}).click();
  await portrait.waitForFunction(()=>!!document.fullscreenElement);
  check('fullscreen can be started from portrait prompt',await portrait.evaluate(()=>document.fullscreenElement?.tagName==='HTML'));
  await portrait.setViewportSize({width:844,height:390});
  await portrait.waitForTimeout(200);
  check('rotating while fullscreen clears portrait prompt',await lock.evaluate(el=>!el.classList.contains('is-visible')));
  await portrait.evaluate(()=>document.exitFullscreen());
  check('no browser errors',errors.length===0,{errors});
  fs.writeFileSync('artifacts/browser-fullscreen.json',JSON.stringify(reports,null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{await browser.close();}
