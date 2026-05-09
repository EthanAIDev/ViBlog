const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function run() {
  const scriptPath = path.join(__dirname, '..', 'script.js');
  const source = fs.readFileSync(scriptPath, 'utf8');

  const requestedUrls = [];
  let callIndex = 0;

  function FakeXMLHttpRequest() {
    this.status = 0;
    this.responseText = '';
    this.onload = null;
    this.onerror = null;
    this._url = '';
  }

  FakeXMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    requestedUrls.push(url);
  };

  FakeXMLHttpRequest.prototype.send = function() {
    const current = callIndex;
    callIndex += 1;

    setTimeout(() => {
      if (current === 0) {
        this.status = 200;
        this.responseText = '<!doctype html><html><body>fallback</body></html>';
        if (typeof this.onload === 'function') this.onload();
        return;
      }

      this.status = 200;
      this.responseText = JSON.stringify({
        about: {
          avatarSrc: 'assets/avatars/about_avatar_test.jpg'
        }
      });
      if (typeof this.onload === 'function') this.onload();
    }, 0);
  };

  const context = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    Promise,
    XMLHttpRequest: FakeXMLHttpRequest,
    document: {
      readyState: 'loading',
      addEventListener: function() {}
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'script.js' });

  assert.strictEqual(typeof context.loadSiteSettings, 'function', 'loadSiteSettings should exist');

  const loaded = await context.loadSiteSettings();

  assert.ok(loaded, 'Expected fallback settings to load');
  assert.strictEqual(
    loaded.about.avatarSrc,
    'assets/avatars/about_avatar_test.jpg',
    'Expected avatar from fallback site-settings.json payload'
  );
  assert.strictEqual(requestedUrls.length, 2, 'Expected API + static fallback requests');

  console.log('PASS loadSiteSettings fallback');
}

run().catch((err) => {
  console.error('FAIL loadSiteSettings fallback');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
