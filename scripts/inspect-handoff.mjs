import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {pixelsMatch} from './lib/pixels.mjs';

const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{}),args:['--enable-unsafe-swiftshader']});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3000/',checks=[],errors=[],evidence='.impeccable/review';
await fs.mkdir(evidence,{recursive:true});
try{
 for(const width of [760,920,1440,390]){
  const page=await browser.newPage({viewport:{width,height:884}});page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route(/\/(?:src\/lib\/theatre\.ts|_astro\/theatre\.[\w-]+\.js)(?:\?.*)?$/,async route=>{await gate;await route.continue();});
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   if(process.env.HANDOFF_MUTATION==='stretch')await page.addStyleTag({content:'.theatre-arrival img{width:100%!important;height:100%!important;left:0!important;transform:none!important}'});
   const ambient=await page.locator('.theatre-ambient').count();
   assert.ok(ambient,'ambient particles must be present before the graphics module loads');
   const isolate=await page.addStyleTag({content:'html,body,.theatre{background:transparent!important}.site-header,.theatre-copy,.theatre-environment,.theatre-poster,.theatre-arrival,.selected-work,.theatre-writing,.theatre-about,.site-footer{visibility:hidden!important}'});
   const firstParticles=await page.locator('.theatre-ambient').screenshot({omitBackground:true});
   await page.waitForTimeout(500);
   assert.ok(!await pixelsMatch(firstParticles,await page.locator('.theatre-ambient').screenshot({omitBackground:true})),'first-paint particles must already be floating before graphics load');
   await isolate.evaluate(el=>el.remove());
   await page.waitForFunction(()=>document.querySelector('.theatre-arrival-2')?.getAnimations()[0]?.playState==='finished');
   await page.addStyleTag({content:'html,body,.theatre{background:transparent!important}.site-header,.theatre-copy,.theatre-environment,.theatre-poster,.theatre-ambient,.selected-work,.theatre-writing,.theatre-about,.site-footer{visibility:hidden!important}'});
   const preview=await page.locator('.theatre-arrival').screenshot({omitBackground:true,path:`${evidence}/handoff-${width}-preview.png`});
   await page.emulateMedia({reducedMotion:'reduce'});
   release();await page.waitForSelector('.theatre[data-renderer=ready]');
   await page.waitForTimeout(250);
   const live=await page.locator('.theatre canvas').screenshot({omitBackground:true,path:`${evidence}/handoff-${width}-live.png`});
   const [a,b]=await Promise.all([preview,live].map(bytes=>sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true})));
   assert.equal(a.info.width,b.info.width);assert.equal(a.info.height,b.info.height);
   let intersection=0,union=0;
   for(let index=3;index<a.data.length;index+=4){const x=a.data[index]>180,y=b.data[index]>180;if(x||y)union++;if(x&&y)intersection++;}
   const overlap=intersection/union;
   // The raster preview and live GPU use different anti-aliasing resolutions.
   // Both silhouettes must match within one CSS pixel, in both directions.
   function coverage(source,target){let count=0,matched=0;for(let index=3;index<source.data.length;index+=4){if(source.data[index]<=100)continue;count++;const pixel=(index-3)/4,x=pixel%source.info.width,y=Math.floor(pixel/source.info.width);let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++){if(x+dx>=0&&x+dx<source.info.width&&y+dy>=0&&y+dy<source.info.height&&target.data[((y+dy)*source.info.width+x+dx)*4+3]>100){near=true;break;}}if(near)matched++;}return matched/count;}
   const aligned=Math.min(coverage(a,b),coverage(b,a));
   assert.ok(aligned>.99,`assembled preview and live silhouettes must align within one pixel; coverage ${(aligned*100).toFixed(1)}%`);
   checks.push({name:`${width}px: handoff keeps the same silhouette`,pass:true,overlap,aligned});
   checks.push({name:`${width}px: particles float before graphics initialization`,pass:true});
  }catch(error){checks.push({name:`${width}px: aligned handoff and immediate particles`,pass:false,error:error.message});}
  finally{release();await page.close();}
 }
 const page=await browser.newPage({viewport:{width:920,height:884}});page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>{
   new MutationObserver(()=>{
    const stage=document.querySelector('.theatre'),pose=document.querySelector('.theatre-canvas')?.dataset.pose;
    if(stage?.dataset.arrived==='true'&&stage.dataset.renderer==='ready'&&pose&&window.__firstLandingTime===undefined)window.__firstLandingTime=Number(pose.split(',')[2]);
   }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-arrived','data-renderer','data-pose']});
  });
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForSelector('.theatre[data-renderer=ready]');
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.theatre-canvas')).opacity)>.99);
  if(await page.locator('.theatre').getAttribute('data-arrived')==='false'){
   assert.equal(Number((await page.locator('.theatre-canvas').getAttribute('data-pose')).split(',')[2]),0,'rings must not rotate invisibly ahead of their entrance pose');
   assert.ok(Number(await page.locator('.theatre-canvas').evaluate(el=>getComputedStyle(el).opacity))>.8,'particles must be visible during the flight');
  }
  await page.waitForSelector('.theatre[data-arrived=true]');
  const landingTime=await page.evaluate(()=>window.__firstLandingTime);
  assert.ok(landingTime<.001,`the first live frame must keep the exact landing pose; rotation time ${landingTime}`);
  await page.locator('.theatre').screenshot({path:`${evidence}/handoff-normal-landing.png`});
  await page.waitForTimeout(1000);await page.locator('.theatre').screenshot({path:`${evidence}/handoff-normal-rotating.png`});
  assert.ok(Number((await page.locator('.theatre-canvas').getAttribute('data-pose')).split(',')[2])>.1,'autoplay must ease in after the landing');
  checks.push({name:'live rings start from the landing pose and ease into autoplay',pass:true});
 }catch(error){checks.push({name:'live rings start from the landing pose and ease into autoplay',pass:false,error:error.message});}
 finally{await page.close();}
}finally{await browser.close();await fs.writeFile(`${evidence}/handoff-acceptance.json`,JSON.stringify({checks,errors},null,2));}
console.log(JSON.stringify({checks,errors},null,2));if(errors.length||checks.some(check=>!check.pass))process.exitCode=1;
