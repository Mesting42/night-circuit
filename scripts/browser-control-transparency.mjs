import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://localhost:5188/';
const online=!base.includes('localhost');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const reports=[];
try{
 for(const [name,width,height,touch] of [['phone',844,390,true],['compact-phone',568,320,true],['tablet',1024,768,true],['desktop',1440,900,false]]){
  if(process.argv[3]&&!process.argv[3].split(',').includes(name))continue;
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch});
  const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const click=name=>page.getByRole('button',{name,exact:true}).click();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('night-circuit.save.v1')));
  const styles=()=>page.evaluate(()=>{
   const selectors=['.steering','.steering>i','[data-control="left"]','[data-control="right"]','[data-control="nitro"]','[data-control="throttle"]'];
   return Object.fromEntries(selectors.map(selector=>{const s=getComputedStyle(document.querySelector(selector));return[selector,{background:s.backgroundColor,border:s.borderTopColor,shadow:s.boxShadow,color:s.color,opacity:s.opacity}];}));
  });
  await page.goto(base);await click('自由练习');await click('驶入赛道');await page.locator('#minimap').waitFor();await click('暂停');await page.evaluate(()=>document.fonts.ready);
  const layout=await page.evaluate(()=>{
   const rect=selector=>{const {left,right,top,bottom,width,height}=document.querySelector(selector).getBoundingClientRect();return{left,right,top,bottom,width,height};};
   return{rank:rect('.position-panel'),reset:rect('[data-action="reset"]'),wheel:rect('.steering'),clock:rect('.clock-panel'),map:rect('.map-panel'),speed:rect('.speed'),label:document.querySelector('.steering').textContent.trim(),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(layout.label,'');assert.equal(await page.locator('.clock-panel [data-action="reset"]').count(),0);
  assert.ok(layout.reset.left<width/2);assert.ok(touch?Math.abs(layout.reset.left-layout.wheel.left)<1:Math.abs(layout.reset.left-layout.rank.left)<1);
  assert.ok(layout.reset.top-layout.rank.bottom>=16);assert.ok(layout.reset.width>=44&&layout.reset.height>=44);
  if(touch)assert.ok(layout.wheel.top-layout.reset.bottom>=24);
  assert.ok(Math.abs((layout.speed.left+layout.speed.right)/2-width/2)<1);assert.ok(layout.map.top-layout.clock.bottom>=11);assert.equal(layout.overflow,false);
  const before=await styles();await click('设置');const slider=page.locator('[data-setting="controlTransparency"]');assert.equal(await slider.inputValue(),'0');
  await slider.focus();await slider.press('End');await page.waitForTimeout(250);
  assert.equal(await slider.inputValue(),'80');assert.equal(await page.locator('#control-transparency-value').textContent(),'80%');
  const after=await styles();assert.equal((await saved()).settings.controlTransparency,80);
  for(const selector of Object.keys(before)){assert.equal(after[selector].opacity,'1');if(selector!=='[data-control="throttle"]')assert.equal(after[selector].color,before[selector].color);}
  if(touch)assert.equal(after['[data-control="throttle"]'].color,'rgb(236, 236, 229)');
  assert.deepEqual(after['.steering>i'],before['.steering>i']);
  if(touch){
   const alpha=color=>color.startsWith('rgba(')?Number(color.match(/,\s*([\d.]+)\)$/)[1]):1;
   for(const selector of ['.steering','[data-control="left"]','[data-control="nitro"]','[data-control="throttle"]']){
    assert.ok(Math.abs(alpha(after[selector].background)/alpha(before[selector].background)-.2)<.02,selector+' background');
    if(selector!=='.steering')assert.ok(Math.abs(alpha(after[selector].border)/alpha(before[selector].border)-.2)<.02,selector+' border');
    else{
     const shadowAlpha=shadow=>Number(shadow.match(/rgba\([^)]*,\s*([\d.]+)\)/)?.[1]??1);
     assert.ok(Math.abs(shadowAlpha(after[selector].shadow)/shadowAlpha(before[selector].shadow)-.2)<.02,selector+' inset edge');
    }
   }
  }
  if(name==='phone')await page.screenshot({path:`artifacts/screenshots/controls-${online?'online':'local'}-settings.png`,scale:'css'});
  await click('保存并返回');await page.locator('.overlay').evaluate(el=>el.style.visibility='hidden');
  await page.screenshot({path:`artifacts/screenshots/controls-${online?'online':'local'}-${name}.png`,scale:'css'});await page.locator('.overlay').evaluate(el=>el.style.visibility='');
  let gameplay=null;
  if(name==='phone'&&!online){
   await click('继续驾驶');await page.waitForFunction(()=>window.__nightCircuit.snapshot().countdown<=0);
   const session=await context.newCDPSession(page),point=async control=>{const r=await page.locator(`[data-control="${control}"]`).boundingBox();return{x:r.x+r.width/2,y:r.y+r.height/2,radiusX:4,radiusY:4,force:1};};
   const throttle={...await point('throttle'),id:1},nitro={...await point('nitro'),id:2};
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[throttle]});
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[throttle,nitro]});await page.waitForTimeout(250);
   const held=await page.evaluate(()=>window.__nightCircuit.snapshot());assert.equal(held.player.input.throttle,1);assert.equal(held.player.input.nitro,true);
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const penalty=held.player.penalty;await click('回到赛道，增加五秒惩罚');await page.waitForFunction(p=>window.__nightCircuit.snapshot().player.penalty===p+5,penalty);
   gameplay={multiTouch:true,resetPenalty:5};await click('暂停');
  }
  await page.reload();await click('设置');assert.equal(await slider.inputValue(),'80');
  await slider.focus();await slider.press('Home');await page.locator('[data-setting="steering"]').selectOption('buttons');await click('保存并返回');
  assert.equal((await saved()).settings.controlTransparency,0);
  await click('自由练习');await click('驶入赛道');await page.locator('#minimap').waitFor();await click('暂停');await click('设置');
  await slider.focus();await slider.press('End');await click('保存并返回');
  if(touch){assert.ok(await page.locator('[data-control="left"]').isVisible());assert.ok(await page.locator('.steering').isHidden());}
  assert.deepEqual(errors,[]);reports.push({name,pass:true,base,layout,before,after,gameplay,errors});console.log('PASS control layout/transparency '+name);await context.close();
 }
}finally{fs.writeFileSync(`artifacts/control-transparency-${online?'online':'local'}.json`,JSON.stringify(reports,null,2));await browser.close();}
