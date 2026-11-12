const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const cache = new Map();

// Compile the same model/repository files used by Metro; no test-only business logic.
module.exports = function loadSource(filename) {
  const absolute = path.resolve(__dirname, '..', filename);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const mod = { exports: {} };
  cache.set(absolute, mod);
  const { code } = babel.transformSync(fs.readFileSync(absolute, 'utf8'), {
    filename: absolute, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const localRequire = request => request.startsWith('.')
    ? module.exports(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(absolute), request)))
    : require(request);
  new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports);
  return mod.exports;
};
