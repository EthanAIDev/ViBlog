import * as THREE from 'three/webgpu';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createParticleField} from './particle-field';

export type TheatreState={motion:boolean;selected:number|null;hovered:number|null;scroll:number};
export type TheatreHandle={backend:string;update:(state:TheatreState)=>void;dispose:()=>void};
type Callbacks={select:(index:number)=>void;hover:(index:number|null)=>void;project:(positions:{x:number;y:number}[])=>void};

/** Owns rendering and gesture arbitration; React owns the visitor's controls. */
export async function createTheatre(host:HTMLElement,callbacks:Callbacks):Promise<TheatreHandle>{
  const renderer=new THREE.WebGPURenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.25:1.5));
  renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;
  try{await renderer.init();}catch(error){renderer.dispose();throw error;}
  host.appendChild(renderer.domElement);
  const backend='isWebGPUBackend' in renderer.backend?'WebGPU':'WebGL 2';
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,60);camera.position.set(0,.2,13.5);
  const environment=new RoomEnvironment();
  // Black exhibition walls and narrow softboxes give metal a dark/light reflection,
  // rather than the uniformly white finish of the default studio environment.
  environment.traverse(object=>{
    if(object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial)object.material.color.set(0x626c7a);
    if(object instanceof THREE.PointLight)object.intensity=350;
    if(object instanceof THREE.Mesh && object.material instanceof THREE.MeshLambertMaterial){object.material.emissiveIntensity*=.35;object.scale.multiplyScalar(1.5);}
  });
  const pmrem=new THREE.PMREMGenerator(renderer);const environmentMap=pmrem.fromScene(environment,.025);
  scene.environment=environmentMap.texture;scene.environmentIntensity=1.1;scene.environmentRotation.set(.35,.7,.15);environment.dispose();
  const key=new THREE.DirectionalLight(0xffe9ce,2);key.position.set(-4,5,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x517dff,3);rim.position.set(5,2,-2);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xc7d9ff,.7);fill.position.set(-5,-2,2);scene.add(fill);
  // A small white source catches nearby bevels without recoloring an entire ring.
  const pointerLight=new THREE.PointLight(0xf4f6ff,0,1.65,2);pointerLight.name='pointer-reflection';scene.add(pointerLight);
  const world=new THREE.Group();world.position.set(1.25,.25,0);world.rotation.z=-.16;scene.add(world);
  const chrome=new THREE.MeshPhysicalMaterial({color:0xd6dfeb,metalness:1,roughness:.19,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.5});
  const glass=new THREE.MeshPhysicalMaterial({color:0x8799b0,metalness:0,roughness:.12,transmission:.65,thickness:.12,ior:1.46,transparent:true,opacity:.72,clearcoat:1,side:THREE.DoubleSide});
  const wire=new THREE.MeshStandardMaterial({color:0xc7c3ba,metalness:1,roughness:.29});
  const joint=new THREE.MeshStandardMaterial({color:0x646a73,metalness:1,roughness:.24});
  function addMesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,material:THREE.Material){const mesh=new THREE.Mesh(geometry,material);parent.add(mesh);return mesh;}
  function band(radius:number,width:number,start:number,end:number){
    const shape=new THREE.Shape();shape.absarc(0,0,radius,start,end,false);shape.lineTo(Math.cos(end)*(radius-width),Math.sin(end)*(radius-width));shape.absarc(0,0,radius-width,end,start,true);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.045,bevelThickness:.065,curveSegments:120});geo.translate(0,0,-.04);return geo;
  }
  const radii=[3.35,2.65,1.85];
  const rotations=[new THREE.Euler(.86,.3,-.5),new THREE.Euler(.2,1.05,.5),new THREE.Euler(1.15,-.45,-.35)];
  const ringGroups=radii.map((radius,index)=>{
    const ring=new THREE.Group();ring.rotation.copy(rotations[index]);ring.userData.ring=index;world.add(ring);
    const body=addMesh(ring,band(radius,.16,index*.8+.22,index*.8+5.8),chrome.clone());
    body.userData.ring=index;
    const glazing=addMesh(ring,band(radius-.2,.13,index*.8+.5,index*.8+5.5),glass);glazing.position.z=-.16;
    for(let n=0;n<5;n++){
      const r=radius-.38-n*.04;const points=[];
      for(let k=0;k<=90;k++){const t=.22+k/90*5.6+index*.8;points.push(new THREE.Vector3(Math.cos(t)*r,Math.sin(t)*r,-.08+n*.012));}
      addMesh(ring,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),90,.008,6,false),wire);
    }
    for(const angle of [.35,1.7,3.2,4.8]){
      const clamp=new THREE.Group();clamp.position.set(Math.cos(angle+index*.8)*(radius-.17),Math.sin(angle+index*.8)*(radius-.17),0);clamp.rotation.z=angle+index*.8;ring.add(clamp);
      addMesh(clamp,new THREE.BoxGeometry(.45,.075,.16),joint);
      for(const side of [-1,1]){const screw=addMesh(clamp,new THREE.CylinderGeometry(.045,.045,.2,12),chrome);screw.rotation.x=Math.PI/2;screw.position.x=side*.13;}
    }
    // Broad invisible picking band makes the thin sculpture usable by mouse and touch.
    const target=addMesh(ring,new THREE.TorusGeometry(radius-.17,.2,8,80,5.8),new THREE.MeshBasicMaterial({visible:false}));target.userData.ring=index;
    return {ring,radius,target};
  });
  const pickingTargets=ringGroups.map(({target})=>target);
  // A restrained mirrored echo grounds the sculpture without a full-screen reflection pass.
  const reflection=world.clone(true);reflection.position.y=-5.8;reflection.scale.y=-.24;
  reflection.traverse(object=>{if(object instanceof THREE.Mesh){const original=object.material as THREE.Material;const material=original.clone();material.transparent=true;material.opacity=.065;material.depthWrite=false;object.material=material;}});scene.add(reflection);
  const particles=createParticleField(scene,camera);
  let state:TheatreState={motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,selected:null,hovered:null,scroll:0};
  let disposed=false,visible=true,dirty=true,settling=true,width=1,height=1,last=performance.now(),time=0,dragging=false,pending=false,downX=0,downY=0,lastX=0,lastY=0,velocityX=0,velocityY=0,userYaw=0,userPitch=0,hovered:number|null=null,particlePointerInside=false;
  const pointer=new THREE.Vector2(),follow=new THREE.Vector2(),raycaster=new THREE.Raycaster();
  const particlePointer=new THREE.Vector2();
  const reflectionSurface=new THREE.Vector3(),reflectionPosition=new THREE.Vector3(),lightDirection=new THREE.Vector3(),reflectionNormal=new THREE.Vector3(),reflectionNormalMatrix=new THREE.Matrix3();
  let reflectionPointerInside=false,reflectionStrength=0,reflectionFrom=0,reflectionTarget=0,reflectionStarted=0,reflectionSettling=false;
  const cameraAim=new THREE.Vector3(0,.2,0),neutralPointer=new THREE.Vector2();
  const clamp=THREE.MathUtils.clamp;
  const project=()=>{
    const point=new THREE.Vector3();callbacks.project(ringGroups.map(({ring,radius},index)=>{
      point.set(Math.cos(.7+index*1.9)*radius,Math.sin(.7+index*1.9)*radius,0);ring.localToWorld(point).project(camera);
      return {x:Math.round(clamp((point.x+1)*width/2,45,width-45)),y:Math.round(clamp((-point.y+1)*height/2,90,height-95))};
    }));
  };
  const resize=new ResizeObserver(()=>{const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return;width=rect.width;height=rect.height;camera.aspect=width/height;camera.fov=width<760?44:35;camera.position.z=width<760?17:13.5;world.position.x=width<760?.2:1.25;particles.resize(width<760);camera.updateProjectionMatrix();renderer.setSize(width,height);dirty=true;});resize.observe(host);
  const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;dirty=true;},{rootMargin:'60px'});visibility.observe(host);
  const canvas=renderer.domElement;
  function hit(event:PointerEvent){const rect=canvas.getBoundingClientRect();const coordinates=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(coordinates,camera);let object:THREE.Object3D|null=raycaster.intersectObjects(ringGroups.map(({ring})=>ring),true)[0]?.object||null;while(object&&object.userData.ring===undefined)object=object.parent;return object?Number(object.userData.ring):null;}
  function down(event:PointerEvent){if(event.button!==0)return;downX=lastX=event.clientX;downY=lastY=event.clientY;pending=true;dragging=false;velocityX=velocityY=0;pointer.copy(follow);}
  function move(event:PointerEvent){
    dirty=true;
    if(pending){
      const dx=event.clientX-downX,dy=event.clientY-downY;
      if(event.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>7){pending=false;return;}
      if(Math.hypot(dx,dy)>5){dragging=true;canvas.setPointerCapture(event.pointerId);canvas.style.cursor='grabbing';callbacks.hover(null);}
      if(dragging){velocityX=(event.clientX-lastX)*.004;velocityY=(event.clientY-lastY)*.003;userYaw+=velocityX;userPitch=clamp(userPitch+velocityY,-.6,.6);lastX=event.clientX;lastY=event.clientY;}
      return;
    }
    const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width-.5,(event.clientY-rect.top)/rect.height-.5);
    const index=hit(event);if(hovered!==index){hovered=index;callbacks.hover(index);}canvas.style.cursor=index===null?'grab':'pointer';
  }
  function up(event:PointerEvent){if(pending&&!dragging&&Math.hypot(event.clientX-downX,event.clientY-downY)<6){const index=hit(event);if(index!==null)callbacks.select(index);}pending=false;dragging=false;if(!state.motion)velocityX=velocityY=0;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);canvas.style.cursor='grab';}
  const cancel=()=>{pending=false;dragging=false;velocityX=velocityY=0;hovered=null;callbacks.hover(null);};
  const leave=()=>{if(!dragging){pointer.set(0,0);hovered=null;callbacks.hover(null);dirty=true;}};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('pointerleave',leave);canvas.style.touchAction='pan-y';
  const stage=host.parentElement!;
  const fieldMove=(event:PointerEvent)=>{const rect=canvas.getBoundingClientRect();particlePointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);particlePointerInside=Math.abs(particlePointer.x)<=1&&Math.abs(particlePointer.y)<=1;reflectionPointerInside=particlePointerInside&&event.pointerType!=='touch';dirty=true;};
  const fieldLeave=()=>{particlePointerInside=false;reflectionPointerInside=false;dirty=true;};
  stage.addEventListener('pointermove',fieldMove,{passive:true});stage.addEventListener('pointerleave',fieldLeave);stage.addEventListener('pointercancel',fieldLeave);
  renderer.setAnimationLoop(()=>{
    if(disposed)return;const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
    if(!visible||document.hidden)return;
    const autonomous=state.motion;
    const kinetic=state.motion&&!dragging&&(Math.abs(velocityX)+Math.abs(velocityY)>.0001);
    if(!dirty&&!settling&&!autonomous&&!kinetic&&!reflectionSettling)return;
    if(autonomous)time+=dt;
    if(kinetic){userYaw+=velocityX;userPitch=clamp(userPitch+velocityY,-.6,.6);velocityX*=.88;velocityY*=.88;}
    const followTarget=state.motion?pointer:neutralPointer;
    if(!dragging)follow.lerp(followTarget,1-Math.exp(-dt*5));
    const expansion=state.motion?state.scroll:0;
    world.rotation.y=.15+userYaw+follow.x*.12;
    world.rotation.x=.2+userPitch+follow.y*.09;
    const scale=(width<760?1.1:1.32)*(1-expansion*.09);world.scale.set(scale,scale*.9,scale);
    const desiredZoom=state.selected===null?1:1.1;camera.zoom+=(desiredZoom-camera.zoom)*(state.motion?.12:1);camera.updateProjectionMatrix();
    settling=Math.abs(desiredZoom-camera.zoom)>.0001||(!dragging&&follow.distanceTo(followTarget)>.0001);
    ringGroups.forEach(({ring},index)=>{
      const selected=state.selected===index;
      ring.rotation.z=rotations[index].z+time*[.055,-.04,.07][index];
      const offset=state.selected===null?0:selected?.32:(index-state.selected)*.26;
      ring.position.x+=(offset-ring.position.x)*(state.motion?.15:1);
      const separation=(index-1)*expansion*.6+(state.selected===null?0:selected?.6:-.3);
      ring.position.z+=(separation-ring.position.z)*(state.motion?.09:1);
      settling=settling||Math.abs(separation-ring.position.z)>.0001||Math.abs(offset-ring.position.x)>.0001;
      ring.updateMatrix();
    });
    // Each selection gets its own camera aim without adding UI over the sculpture.
    const aim=new THREE.Vector3(0,.2,0);
    if(state.selected!==null){const {ring,radius}=ringGroups[state.selected];const angle=.9+state.selected*2.1;aim.set(Math.cos(angle)*radius*.22,Math.sin(angle)*radius*.22,0);ring.localToWorld(aim);aim.x*=.35;aim.y*=.35;}
    cameraAim.lerp(aim,state.motion?.1:1);camera.lookAt(cameraAim);settling=settling||cameraAim.distanceTo(aim)>.0001;
    camera.updateMatrixWorld();
    const particleResponse=particles.update(time,dt,particlePointer,particlePointerInside,state.motion);
    reflection.rotation.copy(world.rotation);reflection.scale.set(scale,-scale*.24,scale*.8);reflection.visible=width>=760;
    reflection.children.forEach((child,index)=>{child.rotation.copy(ringGroups[index].ring.rotation);child.position.copy(ringGroups[index].ring.position);});
    scene.updateMatrixWorld();
    let reflectionRing:number|null=null;
    if(reflectionPointerInside){
      raycaster.setFromCamera(particlePointer,camera);
      const contact=raycaster.intersectObjects(pickingTargets,false)[0];
      if(contact){reflectionRing=Number(contact.object.userData.ring);reflectionSurface.copy(contact.point);ringGroups[reflectionRing].ring.worldToLocal(reflectionSurface);}
    }else if(state.hovered!==null){
      reflectionRing=state.hovered;const angle=.7+reflectionRing*1.9;reflectionSurface.set(Math.cos(angle),Math.sin(angle),0);
    }
    if(reflectionRing!==null){
      const {ring,radius}=ringGroups[reflectionRing],angle=Math.atan2(reflectionSurface.y,reflectionSurface.x);
      reflectionSurface.set(Math.cos(angle)*(radius-.08),Math.sin(angle)*(radius-.08),0);ring.localToWorld(reflectionSurface);
      lightDirection.subVectors(camera.position,reflectionSurface).normalize();
      reflectionNormalMatrix.getNormalMatrix(ring.matrixWorld);reflectionNormal.set(0,0,1).applyNormalMatrix(reflectionNormalMatrix);
      const facing=reflectionNormal.dot(lightDirection)<0?-1:1;reflectionNormal.multiplyScalar(facing);
      reflectionSurface.set(Math.cos(angle)*(radius-.08),Math.sin(angle)*(radius-.08),facing*.09);ring.localToWorld(reflectionSurface);
      // Mirror the viewing direction so the highlight stays on the pointed surface.
      lightDirection.subVectors(camera.position,reflectionSurface).normalize().negate().reflect(reflectionNormal);
      reflectionPosition.copy(reflectionSurface).addScaledVector(lightDirection,.7);
      if(reflectionStrength===0)pointerLight.position.copy(reflectionPosition);
      else pointerLight.position.lerp(reflectionPosition,1-Math.exp(-dt*24));
    }
    const desiredReflection=reflectionRing===null?0:1;
    if(desiredReflection!==reflectionTarget){reflectionFrom=reflectionStrength;reflectionTarget=desiredReflection;reflectionStarted=now;}
    const reflectionProgress=Math.min(1,(now-reflectionStarted)/(reflectionTarget?120:300));
    reflectionStrength=THREE.MathUtils.lerp(reflectionFrom,reflectionTarget,1-Math.pow(1-reflectionProgress,3));
    pointerLight.intensity=reflectionStrength*.8;
    reflectionSettling=reflectionProgress<1||(reflectionTarget>0&&pointerLight.position.distanceTo(reflectionPosition)>.001);
    renderer.render(scene,camera);project();
    host.dataset.pose=`${world.rotation.y.toFixed(4)},${world.rotation.x.toFixed(4)},${time.toFixed(3)},${expansion.toFixed(3)}`;
    host.dataset.focus=cameraAim.toArray().map(value=>value.toFixed(3)).join(',');
    host.dataset.particles=String(particles.count);host.dataset.particleResponse=particleResponse.toFixed(3);
    host.dataset.reflectionStrength=reflectionStrength.toFixed(3);
    dirty=false;
  });
  return {backend,update(next){if(!next.motion)velocityX=velocityY=0;state=next;dirty=true;settling=true;},dispose(){disposed=true;renderer.setAnimationLoop(null);resize.disconnect();visibility.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('pointerleave',leave);stage.removeEventListener('pointermove',fieldMove);stage.removeEventListener('pointerleave',fieldLeave);stage.removeEventListener('pointercancel',fieldLeave);particles.dispose();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());chrome.dispose();pmrem.dispose();environmentMap.dispose();renderer.dispose();canvas.remove();}};
}
