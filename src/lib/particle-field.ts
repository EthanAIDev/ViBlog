import * as THREE from 'three/webgpu';
import {instancedBufferAttribute,instancedDynamicBufferAttribute,uv,exp,float,smoothstep,materialOpacity} from 'three/tsl';

/** One instanced sprite draw: soft light motes with a bounded cursor force. */
export function createParticleField(scene:THREE.Scene,camera:THREE.Camera){
  const capacity=280;
  const base=new Float32Array(capacity*3),positions=new Float32Array(capacity*3),colors=new Float32Array(capacity*3),sizes=new Float32Array(capacity*2),phases=new Float32Array(capacity);
  let seed=7183;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  for(let index=0;index<capacity;index++){
    const offset=index*3;
    base[offset]=(random()-.5)*18;base[offset+1]=(random()-.5)*9;base[offset+2]=(random()-.5)*7;
    positions.set(base.subarray(offset,offset+3),offset);
    colors.set([.45,.65,.95],offset);phases[index]=random()*Math.PI*2;
    const size=.075+random()*.1;sizes.set([size,size],index*2);
  }
  const positionAttribute=new THREE.InstancedBufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage);
  const colorAttribute=new THREE.InstancedBufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage);
  const sizeAttribute=new THREE.InstancedBufferAttribute(sizes,2);
  // Shader-authored radial light needs no image, texture or secondary 2D context.
  const radius=uv().sub(.5).length();
  const glow=exp(radius.mul(-12)).mul(float(1).sub(smoothstep(.35,.5,radius)));
  const material=new THREE.SpriteNodeMaterial({transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending});
  material.positionNode=instancedDynamicBufferAttribute(positionAttribute,'vec3');
  material.colorNode=instancedDynamicBufferAttribute(colorAttribute,'vec3');
  material.opacityNode=glow.mul(materialOpacity);
  material.scaleNode=instancedBufferAttribute(sizeAttribute,'vec2');
  const cloud=new THREE.Sprite(material);cloud.name='cursor-particle-field';
  cloud.geometry=cloud.geometry.clone();
  cloud.geometry.setAttribute('particlePosition',positionAttribute);cloud.geometry.setAttribute('particleColor',colorAttribute);cloud.geometry.setAttribute('particleSize',sizeAttribute);
  cloud.count=capacity;cloud.frustumCulled=false;scene.add(cloud);
  const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),-.5),cursor=new THREE.Vector3();
  return {
    get count(){return cloud.count;},
    resize(mobile:boolean){cloud.count=mobile?125:capacity;},
    update(time:number,dt:number,pointer:THREE.Vector2,active:boolean,motion:boolean){
      const interacting=active&&motion;
      if(interacting){ray.setFromCamera(pointer,camera);if(!ray.ray.intersectPlane(plane,cursor))cursor.set(100,100,0);}
      const blend=motion?1-Math.exp(-dt*7):1;
      let response=0;
      for(let index=0;index<cloud.count;index++){
        const offset=index*3,phase=phases[index];
        let x=base[offset]+Math.sin(time*.18+phase)*.22;
        let y=base[offset+1]+Math.sin(time*.12+phase*1.7)*.18;
        const z=base[offset+2]+Math.cos(time*.15+phase)*.12;
        const dx=x-cursor.x,dy=y-cursor.y,distance=Math.hypot(dx,dy);
        const influence=interacting?Math.max(0,1-distance/1.65):0;
        if(influence>0){
          const force=influence*influence/(1+Math.abs(z-.5)*.2);
          x+=(dx/(distance+.08)*.8-dy*.24)*force;
          y+=(dy/(distance+.08)*.8+dx*.24)*force;
          response+=force;
        }
        positions[offset]+=(x-positions[offset])*blend;positions[offset+1]+=(y-positions[offset+1])*blend;positions[offset+2]+=(z-positions[offset+2])*blend;
        const shimmer=motion?.7+Math.sin(time*.5+phase)*.12:.45;
        colors[offset]=shimmer*(.55+influence*.9);colors[offset+1]=shimmer*(.78+influence*.8);colors[offset+2]=shimmer*(1+influence*.65);
      }
      positionAttribute.needsUpdate=true;colorAttribute.needsUpdate=true;
      material.opacity=motion?.8:.35;
      return response;
    },
    dispose(){scene.remove(cloud);cloud.geometry.dispose();material.dispose();}
  };
}
