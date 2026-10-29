import fs from 'node:fs';
import path from 'node:path';

type Variant={src:string;width:number;bytes:number};
type OptimizedImage={src:string;width:number;height:number;variants:Variant[]};
let manifest:Record<string,OptimizedImage>|undefined;

export function optimizedImage(source:string){
  if(!source.startsWith('/')||source.startsWith('//'))return undefined;
  if(!manifest)manifest=JSON.parse(fs.readFileSync(path.join(process.cwd(),'public/media/manifest.json'),'utf8'));
  return manifest![decodeURI(source)];
}

export function imageVariant(source:string,width=1600){
  const image=optimizedImage(source);
  return image?.variants.find(variant=>variant.width>=width)?.src||image?.src||source;
}
