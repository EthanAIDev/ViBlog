import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import sharp from 'sharp';

// Export the actual lit rings for the first-paint entrance, before JS/GPU startup.
// The route override exists only in this capture browser, never in shipped code.
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{}),args:['--enable-unsafe-swiftshader']});
try{
 for(const mobile of [false,true])for(let ring=0;ring<4;ring++){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,reducedMotion:'reduce'});
  let intercepted=false;
  await page.route(/\/src\/lib\/theatre\.ts(?:\?.*)?$/,async route=>{
   intercepted=true;
   const response=await route.fetch();let body=await response.text();
   const needle='renderer.render(scene, camera);';
   if(!body.includes(needle))throw new Error('Capture requires the Vite development preview.');
   body=body.replace(needle,`${ring<3?`if(!window.__arrivalIsolated){ringGroups.forEach(({ring:object},index)=>{if(index!==${ring})object.traverse(mesh=>{if(mesh instanceof THREE.Mesh&&mesh.material.visible){mesh.material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});mesh.renderOrder=-1;}});});window.__arrivalIsolated=true;}reflection.visible=false;`:''}scene.getObjectByName('cursor-particle-field').visible=false;${needle}`);
   await route.fulfill({response,body});
  });
  try{
   await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:3000/',{waitUntil:'networkidle'});
   await page.waitForSelector('.theatre[data-renderer=ready]');await page.waitForTimeout(200);
   if(!intercepted)throw new Error('Capture did not isolate the requested ring.');
   await page.addStyleTag({content:'html,body,.theatre{background:transparent!important}.site-header,.theatre-copy,.theatre-environment,.theatre-poster,.theatre-parts,.theatre-arrival,.selected-work,.theatre-writing,.theatre-about,.site-footer{visibility:hidden!important}'});
   const target=`assets/plates/theatre-arrival-${ring<3?ring:'assembled'}${mobile?'-mobile':''}.png`;
   await page.locator('.theatre canvas').screenshot({path:target,omitBackground:true});
   const metadata=await sharp(target).metadata();if(!metadata.hasAlpha)throw new Error('Ring capture must have transparency.');
   await fs.writeFile(target+'.json',JSON.stringify({source:'src/lib/theatre.ts',capture:'scripts/capture-theatre-arrival.mjs',prompt:ring<3?`Transparent capture of real ring ${ring+1} at its assembled, reduced-motion pose. Other rings write depth only, preserving the assembled sculpture's real occlusion. Particles, mirror, HTML and environment hidden. Subject geometry, materials and lighting unchanged.`:'Transparent capture of the real assembled sculpture at its neutral pose, with its normal mirror and mutual transparency. Particles, HTML and environment hidden. Same geometry, materials, lighting and camera as the live handoff.',width:metadata.width,height:metadata.height},null,2));
   console.log(`${target}: ${metadata.width}x${metadata.height}`);
  }finally{await page.close();}
 }
}finally{await browser.close();}
