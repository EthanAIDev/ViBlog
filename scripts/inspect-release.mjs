import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {site,resolveSite} from '../site.config.mjs';

const directory=process.env.BUILD_DIR||'dist';
const checks=[];
async function check(name,run){try{await run();checks.push({name,pass:true});}catch(error){checks.push({name,pass:false,error:error.message});}}

await check('unconfigured preview cannot be indexed',()=>assert.deepEqual(resolveSite({}),{siteUrl:undefined,indexable:false}));
await check('release requires a valid public HTTPS origin',()=>{
  for(const SITE_URL of [undefined,'http://localhost:3000','https://localhost.','https://local.localhost','https://127.0.0.1','https://127.0.0.2','https://192.168.1.2','https://10.0.0.5','https://[::ffff:127.0.0.1]','http://release.test','https://release.test/subpath','https://user:password@release.test','https://release.test/?id=1'])assert.throws(()=>resolveSite({SITE_ENV:'production',SITE_URL}));
  assert.deepEqual(resolveSite({SITE_ENV:'production',SITE_URL:'https://release.test/'}),{siteUrl:'https://release.test',indexable:true});
});
const robots=await fs.readFile(path.join(directory,'robots.txt'),'utf8');
const sitemap=await fs.readFile(path.join(directory,'sitemap.xml'),'utf8');
await check('crawler rules match the chosen release environment',()=>{
  assert.ok(robots.includes(site.indexable?'Allow: /':'Disallow: /'));
  if(site.indexable)assert.ok(robots.includes(`Sitemap: ${site.siteUrl}/sitemap.xml`));
  assert.ok(!sitemap.includes('localhost')&&!sitemap.includes('404')&&!sitemap.includes('.html?'));
  if(site.siteUrl)assert.equal((sitemap.match(/<loc>/g)||[]).length,10);
  else assert.equal((sitemap.match(/<loc>/g)||[]).length,0);
});
const routes=['index.html','posts/index.html','projects/index.html','about/index.html','404.html'];
for(const id of ['10000001','10000002','10000003'])routes.push(`articles/${id}/index.html`);
for(const id of ['p001','p002','p003'])routes.push(`projects/${id}/index.html`);
await check('all content routes have correct index and sharing metadata',async()=>{
  for(const route of routes){
    const html=await fs.readFile(path.join(directory,route),'utf8');
    const indexable=site.indexable&&route!=='404.html';
    assert.ok(html.includes(`name="robots" content="${indexable?'index, follow':'noindex, nofollow'}"`),route);
    assert.ok(html.includes('property="og:image"'),route);assert.ok(html.includes('name="twitter:card" content="summary_large_image"'),route);
    const canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1];
    if(site.siteUrl&&route!=='404.html'){assert.ok(canonical?.startsWith(site.siteUrl+'/'),route);assert.ok(!canonical.includes('?')&&!canonical.includes('#'));}
    else assert.equal(canonical,undefined,route);
  }
});
await check('share image is a real 1200 by 630 JPEG',async()=>{
  const {default:sharp}=await import('sharp');const metadata=await sharp(path.join(directory,'social/cover.jpg')).metadata();
  assert.equal(metadata.width,1200);assert.equal(metadata.height,630);assert.equal(metadata.format,'jpeg');
});
await check('responsive display assets exist and meet the hero budget',async()=>{
  const manifest=JSON.parse(await fs.readFile(path.join(directory,'media/manifest.json'),'utf8'));
  let heroBytes=0;
  for(const source of ['/assets/plates/environment.png','/assets/plates/theatre-poster.png']){
    const image=manifest[source];const variant=image.variants.at(-1);heroBytes+=variant.bytes;
  }
  assert.ok(heroBytes<600000,`Hero images total ${heroBytes} bytes`);
  for(const image of Object.values(manifest))for(const variant of image.variants)assert.equal((await fs.stat(path.join(directory,variant.src))).size,variant.bytes);
  for(const route of ['index.html','projects/index.html','about/index.html','projects/p001/index.html','articles/10000001/index.html']){
    const html=await fs.readFile(path.join(directory,route),'utf8');assert.ok(/<img[^>]+srcset="[^"]+\/media\//.test(html),route);
  }
});
await fs.mkdir('.impeccable/review',{recursive:true});
await fs.writeFile(process.env.RELEASE_REPORT||'.impeccable/review/release-acceptance.json',JSON.stringify({buildDirectory:directory,siteUrl:site.siteUrl,environment:site.indexable?'production':'preview',checks},null,2));
console.log(JSON.stringify(checks,null,2));
if(checks.some(check=>!check.pass))process.exitCode=1;
