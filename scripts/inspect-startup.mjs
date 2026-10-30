import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {pixelsMatch} from './lib/pixels.mjs';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:3000/';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{}),args:['--enable-unsafe-swiftshader']});
const evidence='.impeccable/review',checks=[],errors=[];
await fs.mkdir(evidence,{recursive:true});
try{
 const captures=[];
 for(const mobile of [false,true]){
  const rings=[];
  for(let ring=0;ring<3;ring++){
   const source=`assets/plates/theatre-arrival-${ring}${mobile?'-mobile':''}.png`,bytes=await fs.readFile(source);
   const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   for(let x=0;x<info.width;x++)assert.equal(data[((info.height-1)*info.width+x)*4+3],0,'ring captures must not include the page border');
   rings.push(bytes);
  }
  assert.ok(!rings[0].equals(rings[1])&&!rings[1].equals(rings[2])&&!rings[0].equals(rings[2]),'three entrance layers must contain distinct rings, not duplicate sculptures');
  captures.push(mobile?'mobile':'desktop');
 }
 checks.push({name:`${captures.join(' and ')}: distinct transparent rings have clean edges`,pass:true});
 for(const [label,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
  const page=await browser.newPage({viewport});
  page.on('pageerror',error=>errors.push(error.message));
  let release;const graphicsGate=new Promise(resolve=>{release=resolve;});
  await page.route('**/*',async route=>{
   const request=route.request();
   if(request.resourceType()==='script'&&(/\/lib\/theatre\.ts|\/theatre\.[\w-]+\.js/.test(request.url())))await graphicsGate;
   await route.continue();
  });
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>performance.getEntriesByName('first-contentful-paint').length>0);
   await page.waitForTimeout(200);
   const hideAmbient=await page.addStyleTag({content:'.theatre-ambient{visibility:hidden!important}'});
   const before=await page.locator('.theatre').screenshot({path:`${evidence}/startup-${label}-early.png`});
   const hidden=await page.addStyleTag({content:'.theatre canvas,.theatre-poster,.theatre-arrival{visibility:hidden!important}'});
   const background=await page.locator('.theatre').screenshot();await hidden.evaluate(el=>el.remove());
   await hideAmbient.evaluate(el=>el.remove());
   assert.equal(await pixelsMatch(before,background),false,'incoming rings must be visible immediately, while the 3D module is still loading');
   checks.push({name:`${label}: sculpture starts before graphics initialization`,pass:true});
   await page.waitForTimeout(900);
   const moving=await page.locator('.theatre-arrival-piece').first().evaluate(el=>getComputedStyle(el).transform);
   assert.notEqual(moving,'matrix(1, 0, 0, 1, 0, 0)','the slower arrival must still be moving after the first second');
   await page.locator('.theatre').screenshot({path:`${evidence}/startup-${label}-middle.png`});
   await page.waitForFunction(()=>[...document.querySelectorAll('.theatre-arrival-piece')].every(el=>getComputedStyle(el).transform==='matrix(1, 0, 0, 1, 0, 0)'));
   const duration=await page.evaluate(()=>performance.now()-performance.getEntriesByName('first-contentful-paint')[0].startTime);
   assert.ok(duration>=2200,'entrance should take more than two seconds, not rush into place');
   checks.push({name:`${label}: slower entrance completes while graphics are delayed`,pass:true,durationMs:Math.round(duration)});
   release();await page.waitForSelector('.theatre[data-renderer=ready][data-arrived=true]');
   assert.equal(await page.locator('.theatre-canvas').getAttribute('data-entrance'),'1.000','late graphics must join the completed entrance without restarting');
   await page.waitForTimeout(250);await page.locator('.theatre').screenshot({path:`${evidence}/startup-${label}-live.png`});
   checks.push({name:`${label}: graphics continue without replaying arrival`,pass:true});
  }catch(error){checks.push({name:`${label}: sculpture starts before graphics initialization`,pass:false,error:error.message});}
  finally{release();await page.close();}
 }
 const interrupted=await browser.newPage({viewport:{width:1440,height:900}});
 interrupted.on('pageerror',error=>errors.push(error.message));
 try{
  await interrupted.goto(base,{waitUntil:'domcontentloaded'});await interrupted.waitForSelector('.theatre[data-renderer=ready]');
  assert.ok(Number(await interrupted.locator('.theatre-canvas').getAttribute('data-entrance'))<1,'exercise the offscreen interruption before assembly finishes');
  await interrupted.evaluate(()=>scrollTo({top:1000,behavior:'instant'}));await interrupted.waitForTimeout(2800);
  await interrupted.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await interrupted.waitForTimeout(180);
  assert.equal(await interrupted.locator('.theatre-canvas').getAttribute('data-entrance'),'1.000','returning after the first-paint entrance finishes must not reveal another unfinished flight');
  checks.push({name:'offscreen interruption rejoins the completed entrance',pass:true});
 }catch(error){checks.push({name:'offscreen interruption rejoins the completed entrance',pass:false,error:error.message});}
 finally{await interrupted.close();}
 const slow=await browser.newPage({viewport:{width:1440,height:900}});
 slow.on('pageerror',error=>errors.push(error.message));
 await slow.addInitScript(()=>{
  const frame=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=callback=>frame(()=>setTimeout(()=>callback(performance.now()),110));
 });
 try{
  await slow.goto(base,{waitUntil:'domcontentloaded'});await slow.waitForSelector('.theatre[data-renderer=ready][data-arrived=true]');await slow.waitForTimeout(220);
  assert.equal(await slow.locator('.theatre-canvas').getAttribute('data-entrance'),'1.000','slow rendering must catch up with the completed CSS entrance');
  checks.push({name:'slow frames keep the live entrance on the first-paint clock',pass:true});
 }catch(error){checks.push({name:'slow frames keep the live entrance on the first-paint clock',pass:false,error:error.message});}
 finally{await slow.close();}
 assert.deepEqual(errors,[]);
}finally{await browser.close();await fs.writeFile(`${evidence}/startup-acceptance.json`,JSON.stringify({checks,errors},null,2));}
console.log(JSON.stringify({checks,errors},null,2));if(checks.some(check=>!check.pass))process.exitCode=1;
