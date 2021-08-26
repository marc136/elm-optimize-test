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

function findElmJsonFolder(dir) {
  return fs.existsSync(path.join(dir, 'elm.json'))
    ? dir
    : dir === path.parse(dir).root
    ? undefined
    : findElmJsonFolder(path.dirname(dir));
}

function elmMake(elmInputFiles) {
  // Step 1: Compile Elm to IIFE
  const elmJsonDir = findElmJsonFolder(path.dirname(elmInputFiles[0]));
  let output = path.resolve(path.join(results, 'iife.js'));
  const elmArgs = ['make', '--optimize'].concat(elmInputFiles, ['--output', output]);
  console.log(`Running \`elm ${elmArgs.join(' ')}\` in ${elmJsonDir}`);
  // TODO make elm compiler configurable
  let start = Date.now();
  childProcess.spawnSync('elm', elmArgs, { cwd: elmJsonDir, stdio: 'inherit' });
  let end = Date.now();

  const iife = analyzeFile('elm make --optimize (for reference)', path.relative(__dirname, output));
  iife.duration = (end - start) / 1000;

  // Step 2: Transform IIFE to ESM
  output = path.resolve(path.join(results, 'esm.mjs'));
  start = Date.now();
  const iifeString = fs.readFileSync(iife.filepath, 'utf8');
  let code = iifeString
    .slice(iifeString.indexOf('function F('), iifeString.lastIndexOf(');}'))
    .replace('_Platform_export({', 'export const Elm = {');
  fs.writeFileSync(output, code, 'utf8');
  end = Date.now();

  const esm = analyzeFile(
    'elm make --optimize and convert to ESM (for reference)',
    path.relative(__dirname, output)
  );
  esm.duration = iife.duration + (end - start) / 1000;

  return { iife, esm };
}

const KiB = 1024;
const MiB = 1024 * KiB;

function printSize(byteLength) {
  return byteLength >= MiB
    ? `${(byteLength / MiB).toFixed(2)}MiB`
    : `${(byteLength / KiB).toFixed(0)}KiB`;
}

/**
 * The result of minifying the code with one variant
 * @typedef {Object} VariantInfo
 * @property {string} filepath
 * @property {string} filename
 * @property {string} title
 * @property {number|undefined} duration
 * @property {number} size
 * @property {number} gzipSize
 */

/**
 *
 * @param {string} title
 * @param {string} filepath
 * @returns VariantInfo
 */
function analyzeFile(title, filepath) {
  const buffer = fs.readFileSync(filepath);
  return {
    title,
    filepath,
    filename: path.basename(filepath),
    content: buffer,
    size: buffer.byteLength,
    gzipSize: zlib.gzipSync(buffer).byteLength,
    duration: 0,
  };
}

/**
 *
 * @param {VariantInfo} param0
 * @returns string
 */
function variantInfoToString({ filename, title, duration, size, gzipSize }) {
  const s = isNaN(duration) || duration <= 0 ? '-' : `${duration.toFixed(1)}s`;
  return `|${filename}|${title}|${s}|${printSize(size)}|${printSize(gzipSize)}|`;
}

//
//
// START OF PROGRAM
//
//

const elm = elmMake(elmInputFiles);

const formats = {
  iife: require('./minify/iife'),
  esm: require('./minify/esm'),
  // TODO Minify Elm IIFE, then convert it to ESM
};

/** @type Map<string,VariantInfelm o> */
const progress = new Map();

// print lines for the uncompressed elm compiler output
for (const variant of Object.values(elm)) {
  console.log(variantInfoToString(variant));
}

// TODO remove
delete formats.iife;
delete formats.esm.uglify;
// delete iife['uglify'];
// delete iife['uglify+esbuild'];

for (const [formatName, batch] of Object.entries(formats)) {
  for (const [groupName, group] of Object.entries(batch)) {
    Object.entries(group).forEach(([title, minify], index) => {
      const variantName = `${formatName} ${groupName} ${title}`;
      const filename = `${formatName}_${groupName}_${index}.js`;
      const outputfile = path.join(results, filename);
      const start = Date.now();
      const result = minify({ elm, progress }, outputfile);
      const end = Date.now();

      if (typeof result === 'string') {
        fs.writeFileSync(outputfile, result, 'utf8');
      }
      const buffer = fs.readFileSync(outputfile);
      const stat = {
        title: variantName,
        filepath: outputfile,
        filename,
        duration: (end - start) / 1000,
        size: buffer.byteLength,
        gzipSize: zlib.gzipSync(buffer).byteLength,
      };
      console.log(variantInfoToString(stat));
      progress.set(filename, stat);
    });
  }
}

function dropContent(a) {
  delete a.content;
  return a;
}
const arr = Array.from(Object.values(elm)).concat(Array.from(progress.values())).map(dropContent);
fs.writeFileSync(path.join(results, 'results.json'), JSON.stringify(arr, undefined, 2));
