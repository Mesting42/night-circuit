export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const mod=(n,m)=>(n%m+m)%m;
export const angle=a=>mod(a+Math.PI,Math.PI*2)-Math.PI;
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const timeText=n=>{ if(!Number.isFinite(n))return '—'; const m=Math.floor(n/60);return `${String(m).padStart(2,'0')}:${(n%60).toFixed(2).padStart(5,'0')}`; };
export function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
