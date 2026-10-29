import {chromium} from 'playwright';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{}),args:['--enable-unsafe-swiftshader']});
const checks=[],errors=[];
const check=async(name,run)=>{try{await run();checks.push({name,pass:true});}catch(error){checks.push({name,pass:false,error:error.message});}};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',error=>errors.push(error.message));
 await check('loading posters contain the sculpture without baked-in HTML',async()=>{
  for(const source of ['assets/plates/theatre-poster.png','assets/plates/theatre-poster-mobile.png']){
   const image=await sharp(source).metadata();assert.ok(image.hasAlpha,'poster must contain the sculpture only, without baked-in headings or navigation');
   const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});const alpha=(x,y)=>data[(Math.floor(y)*info.width+Math.floor(x))*4+3];
   assert.equal(alpha(5,5),0);assert.ok(data.some((value,index)=>index%4===3&&value>0),'poster must retain the actual sculpture');
  }
 });
 await page.goto(base,{waitUntil:'networkidle'});
 await check('visible end of the middle ring remains clickable',async()=>{
  const still=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  try{await still.goto(base,{waitUntil:'networkidle'});await still.waitForSelector('.theatre[data-renderer=ready]');await still.waitForTimeout(700);
   for(const [x,y,expected] of [[907,225,'1'],[896,275,'1'],[727,460,'0']]){await still.mouse.click(x,y);assert.equal(await still.locator('.theatre').getAttribute('data-selected'),expected);await still.keyboard.press('Escape');await still.waitForTimeout(250);}
  }finally{await still.close();}
 });
 await check('header stays at the top while scrolling',async()=>{await page.evaluate(()=>scrollTo({top:900,behavior:'instant'}));await page.waitForTimeout(150);const bounds=await page.locator('.site-header').boundingBox();assert.ok(Math.abs(bounds.y)<1);});
 await check('navigation swaps content without replacing the document',async()=>{
  await page.evaluate(()=>{window.__navigationToken='same-document';});
  await page.locator('.primary-nav a[href="/posts/"]').click();await page.waitForURL('**/posts/');
  assert.equal(await page.evaluate(()=>window.__navigationToken),'same-document');await page.waitForFunction(()=>!document.querySelector('.article-tools')?.closest('astro-island')?.hasAttribute('ssr'));await page.getByLabel('搜索文章',{exact:true}).fill('Softmax');await page.waitForFunction(()=>document.querySelectorAll('.writing-row').length===1);
 });
 await check('gallery and copy controls initialize after a page swap',async()=>{
  await page.locator('.primary-nav a[href="/projects/"]').click();await page.waitForURL('**/projects/');
  await page.locator('a[href="/projects/p001/"]').first().click();await page.waitForURL('**/projects/p001/');
  await page.locator('[data-gallery-image]').first().click();await page.waitForFunction(()=>document.querySelector('#gallery-dialog')?.open===true);await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>window.__navigationToken),'same-document');assert.ok(await page.locator('.copy-code').count()>0);
 });
 await check('home scene mounts once after leaving and returning',async()=>{
  await page.locator('.wordmark').click();await page.waitForURL(base.replace(/\/$/,'')+'/');await page.waitForSelector('.theatre[data-renderer=ready]');assert.equal(await page.locator('.theatre canvas').count(),1);assert.equal(await page.evaluate(()=>window.__navigationToken),'same-document');
 });
 await check('repeated navigation updates active links and preserves history',async()=>{
  for(const route of ['about','posts','projects','about']){
   await page.locator(`.primary-nav a[href="/${route}/"]`).click();await page.waitForURL(`**/${route}/`);
   await page.waitForFunction(route=>document.querySelector(`.primary-nav a[href="/${route}/"]`)?.getAttribute('aria-current')==='page',route);
   assert.equal(await page.locator('.site-header').count(),1);assert.equal(await page.locator('.theatre canvas').count(),0);
  }
  await page.goBack();await page.waitForURL('**/projects/');assert.equal(await page.evaluate(()=>window.__navigationToken),'same-document');
  await page.goForward();await page.waitForURL('**/about/');assert.equal(await page.evaluate(()=>window.__navigationToken),'same-document');
 });
 await check('article diagrams, images and copy controls work after navigation',async()=>{
  await page.locator('.primary-nav a[href="/posts/"]').click();await page.waitForURL('**/posts/');
  await page.locator('a[href="/articles/10000002/"]').first().click();await page.waitForURL('**/articles/10000002/');await page.waitForSelector('.mermaid-diagram svg',{timeout:20000});
  assert.equal(await page.locator('.copy-code').count(),await page.locator('.prose pre').count());
 });
 await check('mobile fixed header leaves navigation and page scroll usable',async()=>{
  await page.setViewportSize({width:390,height:844});await page.locator('.primary-nav a[href="/projects/"]').click();await page.waitForURL('**/projects/');
  await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await page.waitForTimeout(150);assert.ok(Math.abs((await page.locator('.site-header').boundingBox()).y)<1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 await check('interrupted transitions remain usable',async()=>{
  for(const route of ['about','projects','about','projects']){await page.locator(`.primary-nav a[href="/${route}/"]`).click();await page.waitForURL(`**/${route}/`);await page.setViewportSize({width:route==='about'?400:390,height:844});}
  await page.waitForTimeout(300);assert.equal(await page.locator('.site-header').count(),1);
 });
 await check('no uncaught errors',()=>assert.deepEqual(errors,[]));
}finally{await browser.close();await fs.mkdir('.impeccable/review',{recursive:true});await fs.writeFile('.impeccable/review/navigation-acceptance.json',JSON.stringify({checks,errors},null,2));}
console.log(JSON.stringify({checks,errors},null,2));if(checks.some(check=>!check.pass))process.exitCode=1;
