// Shared deterministic seeds keep the first-paint field and GPU field aligned.
let seed=7183;
const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
export const particleSeeds=Array.from({length:280},()=>({x:(random()-.5)*18,y:(random()-.5)*9,z:(random()-.5)*7,phase:random()*Math.PI*2,size:.075+random()*.1}));

export function projectedParticles(mobile:boolean){
 const width=mobile?390:1440,height=mobile?617:680,cameraZ=mobile?17:13.5,fov=mobile?44:35;
 const pixel=(value:number)=>Number(value.toFixed(3));
 return particleSeeds.slice(0,mobile?125:280).map(particle=>{
  const scale=height/(2*Math.tan(fov*Math.PI/360)*(cameraZ-particle.z-.12*Math.cos(particle.phase)));
  return {x:pixel(width/2+(particle.x+.22*Math.sin(particle.phase))*scale),y:pixel(height/2-(particle.y+.18*Math.sin(particle.phase*1.7)-.2)*scale),r:pixel(particle.size*scale/2),phase:pixel(particle.phase)};
 });
}
