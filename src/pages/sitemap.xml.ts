import {site} from '../../site.config.mjs';
import {getPosts,getProjects} from '../lib/content';

export function GET(){
  const routes=['/','/posts/','/projects/','/about/',...getPosts().map(post=>post.href),...getProjects().map(project=>project.href)];
  const urls=site.siteUrl?routes.map(route=>`<url><loc>${new URL(route,site.siteUrl).href.replace(/&/g,'&amp;')}</loc></url>`).join(''):'';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
