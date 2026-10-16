// Keep the canvas at least as sharp as its CSS size. Supersampling on desktop
// also helps small bodywork details on screens whose device pixel ratio is 1.
const TIERS={
 low:{min:1,max:1,pixels:2000000},
 medium:{min:1.25,max:1.75,pixels:3000000},
 high:{min:1.5,max:2.25,touchMax:2,pixels:6000000},
};

export function renderPixelRatio({quality='medium',width,height,dpr=1,touch=false}){
 const tier=TIERS[quality]||TIERS.medium;
 const nativePixels=Math.max(1,width)*Math.max(1,height);
 const requested=Math.min(Math.max(dpr||1,tier.min),touch?(tier.touchMax||tier.max):tier.max);
 // Large displays retain native resolution; the budget limits only the extra
 // pixels, so a 4K screen is never stretched from a smaller drawing buffer.
 const budgetRatio=Math.sqrt(Math.max(nativePixels,tier.pixels)/nativePixels);
 return Math.max(1,Math.min(requested,budgetRatio));
}
