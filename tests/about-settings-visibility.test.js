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

  const htmlClassList = createClassList(['about-pending-settings']);

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
      getElementById: function(id) {
        if (id === 'about') return { id: 'about' };
        return null;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'script.js' });

  assert.strictEqual(typeof context.markAboutSettingsReady, 'function', 'markAboutSettingsReady should exist');

  context.markAboutSettingsReady();

  assert.strictEqual(
    htmlClassList.contains('about-pending-settings'),
    false,
    'pending class should be removed'
  );
  assert.strictEqual(
    htmlClassList.contains('about-settings-ready'),
    true,
    'ready class should be added'
  );

  console.log('PASS about settings visibility state');
}

try {
  run();
} catch (err) {
  console.error('FAIL about settings visibility state');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
