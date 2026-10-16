import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.argv[2]||'http://localhost:5188';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const results=[],errors=[];
const check=(name,pass,details={})=>{assert.ok(pass,`${name}: ${JSON.stringify(details)}`);results.push({name,pass:true,...details});};
try{
 const desktop=await browser.newPage({viewport:{width:1280,height:800}});
 desktop.on('pageerror',e=>errors.push(e.message));
 await desktop.goto(base);
 await desktop.locator('#orientation-lock').waitFor({state:'attached'});
 check('desktop browsers do not show orientation lock',await desktop.locator('#orientation-lock').evaluate(el=>!el.classList.contains('is-visible')&&el.getAttribute('aria-hidden')==='true'));

 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const p=await mobile.newPage();
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);
 const lock=p.locator('#orientation-lock');
 await lock.waitFor({state:'attached'});
 await p.screenshot({path:'artifacts/screenshots/orientation-lock-portrait.png'});
 check('handheld portrait shows blocking message',await lock.evaluate(el=>el.classList.contains('is-visible')&&el.getAttribute('aria-hidden')==='false'),{text:await lock.innerText()});
 check('portrait input is disabled',await p.evaluate(()=>window.__nightCircuit.snapshot()===null));
 await p.setViewportSize({width:844,height:390});
 await p.waitForTimeout(300);
 await p.screenshot({path:'artifacts/screenshots/orientation-landscape-clear.png'});
 check('handheld landscape clears blocking message',await lock.evaluate(el=>!el.classList.contains('is-visible')&&el.getAttribute('aria-hidden')==='true'));

 await p.getByRole('button',{name:'自由练习',exact:true}).click();
 await p.locator('[data-action="track"][data-index="0"]').click();
 await p.getByRole('button',{name:'驶入赛道',exact:true}).click();
 await p.waitForTimeout(4200);
 const before=await p.evaluate(()=>window.__nightCircuit.snapshot());
 check('landscape race accepts controls',before!==null&&before.orientationBlocked===false);
 await p.setViewportSize({width:390,height:844});
 await p.waitForTimeout(350);
 const blocked=await p.evaluate(()=>window.__nightCircuit.snapshot());
 check('returning to portrait pauses active race',blocked?.paused===true&&blocked.orientationBlocked===true,{time:blocked?.time});
 const frozen=blocked.time;
 await p.waitForTimeout(500);
 const frozenAgain=await p.evaluate(()=>window.__nightCircuit.snapshot());
 check('portrait pause freezes race clock',frozenAgain.time===frozen);
 await p.setViewportSize({width:844,height:390});
 await p.waitForTimeout(350);
 const resumed=await p.evaluate(()=>window.__nightCircuit.snapshot());
 check('rotating back resumes active race',resumed?.paused===false&&resumed.orientationBlocked===false);
 check('no browser errors',errors.length===0,{errors});
 fs.writeFileSync('artifacts/browser-orientation.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results));
}catch(e){
 results.push({name:'orientation suite',pass:false,error:e.message,errors});
 fs.writeFileSync('artifacts/browser-orientation.json',JSON.stringify(results,null,2));
 console.error(e.message);process.exitCode=1;
}finally{await browser.close();}
