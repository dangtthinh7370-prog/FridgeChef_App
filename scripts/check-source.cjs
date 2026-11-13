const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const parser = require('@babel/parser');
const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : entry.name.endsWith('.js') ? [path.join(directory, entry.name)] : []);
const files = [path.join(root, 'App.js'), ...walk(path.join(root, 'src'))];
let failed = false;
for (const file of files) {
  try {
    const source = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
    babel.transformSync(source, { filename: file, configFile: false, babelrc: false, presets: ['babel-preset-expo'] });
    for (const node of ast.program.body) {
      if (node.type !== 'ImportDeclaration') continue;
      const request = node.source.value;
      if (request.startsWith('.')) {
        const absolute = path.resolve(path.dirname(file), request);
        if (![absolute, absolute + '.js', absolute + '.json', path.join(absolute, 'index.js')].some(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())) throw new Error('Missing local import: ' + request);
      } else {
        const name = request.startsWith('@') ? request.split('/').slice(0, 2).join('/') : request.split('/')[0];
        if (!pkg.dependencies[name] && !pkg.devDependencies[name]) throw new Error('Undeclared dependency: ' + name);
      }
    }
  } catch (error) { failed = true; console.error(path.relative(root, file) + ': ' + error.message); }
}
const config = require('../app.json').expo;
for (const asset of [config.icon, config.splash?.image, config.android?.adaptiveIcon?.foregroundImage, config.web?.favicon].filter(Boolean)) {
  if (!fs.existsSync(path.resolve(root, asset))) { failed = true; console.error('Missing asset: ' + asset); }
}
if (failed) process.exitCode = 1;
else console.log('Babel compilation, declared imports and app assets passed (' + files.length + ' files).');
