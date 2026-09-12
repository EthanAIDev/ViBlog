/**
 * ViBlog 纯静态文件服务器
 * 仅提供静态文件服务，无任何写接口；内容维护请直接编辑文件后运行 `npm run build-manifest`。
 */
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

var PORT = process.env.PORT || 3000;
var ROOT = __dirname;

var MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf'
};

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

var NO_CACHE = 'no-cache, must-revalidate';
// 未做文件指纹（hash），缓存时间不宜过长，避免发版后浏览器停留在旧资源
var ASSET_CACHE = 'public, max-age=3600';

function cacheControlFor(filePath) {
  var ext = path.extname(filePath).toLowerCase();
  if (ext === '.html' || ext === '.json' || ext === '.md') return NO_CACHE;
  return ASSET_CACHE;
}

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>404</title>' +
    '<style>body{background:#09090b;color:#f2f2f5;font-family:ui-monospace,Consolas,monospace;' +
    'display:grid;place-items:center;min-height:100vh;margin:0}div{text-align:center}' +
    'h1{font-size:64px;margin:0 0 8px;background:linear-gradient(100deg,#8b7bff,#3ddcff);' +
    '-webkit-background-clip:text;background-clip:text;color:transparent}' +
    'p{color:#8b8b93;margin:0 0 24px}a{color:#3ddcff;text-decoration:none}</style></head>' +
    '<body><div><h1>404</h1><p>$ cat ' +
    'page.notfound<br>路径不存在，或内容尚未发布。</p><a href="/">&larr; 返回首页</a></div></body></html>'
  );
}

var server = http.createServer(function (req, res) {
  var pathname;
  try {
    pathname = decodeURIComponent(url.parse(req.url).pathname);
  } catch (e) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  var filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);

  // 目录访问回退到 index.html
  try {
    if (fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) {
    // 文件不存在，走下方统一 404
  }

  // 越界检查：解析后的真实路径必须仍在项目根目录内
  var resolved = path.resolve(filePath);
  if (path.relative(ROOT, resolved).startsWith('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (req.method === 'HEAD') {
    res.writeHead(200, { 'Content-Type': getMimeType(resolved) });
    res.end();
    return;
  }

  fs.readFile(resolved, function (err, data) {
    if (err) {
      send404(res);
      return;
    }
    res.writeHead(200, {
      'Content-Type': getMimeType(resolved),
      'Cache-Control': cacheControlFor(resolved)
    });
    res.end(data);
  });
});

server.listen(PORT, function () {
  console.log('[server] ViBlog 纯静态服务已启动: http://localhost:' + PORT);
});
