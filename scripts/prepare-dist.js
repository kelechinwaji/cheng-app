#!/usr/bin/env node
/**
 * Some linked Vercel projects use Root Directory "dist".
 * Generate a deployable copy at build time (dist/ is gitignored).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');

const copyFile = (rel) => {
  const src = path.join(root, rel);
  const dest = path.join(out, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
};

const copyDir = (rel) => {
  const src = path.join(root, rel);
  const dest = path.join(out, rel);
  fs.cpSync(src, dest, { recursive: true });
};

if (fs.existsSync(out)) {
  fs.rmSync(out, { recursive: true, force: true });
}

copyFile('package.json');
copyFile('package-lock.json');
copyFile('server.js');
copyFile('index.js');
copyFile('vercel.json');
copyDir('src');
copyDir('public');

// Dist-root Vercel projects: install/build from parent, run app from dist/.
const distVercel = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: 'express',
  installCommand: 'cd .. && npm install',
  buildCommand: 'cd .. && npm run build',
  env: {
    DATA_DIR: '/tmp/cheng-ledger-data',
  },
};
fs.writeFileSync(path.join(out, 'vercel.json'), JSON.stringify(distVercel, null, 2));

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const distPkg = {
  name: rootPkg.name,
  version: rootPkg.version,
  private: true,
  main: 'server.js',
  engines: rootPkg.engines,
  scripts: { start: 'node server.js' },
  dependencies: rootPkg.dependencies,
  optionalDependencies: rootPkg.optionalDependencies,
};
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(distPkg, null, 2));

console.log('prepare-dist: wrote', out);
