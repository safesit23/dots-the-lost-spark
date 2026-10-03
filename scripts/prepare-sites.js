'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, {recursive: true});
for (const name of ['index.html', 'style.css', 'game.js']) {
  fs.copyFileSync(path.join(root, name), path.join(output, name));
}
console.log('Prepared the standalone DOTS game for Sites.');
