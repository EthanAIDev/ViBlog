/**
 * gen-favicon.js — 将 ViBlog logo（渐变 V + 终端光标）栅格化为 PNG
 * 零依赖：手写多边形光栅化 + PNG 编码（node 内置 zlib）。
 * 用法：node scripts/gen-favicon.js
 */
var fs = require('fs');
var zlib = require('zlib');
var path = require('path');

var OUT_DIR = path.join(__dirname, '..', 'assets', 'logo');

// ---------- PNG 编码 ----------
var CRC_TABLE = (function () {
  var table = new Int32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  var c = 0xffffffff;
  for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  var len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  var body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  var crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  var sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  var raw = Buffer.alloc(height * (1 + width * 4));
  for (var y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------- 图形定义（与 assets/logo/logo-mark.svg 一致，64 视口） ----------
var BG = [16, 16, 20];          // #101014
var CYAN = [61, 220, 255];      // #3DDCFF
var VIOLET = [139, 123, 255];   // #8B7BFF
var V_POINTS = [
  [10, 16], [26.2, 48], [33.8, 48], [49, 16],
  [40.4, 16], [30, 37.2], [19.6, 16]
];
var V_BBOX = { x0: 10, y0: 16, x1: 49, y1: 48 };
var CURSOR = { x: 51, y: 40, w: 9, h: 8, r: 1.6 };
var TILE = { x0: 0, y0: 0, x1: 64, y1: 64, r: 15 };

function inRoundedRect(x, y, r0) {
  if (x < r0.x0 || x > r0.x1 || y < r0.y0 || y > r0.y1) return false;
  var cx = Math.max(r0.x0 + r0.r, Math.min(x, r0.x1 - r0.r));
  var cy = Math.max(r0.y0 + r0.r, Math.min(y, r0.y1 - r0.r));
  var dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r0.r * r0.r || (x >= r0.x0 + r0.r && x <= r0.x1 - r0.r) || (y >= r0.y0 + r0.r && y <= r0.y1 - r0.r);
}

function inPolygon(x, y, pts) {
  var inside = false;
  for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function gradientColor(x, y) {
  var t = ((x - V_BBOX.x0) / (V_BBOX.x1 - V_BBOX.x0) + (y - V_BBOX.y0) / (V_BBOX.y1 - V_BBOX.y0)) / 2;
  t = Math.max(0, Math.min(1, t));
  return [
    Math.round(VIOLET[0] + (CYAN[0] - VIOLET[0]) * t),
    Math.round(VIOLET[1] + (CYAN[1] - VIOLET[1]) * t),
    Math.round(VIOLET[2] + (CYAN[2] - VIOLET[2]) * t)
  ];
}

function inCursor(x, y) {
  if (x < CURSOR.x || x > CURSOR.x + CURSOR.w || y < CURSOR.y || y > CURSOR.y + CURSOR.h) return false;
  var cx = Math.max(CURSOR.x + CURSOR.r, Math.min(x, CURSOR.x + CURSOR.w - CURSOR.r));
  var cy = Math.max(CURSOR.y + CURSOR.r, Math.min(y, CURSOR.y + CURSOR.h - CURSOR.r));
  var dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= CURSOR.r * CURSOR.r || (x >= CURSOR.x + CURSOR.r && x <= CURSOR.x + CURSOR.w - CURSOR.r) || (y >= CURSOR.y + CURSOR.r && y <= CURSOR.y + CURSOR.h - CURSOR.r);
}

function sample(x, y) {
  if (!inRoundedRect(x, y, TILE)) return [0, 0, 0, 0];
  if (inPolygon(x, y, V_POINTS)) {
    var c = gradientColor(x, y);
    return [c[0], c[1], c[2], 255];
  }
  if (inCursor(x, y)) return [CYAN[0], CYAN[1], CYAN[2], 255];
  return [BG[0], BG[1], BG[2], 255];
}

function render(size) {
  var rgba = Buffer.alloc(size * size * 4);
  var S = 3; // 3x3 超采样抗锯齿
  var scale = 64 / size;
  for (var py = 0; py < size; py++) {
    for (var px = 0; px < size; px++) {
      var r = 0, g = 0, b = 0, a = 0, n = 0;
      for (var sy = 0; sy < S; sy++) {
        for (var sx = 0; sx < S; sx++) {
          var p = sample((px + (sx + 0.5) / S) * scale, (py + (sy + 0.5) / S) * scale);
          // 透明背景与底色混合：按 alpha 叠加到透明
          r += p[0] * p[3]; g += p[1] * p[3]; b += p[2] * p[3]; a += p[3];
          n++;
        }
      }
      var idx = (py * size + px) * 4;
      if (a > 0) {
        rgba[idx] = Math.round(r / a);
        rgba[idx + 1] = Math.round(g / a);
        rgba[idx + 2] = Math.round(b / a);
        rgba[idx + 3] = Math.round(a / n);
      }
    }
  }
  return encodePng(size, size, rgba);
}

[64, 256].forEach(function (size) {
  var file = path.join(OUT_DIR, 'favicon-' + size + '.png');
  fs.writeFileSync(file, render(size));
  console.log('[gen-favicon] ' + file + ' (' + fs.statSync(file).size + ' bytes)');
});
