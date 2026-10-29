import { cp, mkdir, readdir, writeFile, access, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = path.join(root, 'public');
await mkdir(publicDir, { recursive: true });
for (const folder of ['assets', 'articles', 'projects']) {
  const mirror = path.resolve(publicDir, folder);
  const relative = path.relative(root, mirror);
  if (path.dirname(mirror) !== path.resolve(publicDir) || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Generated directory is outside the workspace: ${mirror}`);
  }
  // Only these three generated mirrors are replaced. Source content and public/favicon.svg stay intact.
  await rm(mirror, { recursive: true, force: true });
  await cp(path.join(root, folder), mirror, { recursive: true });
  await recordOrigins(mirror);
}

async function recordOrigins(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await recordOrigins(file);
    else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) {
      try { await access(file + '.json'); }
      catch {
        const source = path.relative(publicDir, file).split(path.sep).join('/');
        await writeFile(file + '.json', JSON.stringify({ prompt: `Origin: pre-existing user-maintained repository asset ${source}. Reused without visual changes; original external provenance is not independently verified.`, source }, null, 2));
      }
    }
  }
}
await cp(path.join(root, '_headers'), path.join(publicDir, '_headers'));
for (const [name, target] of Object.entries({ 'posts.html': '/posts/', 'projects.html': '/projects/', 'about.html': '/about/', 'article.html': '/posts/', 'project.html': '/projects/' })) {
  const collection = name === 'article.html' ? 'articles' : name === 'project.html' ? 'projects' : null;
  const script = collection
    ? `const id=new URLSearchParams(location.search).get('id');location.replace(id&&/^[a-zA-Z0-9_-]+$/.test(id)?'/${collection}/'+encodeURIComponent(id)+'/'+location.hash:'${target}');`
    : `location.replace('${target}'+location.search+location.hash);`;
  await writeFile(path.join(publicDir, name), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>正在前往 ViBlog</title><meta name="robots" content="noindex"><script>${script}</script><body><p>页面已更新。<a href="${target}">前往${collection === 'articles' || name === 'posts.html' ? '文章' : name === 'about.html' ? '关于' : '项目'}</a></p></body></html>`);
}
console.log('Public content ready.');
