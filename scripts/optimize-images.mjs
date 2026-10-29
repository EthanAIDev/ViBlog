import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,readdir,stat,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'public/media');
await mkdir(output,{recursive:true});
const images={};
const activeFiles=new Set(['manifest.json']);
let originalBytes=0,largestBytes=0;

async function optimize(relative){
    const bytes=await readFile(path.join(root,relative));
    const metadata=await sharp(bytes).metadata();
    const rotated=[5,6,7,8].includes(metadata.orientation);
    const dimensions={width:rotated?metadata.height:metadata.width,height:rotated?metadata.width:metadata.height};
    const widths=[...new Set([480,960,1600,1920].map(width=>Math.min(width,dimensions.width)))];
    const variants=[];
    for(const width of widths){
      const hash=createHash('sha256').update(bytes).update(`webp-90-${width}-v1`).digest('hex').slice(0,16);
      const filename=`${hash}-${width}.webp`;
      const target=path.join(output,filename);
      activeFiles.add(filename);activeFiles.add(filename+'.json');
      let length;
      try{length=(await stat(target)).size;}
      catch{
        const result=await sharp(bytes).rotate().resize({width,withoutEnlargement:true}).webp({quality:90,effort:4}).toBuffer();
        await writeFile(target,result);length=result.length;
      }
      await writeFile(target+'.json',JSON.stringify({source:`/${relative}`,prompt:'Existing repository image resized and encoded as WebP with sharp. Image content unchanged.',width}));
      variants.push({src:`/media/${filename}`,width,bytes:length});
    }
    const largest=variants.at(-1);
    images[`/${relative}`]={...dimensions,src:largest.src,variants};
    originalBytes+=bytes.length;largestBytes+=largest.bytes;
}
const sources=new Set(['assets/plates/environment.png','assets/plates/theatre-poster.png','assets/plates/theatre-poster-mobile.png','assets/avatars/about-avatar.jpg']);
async function collectContentImages(directory){
  for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){
    const relative=path.posix.join(directory,entry.name);
    if(entry.isDirectory())await collectContentImages(relative);
    else if(/\.(png|jpe?g|webp)$/i.test(entry.name))sources.add(relative);
  }
}
await collectContentImages('articles');
await collectContentImages('projects');
const projects=JSON.parse(await readFile(path.join(root,'projects/manifest.json'),'utf8'));
for(const project of projects){
  sources.add(`projects/${project.id}/${project.cover}`);
  const detail=JSON.parse(await readFile(path.join(root,'projects',project.id,'detail.json'),'utf8'));
  for(const image of detail.gallery||[])sources.add(`projects/${project.id}/${image.src}`);
}
for(const source of sources)await optimize(source);
await writeFile(path.join(output,'manifest.json'),JSON.stringify(images));
// Only obsolete files created by this generator are removed, inside public/media.
for(const entry of await readdir(output,{withFileTypes:true})){
  if(entry.isFile()&&/^[a-f0-9]{16}-\d+\.webp(?:\.json)?$/.test(entry.name)&&!activeFiles.has(entry.name)){
    try{await unlink(path.join(output,entry.name));}
    catch(error){if(!['EBUSY','EPERM','ENOENT'].includes(error.code))throw error;}
  }
}
console.log(`Optimized ${Object.keys(images).length} images: ${(originalBytes/1048576).toFixed(2)} MiB → ${(largestBytes/1048576).toFixed(2)} MiB at largest display size.`);
