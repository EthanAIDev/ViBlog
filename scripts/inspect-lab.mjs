import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = (process.env.PREVIEW_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const executablePath = process.env.BROWSER_PATH;
const browser = await chromium.launch({ headless: true, ...(executablePath ? {executablePath} : {}), args: ['--enable-unsafe-swiftshader'] });
const output = path.resolve('.impeccable/review');
await fs.mkdir(output, {recursive:true});
const checks=[];
const errors=[];
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
page.on('pageerror',error=>errors.push(error.message));
const failures=[];
page.on('response',response=>{if(response.status()>=400 && response.url().startsWith(base))failures.push(`${response.status()} ${response.url()}`);});
async function check(name,run) {try{await run();checks.push({name,pass:true});}catch(error){checks.push({name,pass:false,error:error.message});}}
async function capture(name) {
  await page.locator('img[src]').evaluateAll(images=>{for(const image of images)image.loading='eager';});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.allSettled(Array.from(document.images).filter(image=>image.hasAttribute('src')).map(image=>image.decode()));window.scrollTo(0,0);});
  await page.waitForFunction(()=>Array.from(document.images).filter(image=>image.hasAttribute('src')).every(image=>image.complete&&image.naturalWidth>0));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
  if(name==='desktop'||name==='mobile')await page.screenshot({path:path.join(output,name+'-hero.png')});
}
async function noOverflow(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal document overflow');}

try {
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForSelector('.theatre[data-renderer="ready"]',{timeout:30000});
  await check('3D cognitive theatre renders',async()=>assert.equal(await page.locator('.theatre').getAttribute('data-renderer'),'ready'));
  await check('theatre autoplays without bottom controls',async()=>{
    assert.equal(await page.locator('.theatre-controls,input[aria-label="旋转雕塑"]').count(),0);
    const time=await page.locator('.theatre-canvas').getAttribute('data-pose');await page.waitForFunction(previous=>document.querySelector('.theatre-canvas')?.getAttribute('data-pose')!==previous,time,{timeout:6000});
  });
  await check('theatre keyboard inspection and Escape',async()=>{
    const part=page.getByRole('button',{name:'探索推理环',exact:true});await part.focus();await part.press('Enter');assert.equal(await part.getAttribute('aria-pressed'),'true');
    await page.keyboard.press('Escape');assert.equal(await part.getAttribute('aria-pressed'),'false');
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await capture('desktop');await noOverflow();
  for(const width of [1411,1024,768,390,360]) {
    await page.setViewportSize({width,height:width<760?844:1000});
    await check(`home ${width}px no horizontal overflow`,noOverflow);
    if([1411,768,390].includes(width)) await capture(width===390?'mobile':`user-${width}`);
  }
  await check('reduced motion disables spatial animation',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.theatre')?.getAttribute('data-motion')==='false');await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await check('WebGL 2 fallback renders without WebGPU',async()=>{
    const context=await browser.newContext();await context.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true}));const fallback=await context.newPage();
    try{await fallback.goto(base,{waitUntil:'networkidle'});await fallback.waitForSelector('.theatre[data-renderer="ready"]');assert.equal(await fallback.locator('.theatre-canvas').getAttribute('data-backend'),'WebGL 2');}finally{await context.close();}
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/posts/',{waitUntil:'networkidle'});
  await check('article search, category, topic and empty recovery',async()=>{
    assert.equal(await page.locator('.writing-row').count(),3);
    await page.getByLabel('搜索文章',{exact:true}).fill('Softmax');
    await page.waitForFunction(()=>document.querySelectorAll('.writing-row').length===1);
    await page.getByLabel('搜索文章',{exact:true}).fill('不存在的关键词');
    await page.getByRole('button',{name:'清除筛选',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.writing-row').length===3);
    await page.getByLabel('分类',{exact:true}).selectOption('教程');
    assert.equal(await page.locator('.writing-row').count(),2);
    await page.getByLabel('分类',{exact:true}).selectOption('全部');
    await page.getByRole('button',{name:'Token',exact:true}).click();
    assert.equal(await page.locator('.writing-row').count(),1);
    await page.getByRole('button',{name:'所有主题',exact:true}).click();
  });
  await capture('posts');
  for(const route of ['/projects/','/about/','/articles/10000002/','/articles/10000003/','/articles/10000001/','/projects/p001/','/projects/p002/','/projects/p003/']) {
    await page.goto(base+route,{waitUntil:'networkidle'});
    await check(`${route} content and images`,async()=>{
      assert.ok((await page.locator('h1').first().innerText()).length>2);
      const sources=await page.locator('img[src]').evaluateAll(images=>images.map(image=>image.getAttribute('src')));
      for(const source of sources)assert.equal((await page.request.get(new URL(source,base).href)).status(),200,`Missing image: ${source}`);
      await noOverflow();
    });
    if(route==='/articles/10000002/') {
      await check('math and Mermaid diagram render',async()=>{
        assert.ok(await page.locator('.katex').count()>0);
        await page.waitForSelector('.mermaid-diagram svg',{timeout:20000});
      });
      await check('article table of contents navigates to a real heading',async()=>{
        await page.locator('.article-toc summary').click();
        const link=page.locator('.article-toc a').first();
        const href=await link.getAttribute('href');
        await link.click();
        assert.equal(decodeURIComponent(new URL(page.url()).hash),href);
        await page.locator('.article-toc summary').click();
      });
      await capture('article');
    }
    if(route==='/projects/p001/') {
      await check('gallery opens, Escape closes and returns focus',async()=>{
        const trigger=page.getByRole('button',{name:/放大查看/}).first();await trigger.click();
        assert.ok(await page.locator('#gallery-dialog').isVisible());
        await page.keyboard.press('Escape');
        assert.ok(!await page.locator('#gallery-dialog').isVisible());
        assert.ok(await trigger.evaluate(element=>element===document.activeElement));
      });
      await capture('project');
    }
    if(route==='/about/')await capture('about');
  }
  for(const route of ['/posts/','/articles/10000002/','/projects/p001/','/about/']) {
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'networkidle'});
    await check(`${route} mobile layout`,noOverflow);
    if(route==='/articles/10000002/' || route==='/projects/p001/') await capture(route.includes('articles')?'article-mobile':'project-mobile');
  }
  for(const [legacy,target] of [['/article.html?id=10000002','/articles/10000002/'],['/project.html?id=p001','/projects/p001/'],['/posts.html','/posts/'],['/projects.html','/projects/'],['/about.html','/about/']]) {
    await check(`${legacy} preserves legacy entry`,async()=>{await page.goto(base+legacy);await page.waitForURL(base+target);});
  }
  const noJs=await browser.newContext({javaScriptEnabled:false});
  const staticPage=await noJs.newPage();
  await check('article and project content readable without JavaScript',async()=>{
    await staticPage.goto(base+'/articles/10000002/');assert.ok(await staticPage.locator('.prose h2').count()>0);
    await staticPage.goto(base+'/projects/');assert.equal(await staticPage.locator('.project-index-item').count(),3);
  });
  await noJs.close();
  await check('no uncaught errors',async()=>assert.deepEqual(errors,[]));
  await check('no missing local resources',async()=>assert.deepEqual(failures,[]));
} finally {await browser.close();}
const report={base,checks,errors,failures};
await fs.writeFile(path.join(output,'acceptance.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(checks.some(check=>!check.pass))process.exitCode=1;
