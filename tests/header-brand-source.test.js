const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createBrandDom() {
  const brandTextNode = { textContent: 'Default Name' };
  const brandMarkNode = { textContent: 'L.' };
  const iconNode = { src: '', style: { display: '' } };

  const brandLink = {
    querySelector(selector) {
      if (selector === '.brand-icon-img') return iconNode;
      if (selector === '.brand-mark') return brandMarkNode;
      if (selector === '.brand-text') return brandTextNode;
      return null;
    },
    insertBefore() {}
  };

  const faviconNode = { href: '', setAttribute(k, v) { this[k] = v; } };
  const metaDescNode = { content: '', setAttribute(k, v) { this[k] = v; } };
  const ogDescNode = { content: '', setAttribute(k, v) { this[k] = v; } };
  const ogTitleNode = { content: '', setAttribute(k, v) { this[k] = v; } };
  const ogImageNode = { content: '', setAttribute(k, v) { this[k] = v; } };

  const document = {
    readyState: 'loading',
    title: '',
    addEventListener() {},
    querySelector(selector) {
      if (selector === '.brand') return brandLink;
      if (selector === 'link[rel="icon"]') return faviconNode;
      if (selector === 'meta[name="description"]') return metaDescNode;
      if (selector === 'meta[property="og:description"]') return ogDescNode;
      if (selector === 'meta[property="og:title"]') return ogTitleNode;
      if (selector === 'meta[property="og:image"]') return ogImageNode;
      return null;
    },
    createElement() {
      return { className: '', src: '', alt: '', style: {} };
    }
  };

  return { document, iconNode, brandTextNode, brandMarkNode };
}

function loadContext() {
  const scriptPath = path.join(__dirname, '..', 'script.js');
  const source = fs.readFileSync(scriptPath, 'utf8');
  const dom = createBrandDom();

  const context = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    Promise,
    document: dom.document
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'script.js' });
  return { context, dom };
}

function runHeaderBrandMarkPreferredTest() {
  const { context, dom } = loadContext();

  vm.runInContext(`siteSettings = {
    site: { headerBrandMark: 'E.', headerBrandName: 'Site Brand' },
    home: { brandName: 'Home Brand' }
  };`, context);

  context.applySiteSettings();

  assert.strictEqual(dom.brandMarkNode.textContent, 'E.', 'should apply site.headerBrandMark');
  assert.strictEqual(dom.brandTextNode.textContent, 'Site Brand', 'should apply site.headerBrandName');
  assert.strictEqual(dom.iconNode.style.display, 'none', 'should hide image icon');
}

function runHeaderBrandMarkFallbackTest() {
  const { context, dom } = loadContext();

  vm.runInContext(`siteSettings = {
    site: { headerBrandMark: '', headerBrandName: '' },
    home: { brandName: 'Home Brand' }
  };`, context);

  context.applySiteSettings();

  assert.strictEqual(dom.brandMarkNode.textContent, 'L.', 'should keep default mark when not configured');
  assert.strictEqual(dom.brandTextNode.textContent, 'Home Brand', 'should fallback to home.brandName');
}

try {
  runHeaderBrandMarkPreferredTest();
  runHeaderBrandMarkFallbackTest();
  console.log('PASS header brand mark + name behavior');
} catch (err) {
  console.error('FAIL header brand mark + name behavior');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
