const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const childProcess = require('child_process');
const UglifyJS = require('uglify-js');
const esbuild = require('esbuild');
const find = require('fast-glob');

const args = process.argv.slice(2);
const elmInputFiles = args.flatMap((arg) => find.sync(arg)).map((file) => path.resolve(file));

if (elmInputFiles.length === 0) {
  console.error(
    'Please supply one or more Elm input files. They will be compiled into one .js file'
  );
  console.error('You can also supply a glob pattern, e.g. `src/*.elm`');
  process.exit(1);
}

const results = 'results';
try {
  fs.mkdirSync(results);
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.error(`Could not create folder '${results}'`);
    console.error(err);
    process.exit(1);
  }
}

const pureFuncs = 'F2,F3,F4,F5,F6,F7,F8,F9,A2,A3,A4,A5,A6,A7,A8,A9'.split(',');

function findElmJsonFolder(dir) {
  return fs.existsSync(path.join(dir, 'elm.json'))
    ? dir
    : dir === path.parse(dir).root
    ? undefined
    : findElmJsonFolder(path.dirname(dir));
}

function elmMake(elmInputFiles) {
  const cwd = findElmJsonFolder(path.dirname(elmInputFiles[0]));
  const output = path.resolve(path.join(results, 'iife.js'));
  const elmArgs = ['make', '--optimize'].concat(elmInputFiles, ['--output', output]);
  console.log(`Running \`elm ${elmArgs.join(' ')}\` in ${cwd}`);
  // TODO make elm compiler configurable
  childProcess.spawnSync('elm', elmArgs, { cwd, stdio: 'inherit' });
}

// Create the Elm IIFE
elmMake(elmInputFiles);

// Minify Elm IIFE

// Minify Elm ESM

// Minify Elm IIFE, then convert it to ESM
// uglify-js does not work well on the Elm ESM, so this should give us better compression
