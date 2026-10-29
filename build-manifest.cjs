var fs = require('fs');
var path = require('path');

var articlesDir = path.join(__dirname, 'articles');
var projectsDir = path.join(__dirname, 'projects');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function buildArticlesManifest() {
  var manifest = [];
  var entries = fs.readdirSync(articlesDir, { withFileTypes: true });

  entries.forEach(function(entry) {
    if (!entry.isDirectory()) return;
    var metaPath = path.join(articlesDir, entry.name, 'meta.json');
    if (!fs.existsSync(metaPath)) return;

    var meta = readJson(metaPath);
    var status = meta.status || 'published';
    if (status !== 'published') return;
    var mdPath = path.join(articlesDir, entry.name, 'index.md');

    var thumbnail = '';
    if (fs.existsSync(mdPath)) {
      var md = fs.readFileSync(mdPath, 'utf-8');
      var imgMatch = md.match(/!\[[^\]]*\]\(([^)]+)\)/);
      if (imgMatch) thumbnail = imgMatch[1];
    }

    manifest.push({
      type: meta.type,
      title: meta.title,
      date: meta.date,
      displayDate: meta.displayDate,
      tags: meta.tags,
      summary: meta.summary,
      id: meta.id,
      file: meta.id + '/index.md',
      thumbnail: thumbnail,
      href: 'article.html?id=' + meta.id
    });
  });

  manifest.sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  fs.writeFileSync(path.join(articlesDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('[build-manifest] 已生成 articles/manifest.json，共 ' + manifest.length + ' 篇文章');
}

function getGalleryCover(gallery) {
  if (!Array.isArray(gallery) || gallery.length === 0) return '';
  var first = gallery[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && typeof first.src === 'string') return first.src;
  return '';
}

function buildProjectsManifest() {
  var manifest = [];
  var entries = fs.readdirSync(projectsDir, { withFileTypes: true });

  entries.forEach(function(entry) {
    if (!entry.isDirectory()) return;
    var detailPath = path.join(projectsDir, entry.name, 'detail.json');
    if (!fs.existsSync(detailPath)) return;

    var detail = readJson(detailPath);
    manifest.push({
      id: detail.id || entry.name,
      title: detail.title || '',
      summary: detail.summary || '',
      cover: getGalleryCover(detail.gallery),
      href: 'project.html?id=' + (detail.id || entry.name)
    });
  });

  manifest.sort(function(a, b) {
    return String(a.id).localeCompare(String(b.id));
  });

  fs.writeFileSync(path.join(projectsDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('[build-manifest] 已生成 projects/manifest.json，共 ' + manifest.length + ' 个项目');
}

buildArticlesManifest();
buildProjectsManifest();
