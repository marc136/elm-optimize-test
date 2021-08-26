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
  const cwd = findElmJsonFolder(path.dirname(elmInputFiles[0]));
  let output = path.resolve(path.join(results, 'iife.js'));
  const elmArgs = ['make', '--optimize'].concat(elmInputFiles, ['--output', output]);
  console.log(`Running \`elm ${elmArgs.join(' ')}\` in ${cwd}`);
  // TODO make elm compiler configurable
  let start = Date.now();
  childProcess.spawnSync('elm', elmArgs, { cwd, stdio: 'inherit' });
  let end = Date.now();
  const iife = {
    filepath: output,
    content: fs.readFileSync(output),
    size: fs.statSync(output).size,
    duration: (end - start) / 1000,
  };

  // Step 2: Transform IIFE to ESM
  output = path.resolve(path.join(results, 'esm.mjs'));
  start = Date.now();
  const iifeString = fs.readFileSync(iife.filepath, 'utf8');
  let code = iifeString
    .slice(iifeString.indexOf('function F('), iifeString.lastIndexOf(');}'))
    .replace('_Platform_export({', 'export const Elm = {');
  fs.writeFileSync(output, code, 'utf8');
  end = Date.now();

  const esm = {
    filepath: output,
    content: Buffer.from(code, 'utf8'),
    size: fs.statSync(output).size,
    duration: iife.duration + (end - start) / 1000,
  };

  return { iife, esm };
}

const elm = elmMake(elmInputFiles);

// Minify Elm IIFE
const iife = require('./minify/iife');

// Minify Elm ESM
const esm = require('./minify/esm');

// Minify Elm IIFE, then convert it to ESM
// uglify-js does not work well on the Elm ESM, so this should give us better compression

const KiB = 1024;
const MiB = 1024 * KiB;

function printSize(byteLength) {
  return byteLength >= MiB
    ? `${(byteLength / MiB).toFixed(2)}MiB`
    : `${(byteLength / KiB).toFixed(0)}KiB`;
}

function analyzeFile(filepath) {
  const buffer = fs.readFileSync(filepath);
  return {
    filepath,
    filename: path.basename(filepath),
    size: buffer.byteLength,
    gzipSize: zlib.gzipSync(buffer).byteLength,
  };
}

function printFileInfoForTable(filepath, title = '', duration = undefined) {
  const { filename, size, gzipSize } = analyzeFile(filepath);
  const s = isNaN(duration) || duration <= 0 ? '-' : duration.toFixed(1) + 's';
  const str = `|${filename}|${title}|${s}|${printSize(size)}|${printSize(gzipSize)}|`;
  console.log(str);
  return str;
}

printFileInfoForTable(elm.iife.filepath, 'elm make --optimize (for reference)', elm.iife.duration);
printFileInfoForTable(
  elm.esm.filepath,
  'elm make --optimize and convert to ESM (for reference)',
  elm.esm.duration
);

const formats = {
  iife,
  esm,
};

// TODO remove
// delete iife['uglify'];
// delete iife['uglify+esbuild'];

for (const [formatName, batch] of Object.entries(formats)) {
  for (const [groupName, group] of Object.entries(batch)) {
    Object.entries(group).forEach(([title, minify], index) => {
      const variantName = `${formatName} ${groupName} ${title}`;
      const outputfile = path.join(results, `${formatName}_${groupName}_${index}.js`);
      const start = Date.now();
      const result = minify(elm, outputfile);
      const end = Date.now();
      const duration = `${((end - start) / 1000).toFixed(1)}s`;

      if (typeof result === 'string') {
        fs.writeFileSync(outputfile, result, 'utf8');
      }
      const buffer = fs.readFileSync(outputfile);

      const size = printSize(buffer.byteLength);
      const gzipSize = printSize(zlib.gzipSync(buffer).byteLength);

      console.log(`|${path.basename(outputfile)}|${variantName}|${duration}|${size}|${gzipSize}|`);
    });
  }
}
