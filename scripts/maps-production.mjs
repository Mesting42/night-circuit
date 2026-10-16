import {chromium} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const errors=[],external=[],checks=[];
try{
 const p=await browser.newPage({viewport:{width:1000,height:700}});p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith('http://localhost:5178')&&!r.url().startsWith('data:'))external.push(r.url());});
 await p.goto('http://localhost:5178');await p.getByRole('button',{name:'自由练习',exact:true}).click();assert.equal(await p.locator('[data-action="track"]').count(),9);assert.equal(await p.evaluate(()=>typeof window.__nightCircuit),'undefined');
 await p.locator('[data-action="track"][data-index="7"]').click();await p.getByRole('button',{name:'驶入赛道',exact:true}).click();await p.locator('#speed').waitFor();checks.push({name:'production nine-map selection and canyon race load; developer telemetry absent',pass:true});
 await p.close();
 const legacy=JSON.parse(fs.readFileSync('artifacts/browser-adaptive-profile.json','utf8'));assert.ok(!legacy.season.routes,'must use the real pre-expansion six-station save');
 const ctx=await browser.newContext({viewport:{width:1000,height:700}});await ctx.addInitScript(profile=>localStorage.setItem('night-circuit.save.v1',JSON.stringify(profile)),legacy);const lp=await ctx.newPage();lp.on('pageerror',e=>errors.push(e.message));await lp.goto('http://localhost:5178');await lp.getByRole('button',{name:'继续赛程',exact:true}).click();
 assert.match(await lp.locator('.page-heading').innerText(),/1 \/ 6 站/);assert.equal(await lp.locator('.schedule li').count(),6);await lp.getByRole('button',{name:'查看本站成绩',exact:true}).click();await lp.locator('.result-page').waitFor();
 const migrated=await lp.evaluate(()=>JSON.parse(localStorage.getItem('night-circuit.save.v1')));assert.equal(migrated.cash,legacy.cash);assert.equal(migrated.season.results.length,legacy.season.results.length);assert.deepEqual(migrated.season.points,legacy.season.points);checks.push({name:'real pre-expansion browser save shows original six-station schedule and result without losing money or points',pass:true});
 assert.equal(errors.length,0);assert.equal(external.length,0);checks.push({name:'production has no page errors or remote requests',pass:true});
}catch(e){checks.push({name:'production map smoke',pass:false,error:e.message});process.exitCode=1;console.error(e);}
finally{await browser.close();fs.writeFileSync('artifacts/maps-production.json',JSON.stringify({checks,errors,external},null,2));console.log(JSON.stringify(checks));}
