import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1000,height:760}}),errors=[],external=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(!r.url().startsWith('http://localhost:5188')&&!r.url().startsWith('data:'))external.push(r.url());});
// A render-only optical bench. No game progress or player physics is changed.
await page.route('**/src/main.js',r=>r.fulfill({body:'',contentType:'application/javascript'}));
try{
 await page.goto('http://localhost:5188');
 const samples=await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js'),{createCar}=await import('/src/render.js'),{CARS}=await import('/src/catalog.js'),{attachHeadlights,configureHeadlights}=await import('/src/headlights.js');
  document.body.innerHTML='';const canvas=document.createElement('canvas');document.body.append(canvas);
  const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1000,760);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene();scene.background=new T.Color('#101c26');const car=createCar(CARS[0]);scene.add(car);const rig=attachHeadlights(car,{player:true});
  const wallMaterial=new T.MeshStandardMaterial({color:'#b7b7b7',roughness:1,metalness:0}),wall=new T.Mesh(new T.PlaneGeometry(26,10),wallMaterial);wall.position.set(0,3,20);wall.rotation.y=Math.PI;wall.receiveShadow=true;scene.add(wall);
  const camera=new T.PerspectiveCamera(45,1000/760,.1,150);camera.position.set(0,9,-6);camera.lookAt(0,2,20);
  const target=new T.WebGLRenderTarget(1000,760),read=(x,y,z)=>{const v=new T.Vector3(x,y,z).project(camera),pixel=new Uint8Array(4);renderer.readRenderTargetPixels(target,Math.round((v.x*.5+.5)*999),Math.round((v.y*.5+.5)*759),1,1,pixel);return Array.from(pixel).slice(0,3).reduce((a,b)=>a+b,0)/3;};
  const render=()=>{renderer.setRenderTarget(target);renderer.render(scene,camera);};render();
  const lit=read(0,.2,20),above=read(0,1.8,20),shoulderRight=read(-5,.62,20),shoulderLeft=read(5,.62,20);
  // A real solid car must occlude the two lamps even though the wall stays visible.
  const blocker=createCar(CARS[1]);blocker.position.z=10;scene.add(blocker);render();const blocked=read(0,.2,20);scene.remove(blocker);
  configureHeadlights(car,'low');renderer.shadowMap.enabled=false;render();const lowLit=read(0,.2,20),lowAbove=read(0,1.8,20);
  // Turning the chassis rotates illumination to the perpendicular receiver.
  const sideWall=new T.Mesh(new T.PlaneGeometry(26,10),wallMaterial);sideWall.position.set(20,3,0);sideWall.rotation.y=-Math.PI/2;sideWall.receiveShadow=true;scene.add(sideWall);car.rotation.y=Math.PI/2;
  camera.position.set(-6,9,0);camera.lookAt(20,2,0);render();const turned=read(20,.2,0);
  renderer.setRenderTarget(null);renderer.render(scene,camera);window.opticalBench={renderer,scene,camera};
  target.dispose();return {lit,above,blocked,lowLit,lowAbove,turned,shoulderRight,shoulderLeft};
 });
 const check=(name,condition)=>{assert.ok(condition,`${name}: ${JSON.stringify(samples)}`);results.push({name,pass:true});};
 check('two actual low beams illuminate receiving geometry',samples.lit>80);
 check('upper cutoff prevents illumination above the road lobe',samples.above<samples.lit*.08);
 check('front vehicle blocks actual headlight illumination',samples.blocked<samples.lit*.3);
 check('low quality retains the optical mask without shadow maps',samples.lowLit>80&&samples.lowAbove<samples.lowLit*.08);
 check('illumination follows chassis heading through a ninety degree turn',samples.turned>80);
 check('passenger shoulder cutoff is higher than driver side',samples.shoulderRight>samples.shoulderLeft+10);
 await page.screenshot({path:'artifacts/screenshots/headlights-optical-bench.png'});
 assert.equal(errors.length,0);assert.equal(external.length,0);results.push({name:'no shader errors or remote resources',pass:true,errors,external});
 fs.writeFileSync('artifacts/browser-headlights.json',JSON.stringify({samples,results},null,2));console.log(JSON.stringify({samples,results}));
}catch(e){results.push({name:'headlights optical suite',pass:false,error:e.message,errors});fs.writeFileSync('artifacts/browser-headlights.json',JSON.stringify({results},null,2));console.error(e.message);process.exitCode=1;}finally{await browser.close();}
