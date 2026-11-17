const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
test('live app dependency graph has no legacy database or device business-data persistence', () => {
  const visited = new Set();
  function inspect(file) {
    const absolute = path.resolve(file);
    if (visited.has(absolute)) return;
    visited.add(absolute);
    const relative = path.relative(process.cwd(), absolute).replaceAll('\\', '/');
    assert.ok(
      ![
        'src/services/legacyImport.js',
        'src/repositories/fridgeRepository.js',
        'src/database/schema.js',
        'src/data/mockData.js',
      ].includes(relative),
      relative + ' must not be reachable from the live app',
    );
    const source = fs.readFileSync(absolute, 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
    for (const node of ast.program.body) {
      if (node.type !== 'ImportDeclaration') continue;
      const request = node.source.value;
      if (request === 'expo-sqlite/kv-store')
        assert.equal(
          relative,
          'src/services/supabase.js',
          'Only the authentication session may use SDK device storage',
        );
      if (request.startsWith('.')) {
        let next = path.resolve(path.dirname(absolute), request);
        if (!path.extname(next)) next += '.js';
        if (next.endsWith('.js')) inspect(next);
      }
    }
  }
  inspect('App.js');
  assert.ok(visited.size > 35);
});
test('account screen contains account management rather than backup/export controls', () => {
  const source = fs.readFileSync('src/screens/profile/ProfileScreen.js', 'utf8');
  assert.doesNotMatch(
    source,
    /readLegacySnapshot|Share\.share|importLegacy|useFridgeViewModel|lastSynced/,
  );
  for (const route of ['EditProfile', 'ChangeEmail', 'ChangePassword'])
    assert.ok(source.includes(route));
  assert.match(source, /chooseAvatar/);
});
