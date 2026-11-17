const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
module.exports = function createLoader(mocks) {
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(
      __dirname,
      '..',
      filename.endsWith('.js') ? filename : filename + '.js',
    );
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const mod = { exports: {} };
    cache.set(absolute, mod);
    const { code } = babel.transformSync(fs.readFileSync(absolute, 'utf8'), {
      filename: absolute,
      configFile: false,
      babelrc: false,
      plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
    });
    const localRequire = (request) => {
      if (Object.hasOwn(mocks, request)) return mocks[request];
      if (request.startsWith('.')) {
        const resolved = path.resolve(path.dirname(absolute), request);
        const relative = path
          .relative(path.resolve(__dirname, '..'), resolved)
          .replaceAll('\\', '/');
        if (Object.hasOwn(mocks, relative)) return mocks[relative];
        return load(relative);
      }
      return require(request);
    };
    new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports);
    return mod.exports;
  }
  return load;
};
