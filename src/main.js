import '@fontsource/noto-sans-sc/chinese-simplified-400.css';
import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-600-italic.css';
import './style.css';
import {Renderer} from './render.js';
import {SaveStore} from './save.js';
import {Input} from './input.js';
import {AudioEngine} from './audio.js';
import {UI} from './ui.js';
import {Race} from './race.js';
import {STEP} from './physics.js';
import {tracks} from './tracks.js';
import {OrientationGuard} from './orientation.js';
import {FullscreenController} from './fullscreen.js';
import {RenderMotion} from './frame-flow.js';
class App {
 constructor(){this.orientation=new OrientationGuard();this.store=new SaveStore();this.audio=new AudioEngine();this.audio.configure(this.store.profile.settings);this.race=null;this.motion=new RenderMotion();this.audioTick=0;this.renderer=new Renderer(document.querySelector('#world'));this.renderer.setQuality(this.store.profile.settings.quality);this.input=new Input(action=>action==='pause'?this.togglePause():this.reset());this.ui=new UI(this,document.querySelector('#ui'));this.fullscreen=new FullscreenController(this.orientation,message=>this.ui.toast(message));this.fullscreen.configure(this.store.profile.settings);this.orientation.onChange(blocked=>this.handleOrientation(blocked));this.lastMode='practice';this.lastTrack=tracks[0];this.accumulator=0;this.last=performance.now();this.menu();if(this.store.warning)this.ui.toast(this.store.warning);else if(this.store.profile.notice){this.ui.toast(this.store.profile.notice);this.store.profile.notice='';this.store.save();}document.addEventListener('visibilitychange',()=>{if(document.hidden){if(this.race)this.pause();this.audio.pause();this.input.clear();}else if(!this.race)this.audio.resume();});window.addEventListener('blur',()=>{if(this.race)this.pause();});window.addEventListener('pagehide',()=>{this.input.clear();this.store.save();});document.addEventListener('pointerdown',()=>{this.audio.unlock();if(this.race&&!this.audio.engines.length)this.audio.startCars(this.race.cars);},{once:true});requestAnimationFrame(t=>this.frame(t));}
 handleOrientation(blocked){this.input.clear();this.input.active=!blocked&&!!this.race;if(blocked){if(this.race&&!this.race.paused){this.orientationPaused=true;this.pause(false);}return;}if(this.race&&this.orientationPaused){this.orientationPaused=false;this.resume();}}
 menu(){this.input.active=false;this.input.clear();this.audio.resume();this.audio.stopCars();this.audio.setMode('menu');this.race=null;this.accumulator=0;this.renderer.showGarage(this.store.profile.selected);this.ui.show('menu');}
 newSeason(){this.store.seasonStart();if(!this.store.profile.tutorial){this.afterTutorial='season';this.startRace('tutorial',tracks[0]);}else this.ui.show('season');}
 completeTutorial(){this.store.profile.tutorial=true;this.store.save();const next=this.afterTutorial||'menu';this.menu();if(next==='season')this.ui.show('season');this.ui.toast('驾驶教学已完成。雨夜里，提前刹车会比顶着护栏更快。');}
 startRace(mode,track){if(mode==='championship'&&!this.store.beforeRace()){this.ui.toast('本站已结算，请继续赛程或选择重试。');return;}this.input.clear();this.race=new Race(track,mode,this.store.profile);this.motion.reset(this.race.cars);this.lastMode=mode;this.lastTrack=track;this.renderer.loadRace(this.race);this.input.active=!this.orientation.blocked;this.orientation.requestLandscapeLock();this.input.auto=this.store.profile.settings.autoThrottle&&matchMedia('(pointer:coarse)').matches;this.audio.resume();this.audio.setMode('race');this.audio.startCars(this.race.cars);this.accumulator=0;this.ui.show('race');this.fullscreen.sync();}
 restart(){const mode=this.lastMode,track=this.lastTrack;if(mode==='championship')this.store.retry();this.startRace(mode,track);}
 pause(show=true){if(!this.race||this.race.finished)return;this.race.pause();this.input.active=false;this.input.clear();this.audio.pause();this.accumulator=0;if(show){this.ui.overlay={type:'pause'};this.ui.render();}}
 resume(){if(!this.race)return;this.input.clear();this.input.active=true;this.race.resume();this.motion.reset(this.race.cars);this.audio.resume();this.ui.overlay=null;this.ui.render();this.last=performance.now();this.accumulator=0;}
 togglePause(){if(!this.race||this.orientation?.blocked)return;if(this.race.paused)this.resume();else this.pause();}
 reset(){if(this.race&&!this.race.paused&&this.race.countdown<=0&&this.race.reset()){this.motion.reset(this.race.cars);this.audio.event('reset');this.ui.toast('已回到最近合法检查点 · +5 秒 · 2 秒碰撞保护');}}
 finish(){const race=this.race;this.result=race.result();if(this.lastMode==='championship')this.store.settle(this.result);else if(this.lastMode==='time')this.store.record(race.track,this.result,race);this.input.active=false;this.input.clear();this.audio.event('finish');this.audio.stopCars();this.audio.setMode('victory');this.race=null;this.renderer.showGarage(this.store.profile.selected);this.ui.show('results');}
 frame(now){
  const elapsed=Math.min((now-this.last)/1000,.25);this.last=now;const race=this.race;
  if(race&&!race.paused){
   this.accumulator+=elapsed;let safety=0;
   while(this.accumulator>=STEP&&safety++<32){this.motion.capture(race.cars);race.step(this.input.read(),STEP);this.accumulator-=STEP;}
   for(const e of race.events.splice(0)){if(e.type==='count')this.audio.event(e.value===0?'go':'count');else if(e.type==='lap'&&e.id===0){this.audio.event('lap');this.ui.toast('完成第 '+race.player.lap+' 圈');}else if(e.type==='tutorial')this.audio.event('lap');}
   if(race.mode==='tutorial'&&race.tutorial.done)this.completeTutorial();else if(race.finished)this.finish();
  }
  const poses=this.race?this.motion.sample(this.race.cars,this.race.paused?1:this.accumulator/STEP):null;
  this.renderer.frame(elapsed,this.race,poses);
  this.audioTick+=elapsed;if(this.audioTick>=1/40){this.audio.update(this.race?.cars||[]);this.audioTick=0;}
  if(this.race)this.ui.update(this.race,now);
  requestAnimationFrame(t=>this.frame(t));
 }
}
try{const app=new App();if(import.meta.env.DEV){Object.defineProperty(window,'__nightCircuit',{value:{snapshot:()=>app.race?{mode:app.race.mode,paused:app.race.paused,time:app.race.time,countdown:app.race.countdown,track:app.race.track.id,laps:app.race.laps,adaptive:JSON.parse(JSON.stringify(app.race.adaptive)),performance:{...app.race.performance},player:JSON.parse(JSON.stringify(app.race.player)),cars:app.race.cars.map(c=>({id:c.id,x:c.x,z:c.z,yaw:c.yaw,speed:c.speed,s:c.s,lap:c.lap,passed:c.passed,finish:c.finish,penalty:c.penalty})),tutorial:{...app.race.tutorial},orientationBlocked:app.orientation.blocked}:null,profile:()=>JSON.parse(JSON.stringify(app.store.profile)),renderInfo:()=>({flow:app.renderer.performanceInfo(),triangles:app.renderer.renderer.info.render.triangles,resolution:app.renderer.resolutionInfo(),...app.renderer.renderer.info.memory,drawCalls:app.renderer.renderer.info.render.calls,environment:app.renderer.mode==='race'?app.renderer.track?.theme:'garage',precipitation:app.renderer.rain?(app.renderer.snow?'snow':'rain'):'clear',terrain:!!app.renderer.land,iceLake:!!app.renderer.land?.lake})}});}}
catch(error){console.error(error);document.querySelector('#ui').innerHTML='<main class="fatal"><h1>街区未能加载</h1><p>请使用一键启动器打开游戏，并确认浏览器开启硬件加速、支持 WebGL 2。</p><button onclick="location.reload()">重新加载</button><pre></pre></main>';document.querySelector('pre').textContent=error.message;}
