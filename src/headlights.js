import * as T from 'three';

// A locally generated angular light distribution, projected by actual lamps.
// Its upper cutoff and wider road lobe shape illumination on receiving surfaces.
function lowBeamTexture(){
 const width=256,height=512,data=new Uint16Array(width*height*4);
 const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/(width-1)*2-1,v=y/(height-1)*2-1;
  // Slightly raised passenger-side shoulder with a soft optical cutoff.
  const cutoff=.020+.016*smooth(-.08,.4,u);
  const upper=1-smooth(cutoff-.010,cutoff+.010,v);
  const horizontal=Math.exp(-Math.pow(Math.abs(u)/.71,4));
  const core=Math.exp(-Math.pow(u/.55,2)-Math.pow((v+.005)/.048,2));
  // Downward angles get much less power: close asphalt must not wash out.
  const middle=.016*Math.exp(-Math.pow(u/.7,2)-Math.pow((v+.12)/.12,2));
  const foreground=.0015*Math.exp(-Math.pow(u/.76,2)-Math.pow((v+.24)/.28,2));
  const rim=1-smooth(.85,.99,Math.hypot(u,v));
  const brightness=T.DataUtils.toHalfFloat(Math.min(1,(core+middle+foreground)*upper*horizontal*rim));
  const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=brightness;data[i+3]=T.DataUtils.toHalfFloat(1);
 }
 const tex=new T.DataTexture(data,width,height,T.RGBAFormat,T.HalfFloatType);tex.minFilter=tex.magFilter=T.LinearFilter;tex.generateMipmaps=false;tex.needsUpdate=true;return tex;
}
export function attachHeadlights(model,{player=false,quality='medium'}={}){
 const parent=model.userData.body,pattern=lowBeamTexture(),lamps=[];
 for(const x of[-.64,.64]){
  const light=new T.SpotLight('#fff4e4',player?95000:55000,72,.52,.55,2);
  light.position.set(x,.77,2.4);light.target.position.set(x,-.12,34);
  light.map=pattern;light.castShadow=player&&quality!=='low';
  light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;
  light.shadow.mapSize.set(quality==='high'?1024:512,quality==='high'?1024:512);
  light.shadow.camera.near=.08;light.shadow.bias=-.00012;light.shadow.normalBias=.018;light.shadow.radius=2;
  parent.add(light,light.target);lamps.push(light);
 }
 model.userData.headlights={lamps,pattern,player};return model.userData.headlights;
}
export function configureHeadlights(model,quality){
 const rig=model.userData.headlights;if(!rig)return;
 for(const light of rig.lamps){
  light.castShadow=rig.player&&quality!=='low';
  light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;
  const size=quality==='high'?1024:512;
  if(light.shadow.mapSize.x!==size){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.set(size,size);}
 }
}

// Scatter only in existing precipitation particles, with the same optical mask.
// There is no visible cone mesh and no light-painted plane above the asphalt.
export function lightPrecipitation(points,rig){
 if(!rig)return;
 const matrices=rig.lamps.map(l=>({value:l.shadow.matrix}));
 points.onBeforeRender=()=>{for(const light of rig.lamps)light.shadow.updateMatrices(light);};
 points.material.onBeforeCompile=shader=>{
  shader.uniforms.lowBeamLeft=matrices[0];shader.uniforms.lowBeamRight=matrices[1];
  shader.uniforms.lowBeamPattern={value:rig.pattern};
  shader.vertexShader='uniform mat4 lowBeamLeft;uniform mat4 lowBeamRight;varying vec4 vLowBeamLeft;varying vec4 vLowBeamRight;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec4 rainWorld=modelMatrix*vec4(transformed,1.0);vLowBeamLeft=lowBeamLeft*rainWorld;vLowBeamRight=lowBeamRight*rainWorld;');
  shader.fragmentShader='uniform sampler2D lowBeamPattern;varying vec4 vLowBeamLeft;varying vec4 vLowBeamRight;\nfloat lowBeamScatter(vec4 projected){vec3 uv=projected.xyz/projected.w;if(projected.w<=0.0||any(lessThan(uv,vec3(0.0)))||any(greaterThan(uv,vec3(1.0))))return 0.0;return texture2D(lowBeamPattern,uv.xy).r*(1.0-smoothstep(3.0,38.0,projected.w));}\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = diffuseColor.rgb;','float scatter=lowBeamScatter(vLowBeamLeft)+lowBeamScatter(vLowBeamRight);vec3 outgoingLight=diffuseColor.rgb+vec3(1.0,.96,.89)*scatter*.28;');
 };
 points.material.customProgramCacheKey=()=> 'precipitation-low-beam-v1';
}
