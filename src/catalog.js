export const CARS=[
 {id:'swift',name:'隼 · S1',tag:'轻量街跑',desc:'轻车身与敏捷转向，连续弯道中的第一选择。',price:0,color:'#e36133',mass:1040,accel:10.4,max:53,grip:10.2,steer:0.53,nitro:13,shape:0},
 {id:'pulse',name:'脉冲 · GT',tag:'均衡轿跑',desc:'更宽的轮距与温和的侧滑，雨夜中稳稳出弯。',price:4500,color:'#58b8be',mass:1260,accel:9.6,max:57,grip:11.6,steer:0.48,nitro:12,shape:1},
 {id:'atlas',name:'重岳 · V8',tag:'高速重型',desc:'强劲中段和更高极速，入弯前留足制动距离。',price:6500,color:'#cfb77e',mass:1580,accel:8.8,max:62,grip:9.7,steer:0.44,nitro:14,shape:2}
];
export const UPGRADES=[
 {id:'engine',name:'动力总成',desc:'每级加速 +7%，极速 +3%；高速更需要提前刹车。',cost:700},
 {id:'tires',name:'雨地轮胎',desc:'每级抓地 +9%，制动力 +6%；漂移需要更明确的手刹输入。',cost:650},
 {id:'suspension',name:'转向悬挂',desc:'每级转向响应 +8%，稳定回正 +6%。',cost:600},
 {id:'nitro',name:'氮气系统',desc:'每级容量 +15%，加速推力 +7%。',cost:550}
];
export const POINTS=[12,9,6,4,2], PRIZES=[2200,1800,1500,1250,1100];
export const DRIVER_NAMES=['你','沈星','林野','阿澈','陆川'];
export const emptyTune=()=>({engine:0,tires:0,suspension:0,nitro:0});
export function carStats(id,tune=emptyTune()){
 const c=CARS.find(c=>c.id===id)||CARS[0];return {...c,accel:c.accel*(1+.07*tune.engine),max:c.max*(1+.03*tune.engine),grip:c.grip*(1+.09*tune.tires),steer:c.steer*(1+.08*tune.suspension),brake:16*(1+.06*tune.tires),stability:1+.06*tune.suspension,capacity:100*(1+.15*tune.nitro),nitro:c.nitro*(1+.07*tune.nitro)};
}
