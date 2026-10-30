import {useEffect,useRef,useState,type CSSProperties} from 'react';
import ReactIcon from './ReactIcon';
import {cognition} from '../data/cognition';
import {projectedParticles} from '../data/particles';
import type {TheatreHandle,TheatreState} from '../lib/theatre';

type SceneImages={environment:{desktop:string;mobile:string};poster:{desktop:string;mobile:string};arrival:{desktop:string;mobile:string}[];assembled:{desktop:string;mobile:string}};
export default function Theatre({images}:{images:SceneImages}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<TheatreHandle|null>(null),buttons=useRef<(HTMLButtonElement|null)[]>([]),selection=useRef<number|null>(null);
 const [motion,setMotion]=useState(true),[selected,setSelected]=useState<number|null>(null),[hovered,setHovered]=useState<number|null>(null),[renderer,setRenderer]=useState<'loading'|'ready'|'fallback'>('loading'),[arrived,setArrived]=useState(false);
 const currentState=useRef<TheatreState>({motion:true,selected:null,hovered:null,scroll:0});
 function select(index:number){const next=selection.current===index?null:index;selection.current=next;setSelected(next);}
 useEffect(()=>{
  let cancelled=false,frame=0;
  const arrivalAnimations=host.current?.parentElement?.querySelectorAll('.theatre-arrival-piece,.theatre-assembled');
  Promise.allSettled(Array.from(arrivalAnimations||[]).flatMap(element=>element.getAnimations().map(animation=>animation.finished))).then(()=>{if(!cancelled)setArrived(true);});
  const preference=matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>setMotion(!preference.matches);changed();preference.addEventListener('change',changed);
  const onScroll=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const element=host.current;if(element){const bounds=element.getBoundingClientRect();const scroll=Math.min(1,Math.max(0,-bounds.top/bounds.height));if(scroll!==currentState.current.scroll){currentState.current={...currentState.current,scroll};scene.current?.update(currentState.current);}}});};
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&selection.current!==null){setSelected(null);buttons.current[selection.current]?.focus({preventScroll:true});selection.current=null;}};
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('keydown',key);onScroll();
  import('../lib/theatre').then(async({createTheatre})=>{
   if(cancelled||!host.current)return;
   try{const handle=await createTheatre(host.current,{select,hover:setHovered,project:positions=>positions.forEach((position,index)=>{const button=buttons.current[index];const transform=`translate(${position.x}px,${position.y}px)`;if(button&&button.style.transform!==transform)button.style.transform=transform;})});if(cancelled){handle.dispose();return;}scene.current=handle;handle.update(currentState.current);host.current.dataset.backend=handle.backend;setRenderer('ready');}
   catch{if(!cancelled)setRenderer('fallback');}
  }).catch(()=>{if(!cancelled)setRenderer('fallback');});
  return()=>{cancelled=true;cancelAnimationFrame(frame);preference.removeEventListener('change',changed);window.removeEventListener('scroll',onScroll);window.removeEventListener('keydown',key);scene.current?.dispose();scene.current=null;};
 },[]);
 useEffect(()=>{currentState.current={...currentState.current,motion,selected,hovered};scene.current?.update(currentState.current);},[motion,selected,hovered,renderer]);
 const imageStyles={'--theatre-environment':`url("${images.environment.desktop}")`,'--theatre-environment-mobile':`url("${images.environment.mobile}")`,'--theatre-poster':`url("${images.poster.desktop}")`,'--theatre-poster-mobile':`url("${images.poster.mobile}")`} as CSSProperties;
 return <section className="theatre" style={imageStyles} aria-label="认知剧场，探索推理、行动与反馈" data-renderer={renderer} data-arrived={arrived} data-playing="true" data-motion={motion} data-selected={selected??'none'}>
  <div className="theatre-environment" aria-hidden="true"/><div className="theatre-poster" aria-hidden="true"/>
  <div className="theatre-ambient" aria-hidden="true">{[false,true].map(mobile=><svg key={String(mobile)} className={mobile?'theatre-motes-mobile':'theatre-motes-desktop'} viewBox={mobile?'0 0 390 617':'0 0 1440 680'}><defs><radialGradient id={`mote-${mobile?'mobile':'desktop'}`}><stop stopColor="#a4c8fa" stopOpacity=".65"/><stop offset=".3" stopColor="#90b5e8" stopOpacity=".22"/><stop offset="1" stopColor="#90b5e8" stopOpacity="0"/></radialGradient></defs>{projectedParticles(mobile).map((particle,index)=><circle key={index} cx={particle.x} cy={particle.y} r={particle.r} fill={`url(#mote-${mobile?'mobile':'desktop'})`} style={{'--mote-delay':`${-particle.phase*3}s`,'--mote-duration':`${14+particle.phase}s`} as CSSProperties}/>)}</svg>)}</div>
  <div ref={host} className="theatre-canvas" aria-label={renderer==='fallback'?'环形雕塑静态视图':'可拖动旋转的三维环形雕塑'} role="group"/>
  <div className="theatre-arrival" aria-hidden="true">{images.arrival.map((image,index)=><picture key={image.desktop} className={`theatre-arrival-piece theatre-arrival-${index}`}><source media="(max-width: 760px)" srcSet={image.mobile}/><img src={image.desktop} alt="" loading="eager" decoding="sync" fetchPriority="high" draggable={false}/></picture>)}<picture className="theatre-assembled"><source media="(max-width: 760px)" srcSet={images.assembled.mobile}/><img src={images.assembled.desktop} alt="" loading="eager" decoding="sync" fetchPriority="high" draggable={false}/></picture></div>
  {renderer==='ready'&&arrived&&<div className="theatre-parts" role="group" aria-label="探索雕塑的组成">{cognition.map((part,index)=><button key={part.name} ref={element=>{buttons.current[index]=element;}} type="button" className="theatre-part" aria-label={`探索${part.name}环`} aria-pressed={selected===index} onFocus={()=>setHovered(index)} onBlur={()=>setHovered(null)} onClick={()=>select(index)}>{part.name}</button>)}</div>}
  <div className="theatre-copy"><h1>把想法，<br/><span>变成会工作的系统。</span></h1><a className="theatre-enter" href="#selected-work">进入作品 <ReactIcon name="arrow" size={18}/></a></div>
  {renderer==='fallback'&&<p className="theatre-fallback-note">当前设备使用静态视图。</p>}
 </section>;
}
