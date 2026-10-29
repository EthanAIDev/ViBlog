import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{}),args:['--enable-unsafe-swiftshader']});
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1586,height:900},deviceScaleFactor:mobile?2:1,reducedMotion:'reduce'});
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:3000/',{waitUntil:'networkidle'});
  await page.waitForSelector('.theatre[data-renderer=ready]');await page.mouse.move(5,5);await page.waitForTimeout(1200);
  await page.addStyleTag({content:'html,body,.theatre{background:transparent!important}.site-header,.theatre-copy,.theatre-environment,.theatre-poster,.theatre-parts{visibility:hidden!important}'});
  const target=`assets/plates/theatre-poster${mobile?'-mobile':''}.png`;
  await page.locator('.theatre canvas').screenshot({path:target,omitBackground:true});
  const metadata=await sharp(target).metadata();if(!metadata.hasAlpha)throw new Error('Poster must be transparent and contain no HTML.');
  await fs.writeFile(target+'.json',JSON.stringify({source:'src/lib/theatre.ts',prompt:'Transparent capture of the real sculpture and particles only. All HTML, environment and fallback layers were hidden.',width:metadata.width,height:metadata.height},null,2));
  console.log(`${target}: ${metadata.width}x${metadata.height}, transparent`);await page.close();
 }
}finally{await browser.close();}
