const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createClassList(initial) {
  const set = new Set(initial || []);
  return {
    add: (name) => set.add(name),
    remove: (name) => set.delete(name),
    contains: (name) => set.has(name)
  };
}

function run() {
  const scriptPath = path.join(__dirname, '..', 'script.js');
  const source = fs.readFileSync(scriptPath, 'utf8');

  const htmlClassList = createClassList(['header-pending-settings']);

  const context = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    Promise,
    document: {
      readyState: 'loading',
      addEventListener: function() {},
      documentElement: { classList: htmlClassList },
      querySelector: function(selector) {
        if (selector === '.brand') return { className: 'brand' };
        return null;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'script.js' });

  assert.strictEqual(typeof context.markHeaderSettingsReady, 'function', 'markHeaderSettingsReady should exist');

  context.markHeaderSettingsReady();

  assert.strictEqual(
    htmlClassList.contains('header-pending-settings'),
    false,
    'header pending class should be removed'
  );
  assert.strictEqual(
    htmlClassList.contains('header-settings-ready'),
    true,
    'header ready class should be added'
  );

  console.log('PASS header settings visibility state');
}

try {
  run();
} catch (err) {
  console.error('FAIL header settings visibility state');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
