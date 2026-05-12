var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

var PORT = process.env.PORT || 3000;
var ROOT = __dirname;
var ARTICLES_DIR = path.join(ROOT, 'articles');
var PROJECTS_DIR = path.join(ROOT, 'projects');
var TMP_DIR = path.join(ARTICLES_DIR, '_tmp');
var SITE_SETTINGS_PATH = path.join(ROOT, 'site-settings.json');
var AVATARS_DIR = path.join(ROOT, 'assets', 'avatars');

var MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf'
};

function getMimeType(filePath) {
  var ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function readRequestBody(req) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    req.on('data', function(chunk) { chunks.push(chunk); });
    req.on('end', function() {
      var body = Buffer.concat(chunks).toString('utf-8');
      try { resolve(body ? JSON.parse(body) : null); }
      catch (e) { reject(new Error('无效的 JSON 格式')); }
    });
    req.on('error', reject);
  });
}

function removeDirRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  var entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach(function(entry) {
    var fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) removeDirRecursive(fullPath);
    else fs.unlinkSync(fullPath);
  });
  fs.rmdirSync(dirPath);
}

function sanitizeFilename(name) {
  return String(name || '')
    .replace(/[<>:"/\\|?*\r\n\t]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '-');
}

function sanitizeSession(sessionId) {
  var clean = String(sessionId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return clean || 'default';
}

function isExternalOrDataImage(src) {
  return /^(https?:\/\/|data:|\/\/)/i.test(String(src || '').trim());
}

function normalizeImagePath(p) {
  return String(p || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .toLowerCase();
}

function extractImageSrc(rawSrc) {
  var src = String(rawSrc || '').trim();
  if (!src) return '';
  if (src.charAt(0) === '<' && src.charAt(src.length - 1) === '>') {
    src = src.slice(1, -1).trim();
  }
  var quotedTitle = src.match(/^(.+?)\s+["'].*["']\s*$/);
  if (quotedTitle) src = quotedTitle[1].trim();
  return src;
}

function parseMarkdownImageMatches(md) {
  var images = [];
  var standardRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  var obsidianRegex = /!\[\[([^\]]+)\]\]/g;
  var match;

  while ((match = standardRegex.exec(md)) !== null) {
    var src = extractImageSrc(match[2]);
    if (!src || isExternalOrDataImage(src)) continue;
    images.push({
      style: 'standard',
      full: match[0],
      alt: match[1] || '',
      src: src,
      normalizedSrc: normalizeImagePath(src),
      position: match.index
    });
  }

  while ((match = obsidianRegex.exec(md)) !== null) {
    var raw = String(match[1] || '');
    var srcOnly = raw.split('|')[0].trim();
    var srcObs = extractImageSrc(srcOnly);
    if (!srcObs || isExternalOrDataImage(srcObs)) continue;
    images.push({
      style: 'obsidian',
      full: match[0],
      alt: '',
      src: srcObs,
      normalizedSrc: normalizeImagePath(srcObs),
      position: match.index
    });
  }

  images.sort(function(a, b) { return a.position - b.position; });
  return images;
}

function findExistingImageRelPath(articleFolder, src) {
  var direct = src;
  var directPath = path.join(articleFolder, direct);
  if (fs.existsSync(directPath)) return direct;

  var spaceToUnderscore = src.replace(/\s+/g, '_');
  var underscorePath = path.join(articleFolder, spaceToUnderscore);
  if (fs.existsSync(underscorePath)) return spaceToUnderscore;

  var base = path.basename(src);
  var basePath = path.join(articleFolder, base);
  if (fs.existsSync(basePath)) return base;

  var baseUnderscore = base.replace(/\s+/g, '_');
  var baseUnderscorePath = path.join(articleFolder, baseUnderscore);
  if (fs.existsSync(baseUnderscorePath)) return baseUnderscore;

  return null;
}

function applyCanonicalImageNaming(articleFolder, articleId, content) {
  var matches = parseMarkdownImageMatches(content || '');
  if (matches.length === 0) return { content: content, renamed: [] };

  var mapping = {};
  var renamed = [];
  var usedTargets = {};
  var seq = 1;

  matches.forEach(function(match) {
    var key = match.normalizedSrc;
    if (mapping[key]) return;

    var existingRel = findExistingImageRelPath(articleFolder, match.src);
    if (!existingRel) return;

    var ext = path.extname(existingRel || match.src || '').toLowerCase();
    if (!ext) ext = '.png';

    var targetRel = '';
    while (!targetRel) {
      var candidate = articleId + '_' + String(seq).padStart(3, '0') + ext;
      seq++;
      if (!usedTargets[candidate]) targetRel = candidate;
    }

    usedTargets[targetRel] = true;
    mapping[key] = { fromRel: existingRel, toRel: targetRel };
  });

  Object.keys(mapping).forEach(function(key) {
    var info = mapping[key];
    if (info.fromRel === info.toRel) return;
    var fromPath = path.join(articleFolder, info.fromRel);
    var toPath = path.join(articleFolder, info.toRel);
    if (!fs.existsSync(fromPath)) return;
    if (fs.existsSync(toPath) && toPath !== fromPath) fs.unlinkSync(toPath);
    fs.renameSync(fromPath, toPath);
    renamed.push({ from: info.fromRel, to: info.toRel });
  });

  for (var i = matches.length - 1; i >= 0; i--) {
    var m = matches[i];
    var map = mapping[m.normalizedSrc];
    if (!map) continue;

    var replacement;
    if (m.style === 'obsidian') replacement = '![[${name}]]'.replace('${name}', map.toRel);
    else replacement = '![' + (m.alt || '') + '](' + map.toRel + ')';

    content = content.slice(0, m.position) + replacement + content.slice(m.position + m.full.length);
  }

  return { content: content, renamed: renamed };
}

function runBuildManifest() {
  try {
    var execSync = require('child_process').execSync;
    var nodePath = process.execPath;
    execSync('"' + nodePath + '" build-manifest.js', { cwd: ROOT, encoding: 'utf-8' });
    console.log('[server] Manifest 已更新');
  } catch (err) {
    console.error('[server] Manifest 构建失败:', err.message);
  }
}

function readSiteSettings() {
  var defaults = {
    site: {
      title: '',
      description: '',
      favicon: '',
      ogImage: '',
      headerBrandMark: '',
      headerBrandName: ''
    },
    home: {
      brandName: '',
      brandIcon: '',
      heroEyebrow: '',
      heroTitle: '',
      heroText: '',
      terminal: {
        role: '',
        focus: '',
        location: '',
        mode: '',
        command: ''
      },
      notes: [],
      sections: [
        { id: 'about', name: '关于我', eyebrow: '关于我', enabled: true, order: 1 },
        { id: 'posts', name: '最新文章', eyebrow: '最新文章', enabled: true, order: 2 },
        { id: 'projects', name: '精选项目', eyebrow: '精选项目', enabled: true, order: 3 },
        { id: 'workflow', name: '工作流 / 技术栈快照', eyebrow: '工作流 / 技术栈快照', enabled: true, order: 4 }
      ]
    },
    about: {
      heroEyebrow: '',
      heroTitle: '',
      heroText: '',
      profileName: '',
      profileRole: '',
      avatarSrc: 'assets/about-avatar.svg',
      links: {
        bilibili: 'https://space.bilibili.com/',
        github: 'https://github.com/',
        qq: '#',
        wechat: '#',
        email: 'mailto:hello@example.com'
      },
      cards: [],
      workflow: { eyebrow: '', title: '', commands: '', stack1Title: '', stack2Title: '', stack1Items: '', stack2Items: '' },
      timeline: { eyebrow: '', title: '', items: [] },
      socialButtons: [
        { id: 'bilibili', enabled: true },
        { id: 'github', enabled: true },
        { id: 'qq', enabled: true },
        { id: 'wechat', enabled: true },
        { id: 'email', enabled: true }
      ]
    }
  };

  if (!fs.existsSync(SITE_SETTINGS_PATH)) {
    return defaults;
  }
  try {
    var raw = JSON.parse(fs.readFileSync(SITE_SETTINGS_PATH, 'utf-8'));
    raw = raw && typeof raw === 'object' ? raw : {};
    raw.site = raw.site && typeof raw.site === 'object' ? raw.site : {};
    raw.home = raw.home && typeof raw.home === 'object' ? raw.home : {};
    raw.home.terminal = raw.home.terminal && typeof raw.home.terminal === 'object' ? raw.home.terminal : {};
    raw.home.notes = Array.isArray(raw.home.notes) ? raw.home.notes : [];
    raw.home.sections = Array.isArray(raw.home.sections) ? raw.home.sections : [];
    raw.about = raw.about && typeof raw.about === 'object' ? raw.about : {};
    raw.about.links = raw.about.links && typeof raw.about.links === 'object' ? raw.about.links : {};

    var sections = raw.home.sections.map(function(s) {
      return {
        id: String(s.id || ''),
        name: String(s.name || ''),
        eyebrow: String(s.eyebrow || ''),
        enabled: !!s.enabled,
        order: typeof s.order === 'number' ? s.order : 1
      };
    });

    var notes = raw.home.notes.map(function(n) {
      return {
        label: String(n.label || ''),
        content: String(n.content || '')
      };
    });

    return {
      site: {
        title: String(raw.site.title || defaults.site.title),
        description: String(raw.site.description || defaults.site.description),
        favicon: String(raw.site.favicon || defaults.site.favicon),
        ogImage: String(raw.site.ogImage || defaults.site.ogImage),
        headerBrandMark: String(raw.site.headerBrandMark || defaults.site.headerBrandMark),
        headerBrandName: String(raw.site.headerBrandName || defaults.site.headerBrandName)
      },
      home: {
        brandName: String(raw.home.brandName || defaults.home.brandName),
        brandIcon: String(raw.home.brandIcon || defaults.home.brandIcon),
        heroEyebrow: String(raw.home.heroEyebrow || defaults.home.heroEyebrow),
        heroTitle: String(raw.home.heroTitle || defaults.home.heroTitle),
        heroText: String(raw.home.heroText || defaults.home.heroText),
        terminal: {
          role: String(raw.home.terminal.role || defaults.home.terminal.role),
          focus: String(raw.home.terminal.focus || defaults.home.terminal.focus),
          location: String(raw.home.terminal.location || defaults.home.terminal.location),
          mode: String(raw.home.terminal.mode || defaults.home.terminal.mode),
          command: String(raw.home.terminal.command || defaults.home.terminal.command)
        },
        notes: notes,
        sections: sections
      },
      about: {
        heroEyebrow: String(raw.about.heroEyebrow || defaults.about.heroEyebrow),
        heroTitle: String(raw.about.heroTitle || defaults.about.heroTitle),
        heroText: String(raw.about.heroText || defaults.about.heroText),
        profileName: String(raw.about.profileName || defaults.about.profileName),
        profileRole: String(raw.about.profileRole || defaults.about.profileRole),
        avatarSrc: String(raw.about.avatarSrc || defaults.about.avatarSrc),
        links: {
          bilibili: String(raw.about.links.bilibili || defaults.about.links.bilibili),
          github: String(raw.about.links.github || defaults.about.links.github),
          qq: String(raw.about.links.qq || defaults.about.links.qq),
          wechat: String(raw.about.links.wechat || defaults.about.links.wechat),
          email: String(raw.about.links.email || defaults.about.links.email)
        },
        cards: Array.isArray(raw.about.cards) ? raw.about.cards.map(function(c) {
          return { title: String(c.title || ''), content: String(c.content || '') };
        }) : [],
        workflow: (function() {
          var wf = raw.about.workflow && typeof raw.about.workflow === 'object' ? raw.about.workflow : {};
          return {
            eyebrow: String(wf.eyebrow || ''),
            title: String(wf.title || ''),
            commands: String(wf.commands || ''),
            stack1Title: String(wf.stack1Title || ''),
            stack2Title: String(wf.stack2Title || ''),
            stack1Items: String(wf.stack1Items || ''),
            stack2Items: String(wf.stack2Items || '')
          };
        })(),
        timeline: (function() {
          var tl = raw.about.timeline && typeof raw.about.timeline === 'object' ? raw.about.timeline : {};
          return {
            eyebrow: String(tl.eyebrow || ''),
            title: String(tl.title || ''),
            items: Array.isArray(tl.items) ? tl.items.map(function(t) {
              return { date: String(t.date || ''), title: String(t.title || ''), desc: String(t.desc || '') };
            }) : []
          };
        })(),
        socialButtons: Array.isArray(raw.about.socialButtons) ? raw.about.socialButtons.map(function(b) {
          console.log('[server] reading socialButtons from file:', JSON.stringify(raw.about.socialButtons));
          return { id: String(b.id || ''), enabled: !!b.enabled };
        }) : defaults.about.socialButtons
      }
    };
  } catch (e) {
    return defaults;
  }
}

function writeSiteSettings(settings) {
  fs.writeFileSync(SITE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function listProjectFolders() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs.readdirSync(PROJECTS_DIR, { withFileTypes: true }).filter(function(entry) {
    return entry.isDirectory() && entry.name !== '_tmp';
  }).map(function(entry) {
    return entry.name;
  });
}

function loadProjectDetail(projectId) {
  return readJsonFile(path.join(PROJECTS_DIR, projectId, 'detail.json'), null);
}

function markdownToPlainText(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeProjectDetail(detail, fallbackId) {
  detail = detail && typeof detail === 'object' ? detail : {};
  var links = detail.links && typeof detail.links === 'object' ? detail.links : {};
  var gallery = Array.isArray(detail.gallery) ? detail.gallery : [];
  var summary = String(detail.summary || '').trim();
  var overviewMd = String(detail.overviewMd || '').trim();
  var techStackMd = String(detail.techStackMd || '').trim();
  var implementationMd = String(detail.implementationMd || '').trim();
  var normalizedTechStack = Array.isArray(detail.techStack) ? detail.techStack.map(function(item) { return String(item || '').trim(); }).filter(Boolean) : [];
  var normalizedImplementation = Array.isArray(detail.implementation) ? detail.implementation.map(function(item) { return String(item || '').trim(); }).filter(Boolean) : [];

  if (!overviewMd && summary) {
    overviewMd = summary;
  }
  if (!techStackMd && normalizedTechStack.length > 0) {
    techStackMd = normalizedTechStack.map(function(item) { return '- ' + item; }).join('\n');
  }
  if (!implementationMd && normalizedImplementation.length > 0) {
    implementationMd = normalizedImplementation.map(function(item) { return '- ' + item; }).join('\n');
  }
  if (!summary) {
    summary = markdownToPlainText(overviewMd);
  }

  return {
    id: String(detail.id || fallbackId || '').trim(),
    title: String(detail.title || '').trim(),
    summary: summary,
    overviewMd: overviewMd,
    techStackMd: techStackMd,
    implementationMd: implementationMd,
    techStack: normalizedTechStack,
    implementation: normalizedImplementation,
    links: {
      github: String(links.github || '').trim(),
      docs: String(links.docs || '').trim()
    },
    gallery: gallery.map(function(item) {
      if (typeof item === 'string') {
        return { src: String(item || '').trim(), alt: '', caption: '' };
      }
      item = item && typeof item === 'object' ? item : {};
      return {
        src: String(item.src || '').trim(),
        alt: String(item.alt || '').trim(),
        caption: String(item.caption || '').trim()
      };
    }).filter(function(item) {
      return item.src;
    })
  };
}

function saveProjectDetail(projectId, detail) {
  var projectDir = path.join(PROJECTS_DIR, projectId);
  ensureDir(projectDir);
  fs.writeFileSync(path.join(projectDir, 'detail.json'), JSON.stringify(detail, null, 2), 'utf-8');
}

function rebuildProjectsManifest() {
  var manifest = [];
  listProjectFolders().forEach(function(projectId) {
    var raw = loadProjectDetail(projectId);
    if (!raw) return;
    var detail = normalizeProjectDetail(raw, projectId);
    manifest.push({
      id: detail.id || projectId,
      title: detail.title,
      summary: detail.summary,
      cover: Array.isArray(detail.gallery) && detail.gallery.length > 0 ? detail.gallery[0].src : '',
      href: 'project.html?id=' + (detail.id || projectId)
    });
  });

  manifest.sort(function(a, b) {
    return String(a.id).localeCompare(String(b.id));
  });

  fs.writeFileSync(path.join(PROJECTS_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  return manifest;
}

// ==========================================================
//  API 端点
// ==========================================================

/**
 * POST /api/articles/upload-image
 * 接收图片二进制数据，存入临时目录
 * Headers: x-filename, x-article-id (可选)
 */
function handleUploadImage(req, res) {
  var filename = req.headers['x-filename'];
  try { filename = decodeURIComponent(filename || ''); } catch (e) {}
  var uploadSession = sanitizeSession(req.headers['x-upload-session']);
  if (!filename) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '缺少文件名' }));
    return;
  }

  // 清洗文件名
  var ext = path.extname(filename) || '.png';
  var base = path.basename(filename, ext);
  base = sanitizeFilename(base);
  var safeName = base + '_' + Date.now() + ext;

  var sessionTmpDir = path.join(TMP_DIR, uploadSession);

  if (!fs.existsSync(sessionTmpDir)) {
    fs.mkdirSync(sessionTmpDir, { recursive: true });
  }

  var chunks = [];
  req.on('data', function(chunk) { chunks.push(chunk); });
  req.on('end', function() {
    var buf = Buffer.concat(chunks);
    var imgPath = path.join(sessionTmpDir, safeName);
    fs.writeFileSync(imgPath, buf);
    console.log('[server] 临时图片已保存: _tmp/' + uploadSession + '/' + safeName);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, filename: safeName }));
  });
  req.on('error', function() {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '上传失败' }));
  });
}

async function handleSaveArticle(req, res) {
  try {
    var data = await readRequestBody(req);
    if (!data || !data.articleId || !data.title || !data.content) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: '缺少必要参数' }));
      return;
    }

    var articleId = String(data.articleId);
    var title = data.title;
    var type = data.type || '';
    var displayDate = data.displayDate || '';
    var tags = data.tags || [];
    var summary = data.summary || '';
    var content = data.content;
    var oldArticleId = data.oldArticleId ? String(data.oldArticleId) : null;

    var articleFolder = path.join(ARTICLES_DIR, articleId);
    var uploadSession = sanitizeSession(data.uploadSessionId || 'default');
    var sessionTmpDir = path.join(TMP_DIR, uploadSession);

    if (oldArticleId && oldArticleId !== articleId) {
      var oldFolder = path.join(ARTICLES_DIR, oldArticleId);
      if (fs.existsSync(oldFolder)) {
        removeDirRecursive(oldFolder);
        console.log('[server] 已删除旧文件夹: ' + oldArticleId);
      }
    }

    if (!fs.existsSync(articleFolder)) {
      fs.mkdirSync(articleFolder, { recursive: true });
    }

    // 将临时图片移动到文章文件夹
    var movedFiles = [];
    if (fs.existsSync(sessionTmpDir)) {
      var tmpFiles = fs.readdirSync(sessionTmpDir);
      tmpFiles.forEach(function(f) {
        var src = path.join(sessionTmpDir, f);
        var dst = path.join(articleFolder, f);
        fs.renameSync(src, dst);
        movedFiles.push(f);
        console.log('[server] 图片已移动到: ' + articleId + '/' + f);
      });
    }

    // 兜底：如果会话目录没找到，但 _tmp 下仅有一个会话目录，尝试自动回收（防止前端会话错位）
    if (!fs.existsSync(sessionTmpDir) && movedFiles.length === 0 && fs.existsSync(TMP_DIR)) {
      var sessionDirs = fs.readdirSync(TMP_DIR, { withFileTypes: true }).filter(function(dirent) {
        return dirent.isDirectory();
      });
      if (sessionDirs.length === 1) {
        var fallbackDir = path.join(TMP_DIR, sessionDirs[0].name);
        var fallbackFiles = fs.readdirSync(fallbackDir);
        fallbackFiles.forEach(function(f) {
          var src2 = path.join(fallbackDir, f);
          var dst2 = path.join(articleFolder, f);
          fs.renameSync(src2, dst2);
          movedFiles.push(f);
          console.log('[server] 兜底回收图片到: ' + articleId + '/' + f);
        });
        removeDirRecursive(fallbackDir);
      }
    }

    // 统一图片命名：{articleId}_{序号}.{ext}，并改写正文引用
    var normalized = applyCanonicalImageNaming(articleFolder, articleId, content);
    content = normalized.content;

    // 写入 meta.json
    var meta = {
      id: articleId,
      title: title,
      type: type,
      date: displayDate.replace(/\./g, '-'),
      displayDate: displayDate,
      tags: tags,
      summary: summary,
      status: data.status === 'draft' ? 'draft' : 'published'
    };
    fs.writeFileSync(path.join(articleFolder, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

    // 写入 index.md（重命名后的 Markdown 正文）
    fs.writeFileSync(path.join(articleFolder, 'index.md'), content, 'utf-8');
    console.log('[server] 已保存文章: ' + articleId);

    // 保存后清理当前会话的临时上传目录
    if (fs.existsSync(sessionTmpDir)) {
      removeDirRecursive(sessionTmpDir);
    }

    runBuildManifest();

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      message: '文章保存成功',
      articleId: articleId,
      renamedImages: normalized.renamed
    }));
  } catch (err) {
    console.error('[server] 保存文章失败:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '服务端保存失败: ' + err.message }));
  }
}

function handleDeleteArticle(req, res, articleId) {
  var articleFolder = path.join(ARTICLES_DIR, articleId);
  if (!fs.existsSync(articleFolder)) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '文章文件夹不存在' }));
    return;
  }
  removeDirRecursive(articleFolder);
  console.log('[server] 已删除: ' + articleId);
  runBuildManifest();
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: true, message: '文章删除成功' }));
}

function handleBuildManifest(req, res) {
  runBuildManifest();
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: true, message: 'Manifest 已重建' }));
}

async function handleGetSiteSettings(req, res) {
  var settings = readSiteSettings();
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: true, settings: settings }));
}

async function handleSaveSiteSettings(req, res) {
  try {
    var data = await readRequestBody(req);
    console.log('[server] Received data.about.socialButtons:', JSON.stringify(data && data.about && data.about.socialButtons));
    if (!data || typeof data !== 'object') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: '参数错误' }));
      return;
    }

    var settings = readSiteSettings();
    settings.site = settings.site || {};
    settings.home = settings.home || {};
    settings.about = settings.about || {};

    if (data.site && typeof data.site === 'object') {
      settings.site.title = String(data.site.title || '');
      settings.site.description = String(data.site.description || '');
      settings.site.favicon = String(data.site.favicon || '');
      settings.site.ogImage = String(data.site.ogImage || '');
      settings.site.headerBrandMark = String(data.site.headerBrandMark || '');
      settings.site.headerBrandName = String(data.site.headerBrandName || '');
    }
    if (data.home && typeof data.home === 'object') {
      settings.home.brandName = String(data.home.brandName || '');
      settings.home.brandIcon = String(data.home.brandIcon || '');
      settings.home.heroEyebrow = String(data.home.heroEyebrow || '');
      settings.home.heroTitle = String(data.home.heroTitle || '');
      settings.home.heroText = String(data.home.heroText || '');
      
      var terminal = data.home.terminal && typeof data.home.terminal === 'object' ? data.home.terminal : {};
      settings.home.terminal = {
        role: String(terminal.role || ''),
        focus: String(terminal.focus || ''),
        location: String(terminal.location || ''),
        mode: String(terminal.mode || ''),
        command: String(terminal.command || '')
      };
      
      settings.home.notes = Array.isArray(data.home.notes) ? data.home.notes.map(function(n) {
        return {
          label: String(n.label || ''),
          content: String(n.content || '')
        };
      }) : [];
      
      settings.home.sections = Array.isArray(data.home.sections) ? data.home.sections.map(function(s) {
        return {
          id: String(s.id || ''),
          name: String(s.name || ''),
          eyebrow: String(s.eyebrow || ''),
          enabled: !!s.enabled,
          order: typeof s.order === 'number' ? s.order : 1
        };
      }) : [];
    }
    if (data.about && typeof data.about === 'object') {
      var aboutLinks = data.about.links && typeof data.about.links === 'object' ? data.about.links : {};
      settings.about.heroEyebrow = String(data.about.heroEyebrow || '');
      settings.about.heroTitle = String(data.about.heroTitle || '');
      settings.about.heroText = String(data.about.heroText || '');
      settings.about.profileName = String(data.about.profileName || '');
      settings.about.profileRole = String(data.about.profileRole || '');
      settings.about.avatarSrc = String(data.about.avatarSrc || '');
      settings.about.links = settings.about.links || {};
      settings.about.links.bilibili = String(aboutLinks.bilibili || '');
      settings.about.links.github = String(aboutLinks.github || '');
      settings.about.links.qq = String(aboutLinks.qq || '');
      settings.about.links.wechat = String(aboutLinks.wechat || '');
      settings.about.links.email = String(aboutLinks.email || '');
      settings.about.cards = Array.isArray(data.about.cards) ? data.about.cards.map(function(c) {
        return { title: String(c.title || ''), content: String(c.content || '') };
      }) : [];

      var wf = data.about.workflow && typeof data.about.workflow === 'object' ? data.about.workflow : {};
      settings.about.workflow = {
        eyebrow: String(wf.eyebrow || ''),
        title: String(wf.title || ''),
        commands: String(wf.commands || ''),
        stack1Title: String(wf.stack1Title || ''),
        stack2Title: String(wf.stack2Title || ''),
        stack1Items: String(wf.stack1Items || ''),
        stack2Items: String(wf.stack2Items || '')
      };

      settings.about.timeline = (data.about.timeline && typeof data.about.timeline === 'object') ? {
        eyebrow: String(data.about.timeline.eyebrow || ''),
        title: String(data.about.timeline.title || ''),
        items: Array.isArray(data.about.timeline.items) ? data.about.timeline.items.map(function(t) {
          return { date: String(t.date || ''), title: String(t.title || ''), desc: String(t.desc || '') };
        }) : []
      } : { eyebrow: '', title: '', items: [] };

      settings.about.socialButtons = Array.isArray(data.about.socialButtons) ? data.about.socialButtons.map(function(b) {
        return { id: String(b.id || ''), enabled: !!b.enabled };
      }) : [];
    }

    console.log('[server] Final settings.about.socialButtons:', JSON.stringify(settings.about.socialButtons));
    writeSiteSettings(settings);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, message: '页面设置已保存', settings: settings }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '保存失败: ' + err.message }));
  }
}

function handleUploadSiteAvatar(req, res) {
  var filename = req.headers['x-filename'];
  try { filename = decodeURIComponent(filename || ''); } catch (e) {}
  if (!filename) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '缺少文件名' }));
    return;
  }

  var ext = path.extname(filename || '').toLowerCase();
  if (!ext) ext = '.png';

  if (!/^\.(png|jpg|jpeg|gif|webp|svg|bmp)$/.test(ext)) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '仅支持图片格式' }));
    return;
  }

  var base = path.basename(filename, ext);
  base = sanitizeFilename(base) || 'avatar';
  var safeName = 'about_avatar_' + Date.now() + '_' + base + ext;

  ensureDir(AVATARS_DIR);
  var targetPath = path.join(AVATARS_DIR, safeName);

  var chunks = [];
  req.on('data', function(chunk) { chunks.push(chunk); });
  req.on('end', function() {
    try {
      var buf = Buffer.concat(chunks);
      fs.writeFileSync(targetPath, buf);
      var relPath = 'assets/avatars/' + safeName;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, avatarSrc: relPath }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: '头像保存失败: ' + err.message }));
    }
  });
  req.on('error', function() {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '头像上传失败' }));
  });
}

function handleUploadSiteAsset(req, res) {
  var filename = req.headers['x-filename'];
  try { filename = decodeURIComponent(filename || ''); } catch (e) {}
  var assetType = String(req.headers['x-asset-type'] || '').trim();

  if (!filename) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '缺少文件名' }));
    return;
  }

  var ext = path.extname(filename || '').toLowerCase();
  if (!ext) ext = '.png';

  var validExts = {
    'site-favicon': /^\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/,
    'home-brand-icon': /^\.(png|jpg|jpeg|gif|webp|svg)$/
  };
  var allowed = validExts[assetType];
  if (!allowed || !allowed.test(ext)) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '不支持的文件格式' }));
    return;
  }

  var base = path.basename(filename, ext);
  base = sanitizeFilename(base) || 'asset';
  var safeName = assetType + '_' + Date.now() + '_' + base + ext;

  ensureDir(AVATARS_DIR);
  var targetPath = path.join(AVATARS_DIR, safeName);

  var chunks = [];
  req.on('data', function(chunk) { chunks.push(chunk); });
  req.on('end', function() {
    try {
      var buf = Buffer.concat(chunks);
      fs.writeFileSync(targetPath, buf);
      var relPath = 'assets/avatars/' + safeName;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, assetSrc: relPath }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: '资源保存失败: ' + err.message }));
    }
  });
  req.on('error', function() {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '上传失败' }));
  });
}

async function handleListProjects(req, res) {
  var projects = rebuildProjectsManifest();
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: true, projects: projects }));
}

async function handleGetProject(req, res, projectId) {
  var raw = loadProjectDetail(projectId);
  if (!raw) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '项目不存在' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: true, project: normalizeProjectDetail(raw, projectId) }));
}

async function handleSaveProject(req, res) {
  try {
    var data = await readRequestBody(req);
    if (!data || typeof data !== 'object') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: '参数错误' }));
      return;
    }

    var project = normalizeProjectDetail(data.project || data, data.id || data.projectId || '');
    if (!project.id || !project.title) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: '缺少项目 ID 或标题' }));
      return;
    }

    saveProjectDetail(project.id, project);
    rebuildProjectsManifest();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, message: '项目已保存', project: project }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '项目保存失败: ' + err.message }));
  }
}

async function handleDeleteProject(req, res, projectId) {
  var projectDir = path.join(PROJECTS_DIR, projectId);
  if (!fs.existsSync(projectDir)) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '项目不存在' }));
    return;
  }

  removeDirRecursive(projectDir);
  rebuildProjectsManifest();
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: true, message: '项目已删除' }));
}

function handleUploadProjectImage(req, res) {
  var projectId = sanitizeFilename(String(req.headers['x-project-id'] || '').trim());
  var filename = req.headers['x-filename'];
  try { filename = decodeURIComponent(filename || ''); } catch (e) {}

  if (!projectId || !filename) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '缺少项目ID或文件名' }));
    return;
  }

  var ext = path.extname(filename).toLowerCase() || '.png';
  if (!/^\.(png|jpg|jpeg|gif|webp|svg|bmp)$/.test(ext)) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '仅支持图片格式' }));
    return;
  }

  var base = sanitizeFilename(path.basename(filename, ext)) || 'image';
  var projectImageDir = path.join(PROJECTS_DIR, projectId, 'images');
  ensureDir(projectImageDir);
  var safeName = base + '_' + Date.now() + ext;
  var targetPath = path.join(projectImageDir, safeName);
  var chunks = [];

  req.on('data', function(chunk) { chunks.push(chunk); });
  req.on('end', function() {
    try {
      fs.writeFileSync(targetPath, Buffer.concat(chunks));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, imageSrc: 'images/' + safeName }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: '图片保存失败: ' + err.message }));
    }
  });
  req.on('error', function() {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: '图片上传失败' }));
  });
}

// ==========================================================
//  静态文件服务
// ==========================================================

function serveStatic(req, res, filePath) {
  var resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, function(err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 - 页面未找到</h1>');
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    res.end(data);
  });
}

// ==========================================================
//  HTTP 服务器
// ==========================================================

var server = http.createServer(function(req, res) {
  var parsedUrl = url.parse(req.url, true);
  var pathname = decodeURIComponent(parsedUrl.pathname);
  var method = req.method.toUpperCase();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, x-filename, x-article-id, x-upload-session');

  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (pathname === '/api/articles/save' && method === 'POST') { handleSaveArticle(req, res); return; }
  if (pathname === '/api/articles/upload-image' && method === 'POST') { handleUploadImage(req, res); return; }
  if (pathname === '/api/build-manifest' && method === 'POST') { handleBuildManifest(req, res); return; }
  if (pathname === '/api/site-settings' && method === 'GET') { handleGetSiteSettings(req, res); return; }
  if (pathname === '/api/site-settings' && method === 'POST') { handleSaveSiteSettings(req, res); return; }
  if (pathname === '/api/site-settings/upload-avatar' && method === 'POST') { handleUploadSiteAvatar(req, res); return; }
  if (pathname === '/api/site-settings/upload-asset' && method === 'POST') { handleUploadSiteAsset(req, res); return; }
  if (pathname === '/api/projects' && method === 'GET') { handleListProjects(req, res); return; }
  if (pathname === '/api/projects/save' && method === 'POST') { handleSaveProject(req, res); return; }
  if (pathname === '/api/projects/upload-image' && method === 'POST') { handleUploadProjectImage(req, res); return; }

  var deleteMatch = pathname.match(/^\/api\/articles\/(.+)$/);
  if (deleteMatch && method === 'DELETE') { handleDeleteArticle(req, res, deleteMatch[1]); return; }
  var projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch && method === 'GET') { handleGetProject(req, res, projectMatch[1]); return; }
  if (projectMatch && method === 'DELETE') { handleDeleteProject(req, res, projectMatch[1]); return; }

  var filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  serveStatic(req, res, filePath);
});

// 启动时清理临时上传目录
if (fs.existsSync(TMP_DIR)) {
  removeDirRecursive(TMP_DIR);
}

runBuildManifest();

server.listen(PORT, function() {
  console.log('[server] 博客服务已启动: http://localhost:' + PORT);
  console.log('[server] 管理后台: http://localhost:' + PORT + '/admin/');
});
