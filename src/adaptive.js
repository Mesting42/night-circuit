import {clamp} from './math.js';

const VERSION=2, DAY=86400000;
export const LIVE_LIMIT=.03;
export const PACE_MIN=.64, PACE_MAX=1.2;
const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;
const bounded=(n,fallback,min,max)=>clamp(finite(n,fallback),min,max);
const dayKey=(date)=>{const d=new Date(date);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const dayStamp=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?Date.parse(s+'T00:00:00Z'):NaN;
const shortString=(s)=>typeof s==='string'?s.slice(0,100):'';
export const basePace=difficulty=>difficulty==='pro'?1.04:.94;

export function freshAdaptive(){return{version:VERSION,score:50,confidence:0,plays:0,lastDay:'',decayedThrough:'',lastTarget:50,lastDelta:0,recent:[],seen:[]};}

// Adaptive data is optional in older saves. Repair it independently of garage,
// currency and season progress, keeping only bounded, known fields.
export function normalizeAdaptive(raw){
 const a=raw&&typeof raw==='object'?raw:{};
 const recent=(Array.isArray(a.recent)?a.recent:[]).filter(x=>x&&Number.isFinite(x.rank)&&x.rank>=1&&x.rank<=5&&Number.isFinite(x.target)).slice(-10).map(x=>({
  date:shortString(x.date),track:shortString(x.track),car:shortString(x.car),difficulty:x.difficulty==='pro'?'pro':'street',
  rank:x.rank,target:bounded(x.target,50,0,100),signal:bounded(x.signal,(x.target-50)/50,-1,1),weight:bounded(x.weight,1,.2,1),
  score:bounded(x.score,50,0,100),gapAhead:bounded(x.gapAhead,0,0,600),gapBehind:bounded(x.gapBehind,0,0,600),
  tune:typeof x.tune==='string'?x.tune.slice(0,100):'',assist:x.assist!==false
 }));
 return{version:VERSION,score:bounded(a.score,50,0,100),confidence:bounded(a.confidence,0,0,1),plays:Math.floor(bounded(a.plays,0,0,1000000)),
  lastDay:shortString(a.lastDay),decayedThrough:shortString(a.decayedThrough||a.lastDay),lastTarget:bounded(a.lastTarget,50,0,100),lastDelta:bounded(a.lastDelta,0,-4,4),recent,
  seen:(Array.isArray(a.seen)?a.seen:[]).filter(x=>typeof x==='string').slice(-20).map(shortString)};
}
export function validAdaptive(a){
 return !!a&&a.version===VERSION&&Number.isFinite(a.score)&&a.score>=0&&a.score<=100&&Number.isFinite(a.confidence)&&a.confidence>=0&&a.confidence<=1&&Number.isInteger(a.plays)&&a.plays>=0&&
  typeof a.lastDay==='string'&&typeof a.decayedThrough==='string'&&Number.isFinite(a.lastDelta)&&Math.abs(a.lastDelta)<=4&&Number.isFinite(a.lastTarget)&&a.lastTarget>=0&&a.lastTarget<=100&&
  Array.isArray(a.recent)&&a.recent.length<=10&&a.recent.every(x=>x&&Number.isFinite(x.rank)&&x.rank>=1&&x.rank<=5&&Number.isFinite(x.target)&&x.target>=0&&x.target<=100&&Number.isFinite(x.signal)&&Math.abs(x.signal)<=1&&Number.isFinite(x.weight)&&x.weight>=.2&&x.weight<=1)&&
  Array.isArray(a.seen)&&a.seen.length<=20&&a.seen.every(x=>typeof x==='string');
}

export function applyDailyDecay(raw,date=new Date()){
 const a=normalizeAdaptive(raw),today=dayKey(date),now=dayStamp(today),last=dayStamp(a.decayedThrough||a.lastDay);
 if(!Number.isFinite(now))return a;
 if(Number.isFinite(last)&&now>last){
  // Opening the menu repeatedly on one day never applies decay twice.
  const days=Math.min(365,(now-last)/DAY);
  a.score=50+(a.score-50)*Math.pow(.97,days);a.confidence*=Math.pow(.98,days);
 }
 if(!Number.isFinite(last)||now>=last)a.decayedThrough=today;
 return a;
}

function outcome(result){
 const rank=result.rank,ahead=bounded(result.gapAhead,0,0,600),behind=bounded(result.gapBehind,0,0,600);
 const rankSignal=[1,.45,0,-.45,-1][rank-1];
 const margin=rank===1?clamp(behind/10,0,1):rank===5?-clamp(ahead/10,0,1):clamp((behind-ahead)/12,-1,1);
 const telemetry=result.performance||{},resets=bounded(result.resets,0,0,100),wall=bounded(telemetry.wallRatio,0,0,1),wrong=bounded(telemetry.wrongRatio,0,0,1);
 // A crash-heavy loss carries less evidence than a clean, consistently slow run.
 const weight=clamp(1-resets*.12-wall*1.5-wrong,.25,1);
 return{signal:clamp(rankSignal*.65+margin*.35,-1,1),weight};
}

export function observeAdaptive(raw,result,race,date=new Date()){
 const a=applyDailyDecay(raw,date),id=shortString(result?.attemptId);
 if(!result?.completed||race?.mode!=='championship'||!Number.isInteger(result.rank)||result.rank<1||result.rank>5||id&&a.seen.includes(id))return a;
 const {signal,weight}=outcome(result),old=a.score,today=dayKey(date),condition=result.conditions||{},difficulty=race.difficulty||condition.difficulty||'street';
 // Prefer recent runs on this difficulty; retain a small cross-difficulty signal.
 let weighted=signal*weight,total=weight;
 a.recent.slice(-7).forEach((x,i,arr)=>{
  const age=Math.max(0,(dayStamp(today)-dayStamp(x.date))/DAY)||0;
  const carWeight=x.car&&condition.car&&x.car!==condition.car ? .7 : 1;
  const tuneWeight=x.tune&&condition.tune&&x.tune!==condition.tune ? .8 : 1;
  const assistWeight=typeof condition.assist==='boolean'&&x.assist!==condition.assist ? .8 : 1;
  const w=Math.pow(.74,arr.length-i)*Math.pow(.97,age)*x.weight*(x.difficulty===difficulty?1:.35)*carWeight*tuneWeight*assistWeight;
  weighted+=x.signal*w;total+=w;
 });
 const trend=weighted/total;
 const deadZone=.12,smoothed=signal*.65+trend*.35;
 const delta=Math.abs(smoothed)<=deadZone?0:clamp((Math.abs(smoothed)-deadZone)/(.88)*4,0,4)*Math.sign(smoothed)*weight;
 a.score=clamp(a.score+delta,0,100);a.lastDelta=clamp(a.score-old,-4,4);a.lastTarget=50+signal*50;
 a.confidence=clamp(a.confidence+.18*weight,0,1);a.plays=Math.min(1000000,a.plays+1);a.lastDay=today;a.decayedThrough=today;
 a.recent=[...a.recent,{date:today,track:shortString(result.track),car:shortString(condition.car),difficulty,rank:result.rank,target:a.lastTarget,signal,weight,score:a.score,
  gapAhead:bounded(result.gapAhead,0,0,600),gapBehind:bounded(result.gapBehind,0,0,600),tune:shortString(condition.tune),assist:condition.assist!==false}].slice(-10);
 if(id)a.seen=[...a.seen,id].slice(-20);
 return a;
}

export function raceAdaptive(raw,difficulty='street',mode='practice',date=new Date()){
 const a=applyDailyDecay(raw,date),base=basePace(difficulty),pace=clamp(base+(a.score-50)*.006,PACE_MIN,PACE_MAX),signed=(a.score-50)/50;
 return{enabled:mode==='championship',score:a.score,confidence:a.confidence,base,pace,stability:1+signed*.045,aggression:1+signed*.1,mistake:clamp(.1-signed*.07,.03,.17),
  label:a.plays<3?'适应中':a.score>=60?'对手增强':a.score<=40?'对手放缓':'势均力敌',live:[1,1,1,1]};
}

// This only adjusts requested driving pace. No position, velocity, vehicle
// stats, checkpoint progress or race clock is changed by adaptive difficulty.
export function livePace(current,gapSeconds,dt,eligible=true){
 const excess=Math.max(0,Math.abs(gapSeconds)-2),target=eligible?1+Math.sign(gapSeconds)*LIVE_LIMIT*clamp(excess/8,0,1):1;
 return clamp(current+(target-current)*(1-Math.exp(-dt/12)),1-LIVE_LIMIT,1+LIVE_LIMIT);
}

export function adaptiveReason(before,after,result){
 const delta=after.score-before.score;
 if((result.resets||0)>0||(result.performance?.wallRatio||0)>.12)return '本场事故较多，降低评估权重，保持缓慢调整。';
 if(delta>.1)return '近期领先较稳定，下一场对手会略微提高节奏。';
 if(delta<-.1)return '近期追赶压力较大，下一场对手会略微放缓节奏。';
 return '前后车差距较接近，下一场保持当前节奏。';
}

