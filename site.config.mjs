import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadEnvFile} from 'node:process';
import {isIP} from 'node:net';

const envPath=fileURLToPath(new URL('.env',import.meta.url));
if(existsSync(envPath))loadEnvFile(envPath);

export function resolveSite(environment){
  const production=environment.SITE_ENV==='production';
  const value=environment.SITE_URL?.trim();
  if(!value){
    if(production)throw new Error('Production builds require SITE_URL, for example your verified https:// domain.');
    return {siteUrl:undefined,indexable:false};
  }
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('SITE_URL must be a full origin URL without credentials, path, query or hash.');
  const hostname=url.hostname.replace(/^\[|\]$/g,'').replace(/\.$/,'');
  const localHostname=hostname==='localhost'||hostname.endsWith('.localhost')||hostname.endsWith('.local')||!hostname.includes('.');
  if(production&&(url.protocol!=='https:'||isIP(hostname)||localHostname))throw new Error('Production SITE_URL must use HTTPS and a public domain name, not an IP or local hostname.');
  return {siteUrl:url.origin,indexable:production};
}

export const site=resolveSite({...process.env,SITE_URL:process.env.SITE_URL||'https://exl.qzz.io'});
