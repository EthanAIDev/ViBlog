import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pixelsMatch} from './lib/pixels.mjs';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:3000/';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{}),args:['--enable-unsafe-swiftshader']});
const checks=[],errors=[],evidence='.impeccable/review';
await fs.mkdir(evidence,{recursive:true});
const check=async(name,run)=>{try{await run();checks.push({name,pass:true});}catch(error){checks.push({name,pass:false,error:error.message});}};
async function open(options={}){
 const page=await browser.newPage(options);page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.__entranceFrames=[];
  const sample=()=>{
   const scene=document.querySelector('.theatre-canvas'),progress=scene?.dataset.entrance;
   if(progress&&window.__entranceFrames.length<160&&progress!==window.__entranceFrames.at(-1)?.progress)window.__entranceFrames.push({progress,positions:scene.dataset.ringPositions,pose:scene.dataset.pose});
   requestAnimationFrame(sample);
  };requestAnimationFrame(sample);
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});return page;
}
const complete=page=>page.waitForFunction(()=>document.querySelector('.theatre-canvas')?.dataset.entrance==='1.000',null,{timeout:15000});
try{
 for(const [label,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]])await check(`${label}: separate arrivals converge and continue rotating`,async()=>{
  const page=await open({viewport});
  try{
   for(const [index,progress] of [.08,.32,.65,1].entries()){
    await page.waitForFunction(target=>Number(document.querySelector('.theatre-canvas')?.dataset.entrance)>=target,progress,{timeout:15000});
    await page.screenshot({path:`${evidence}/entrance-${label}-${index}.png`});
   }
   const frames=await page.evaluate(()=>window.__entranceFrames),first=frames.find(frame=>Number(frame.progress)<1);
   assert.ok(first,'real graphics should join the first-paint entrance before it completes');
   const positions=first.positions.split(';').map(ring=>ring.split(',').map(Number));
   assert.ok(positions[0][0]<0&&positions[0][1]>0,'outer ring continues from upper left');
   assert.ok(positions[1][0]>0&&positions[1][1]>0,'middle ring continues from upper right');
   assert.ok(positions[2][1]<0,'inner ring continues from below');
   const final=await page.locator('.theatre-canvas').evaluate(el=>({progress:el.dataset.entrance,positions:el.dataset.ringPositions,pose:el.dataset.pose}));
   assert.equal(final.progress,'1.000');assert.ok(final.positions.split(/[;,]/).every(value=>Math.abs(Number(value))<.001));
   const time=final.pose.split(',')[2];await page.waitForFunction(previous=>document.querySelector('.theatre-canvas').dataset.pose.split(',')[2]!==previous,time);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.equal(await page.locator('.site-header').count(),1);assert.equal(await page.locator('.theatre-copy h1').count(),1);
  }finally{await page.close();}
 });
 await check('drag responds after the seamless assembly and autoplay continues',async()=>{
  const page=await open({viewport:{width:1440,height:900}});
  try{
   await page.waitForSelector('.theatre[data-renderer=ready][data-arrived=true]');await page.waitForTimeout(950);
   await page.mouse.move(800,220);await page.mouse.down();
   const before=await page.locator('.theatre-canvas').getAttribute('data-pose');
   await page.mouse.move(950,250,{steps:4});await page.waitForTimeout(150);
   const after=await page.locator('.theatre-canvas').getAttribute('data-pose');
   assert.ok(Math.abs(Number(after.split(',')[0])-Number(before.split(',')[0]))>.3);
   assert.ok(Number(after.split(',')[2])>Number(before.split(',')[2]));await page.mouse.up();await complete(page);
  }finally{await page.close();}
 });
 await check('reduced motion starts assembled without spatial movement',async()=>{
  const page=await open({viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{await complete(page);assert.ok((await page.locator('.theatre-canvas').getAttribute('data-ring-positions')).split(/[;,]/).every(value=>Number(value)===0));const before=await page.locator('.theatre canvas').screenshot();await page.waitForTimeout(250);assert.ok(await pixelsMatch(await page.locator('.theatre canvas').screenshot(),before),'initial reduced motion must retain static pixels');}finally{await page.close();}
 });
 await check('switching to reduced motion settles cursor parallax immediately',async()=>{
  const page=await open({viewport:{width:1440,height:900}});
  try{await complete(page);await page.mouse.move(1000,300);await page.waitForTimeout(650);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(1200);const before=await page.locator('.theatre canvas').screenshot();await page.waitForTimeout(300);assert.ok(await pixelsMatch(await page.locator('.theatre canvas').screenshot(),before),'no residual pointer motion after changing the preference');}finally{await page.close();}
 });
 await check('navigation can interrupt arrival and returning home starts cleanly',async()=>{
  const page=await open({viewport:{width:1440,height:900}});
  try{
   await page.waitForSelector('.theatre[data-renderer=ready]');await page.evaluate(()=>window.__sameDocument=true);
   await page.locator('.primary-nav a[href="/about/"]').click();await page.waitForURL('**/about/');assert.equal(await page.locator('.theatre canvas').count(),0);
   await page.locator('.wordmark').click();await page.waitForURL(base.replace(/\/$/,'')+'/');await complete(page);
   assert.equal(await page.locator('.theatre canvas').count(),1);assert.equal(await page.evaluate(()=>window.__sameDocument),true);
  }finally{await page.close();}
 });
 await check('no JavaScript retains an immediate complete poster',async()=>{
  const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
  try{await page.goto(base);assert.equal(await page.locator('.theatre-poster').evaluate(el=>getComputedStyle(el).opacity),'1');assert.equal(await page.locator('.theatre-poster').evaluate(el=>getComputedStyle(el).visibility),'visible');await page.screenshot({path:`${evidence}/entrance-no-js.png`});}finally{await page.close();}
 });
 await check('failed JavaScript recovers the static poster without a loading flash',async()=>{
  const page=await browser.newPage();await page.route('**/*',route=>route.request().resourceType()==='script'?route.abort():route.continue());
  try{await page.goto(base);assert.equal(await page.locator('.theatre-poster').evaluate(el=>getComputedStyle(el).opacity),'0');assert.ok(await page.locator('.theatre-copy h1').isVisible());await page.waitForFunction(()=>getComputedStyle(document.querySelector('.theatre-poster')).opacity==='1',null,{timeout:14000});}finally{await page.close();}
 });
 await check('late graphics continue an already recovered poster without flying in again',async()=>{
  const page=await browser.newPage();let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/*',async route=>{if(route.request().resourceType()==='script')await gate;await route.continue();});
  try{
   await page.goto(base,{waitUntil:'commit'});await page.waitForSelector('.theatre-poster');
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.theatre-poster')).opacity==='1',null,{timeout:14000});
   await page.evaluate(()=>{window.__lateArrival=[];new MutationObserver(()=>{const progress=document.querySelector('.theatre-canvas')?.dataset.entrance;if(progress)window.__lateArrival.push(progress);}).observe(document.querySelector('.theatre-canvas'),{attributes:true,attributeFilter:['data-entrance']});});
   release();await complete(page);assert.equal(await page.evaluate(()=>window.__lateArrival[0]),'1.000');assert.match(await page.locator('.theatre-canvas').getAttribute('data-backend'),/^(WebGPU|WebGL 2)$/);
  }finally{release();await page.close();}
 });
 await check('no uncaught page errors',()=>assert.deepEqual(errors,[]));
}finally{await browser.close();await fs.writeFile(`${evidence}/entrance-acceptance.json`,JSON.stringify({checks,errors},null,2));}
console.log(JSON.stringify({checks,errors},null,2));if(checks.some(check=>!check.pass))process.exitCode=1;
