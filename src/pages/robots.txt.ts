import {site} from '../../site.config.mjs';

export function GET(){
  const text=site.indexable?`User-agent: *\nAllow: /\nSitemap: ${site.siteUrl}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';
  return new Response(text,{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
