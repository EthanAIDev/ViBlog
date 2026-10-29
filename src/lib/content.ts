import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import type { Root } from 'mdast';
import {optimizedImage,imageVariant} from './images';

export type Post = {
  id: string; title: string; type: string; date: string; displayDate: string;
  tags: string[]; summary: string; thumbnail?: string; href: string; minutes: number;
};
export type Project = {
  id: string; title: string; summary: string; cover: string; href: string;
  name: string; focus: string; shortSummary: string; technologies: string[];
  overviewMd: string; techStackMd: string; implementationMd: string;
  links: { github: string; docs?: string };
  gallery: { src: string; alt: string; caption: string }[];
};
const root = process.cwd();
export function plainText(text: string) { return text.replace(/[*_`#>]/g, '').trim(); }

export function getPosts(): Post[] {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'articles/manifest.json'), 'utf8'));
  return manifest.map((post: Post) => {
    const markdown = fs.readFileSync(path.join(root, 'articles', post.id, 'index.md'), 'utf8');
    return { ...post, summary: plainText(post.summary), href: `/articles/${post.id}/`, minutes: Math.max(1, Math.ceil(markdown.length / 650)) };
  });
}
export function getProjects(): Project[] {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'projects/manifest.json'), 'utf8'));
  return manifest.map((entry: Project) => {
    const detail = JSON.parse(fs.readFileSync(path.join(root, 'projects', entry.id, 'detail.json'), 'utf8'));
    return { ...entry, ...detail, name: detail.displayName || detail.title,
      focus: detail.focus || 'Project', shortSummary: detail.cardSummary || plainText(detail.summary), technologies: detail.technologies || [],
      cover: `/projects/${entry.id}/${entry.cover}`, href: `/projects/${entry.id}/` };
  });
}
export function getArticleMarkdown(id: string) { return fs.readFileSync(path.join(root, 'articles', id, 'index.md'), 'utf8'); }

function articleHeadings() {
  return (tree: Root) => {
    if (!tree.children.some(node => node.type === 'heading' && node.depth === 1)) return;
    for (const node of tree.children) {
      if (node.type === 'heading') node.depth = Math.min(6, node.depth + 1) as 1|2|3|4|5|6;
    }
  };
}

export async function renderMarkdown(markdown: string, assetBase = '') {
  const notes: Record<string,string> = {NOTE:'笔记',TIP:'提示',WARNING:'注意',IMPORTANT:'重要',CAUTION:'提醒'};
  const source = markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match,file:string,alt:string) => `![${alt || file}](${file})`)
    .replace(/^(>\s*)\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/gm,(_match,prefix:string,kind:string) => `${prefix}**${notes[kind]}**`);
  const processed = await unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(articleHeadings)
    .use(remarkRehype).use(rehypeSlug).use(rehypeKatex).use(rehypeHighlight, { detect: false, ignoreMissing: true }).use(rehypeStringify).process(source);
  // Markdown remains in its original content folder. Resolve relative image references there.
  const html=String(processed).replace(/src="(?!https?:|data:|\/)([^"]+)"/g, (_match, source: string) => `src="${assetBase}${source}"`);
  return html.replace(/<img\b([^>]*?)src="([^"]+)"([^>]*)>/g,(tag,before:string,source:string,after:string)=>{
    const image=optimizedImage(source);
    if(!image)return tag;
    const srcset=image.variants.map(variant=>`${variant.src} ${variant.width}w`).join(', ');
    return `<img${before}src="${imageVariant(source,960)}" srcset="${srcset}" sizes="(max-width: 760px) 90vw, 850px" width="${image.width}" height="${image.height}" loading="lazy" decoding="async" data-original="${source}"${after}>`;
  });
}

export function getTableOfContents(html: string) {
  return [...html.matchAll(/<h([23]) id="([^"]+)">(.*?)<\/h[23]>/g)].map((match) => ({depth:Number(match[1]),id:match[2],text:match[3].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')}));
}
