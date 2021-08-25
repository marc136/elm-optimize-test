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
  const start = Date.now();
  childProcess.spawnSync('elm', elmArgs, { cwd, stdio: 'inherit' });
  const end = Date.now();
  return {
    filepath: output,
    content: fs.readFileSync(output),
    size: fs.statSync(output).size,
    duration: (end - start) / 1000,
  };
}

// Create the Elm IIFE
const elm = {
  iife: elmMake(elmInputFiles),
};

// Minify Elm IIFE
// Copied from https://gist.github.com/lydell/b92ec8b6c7ae91945da10c814e565d5e (revision 5)
// TODO use the uglifyjs cli to directly operate on files?
const iife = {
  uglify: {
    'Remove whitespace and comments': () =>
      UglifyJS.minify(elm.iife.content.toString(), {
        compress: false,
        mangle: false,
      }).code,
    'Remove whitespace and comments, and mangle variable names': () =>
      UglifyJS.minify(elm.iife.content.toString(), {
        compress: false,
        mangle: true,
      }).code,
    'Elm Guide command (run UglifyJS twice: `compress` then `mangle`)': () => {
      const compressed = UglifyJS.minify(elm.iife.content.toString(), {
        compress: {
          pure_funcs: pureFuncs,
          pure_getters: true,
          unsafe_comps: true,
          unsafe: true,
        },
        mangle: false,
      }).code;
      return UglifyJS.minify(compressed, {
        compress: false,
        mangle: true,
      }).code;
    },
    'Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`)': () =>
      UglifyJS.minify(elm.iife.content.toString(), {
        compress: {
          pure_funcs: pureFuncs,
          pure_getters: true,
          unsafe_comps: true,
          unsafe: true,
        },
        mangle: {
          reserved: pureFuncs,
        },
      }).code,
    'Tweaked Elm Guide command (`passes: 2`)': () =>
      UglifyJS.minify(elm.iife.content.toString(), {
        compress: {
          pure_funcs: pureFuncs,
          pure_getters: true,
          unsafe_comps: true,
          unsafe: true,
          passes: 2,
        },
        mangle: {
          reserved: pureFuncs,
        },
      }).code,
    'Tweaked Elm Guide command (`passes: 3`)': () =>
      UglifyJS.minify(elm.iife.content.toString(), {
        compress: {
          pure_funcs: pureFuncs,
          pure_getters: true,
          unsafe_comps: true,
          unsafe: true,
          passes: 3,
        },
        mangle: {
          reserved: pureFuncs,
        },
      }).code,
    'UglifyJS tradeoff': () =>
      UglifyJS.minify(elm.iife.content.toString(), {
        compress: {
          ...Object.fromEntries(
            Object.entries(UglifyJS.default_options().compress).map(([key, value]) => [
              key,
              value === true ? false : value,
            ])
          ),
          pure_funcs: pureFuncs,
          pure_getters: true,
          join_vars: true,
          conditionals: true,
          unused: true,
        },
        mangle: {
          reserved: pureFuncs,
        },
      }).code,
  },
  'uglify+esbuild': {
    'Elm Guide compress with uglify-js, then minify with esbuild': () => {
      const compressed = UglifyJS.minify(elm.iife.content.toString(), {
        compress: {
          pure_funcs: pureFuncs,
          pure_getters: true,
          unsafe_comps: true,
          unsafe: true,
        },
        mangle: false,
      }).code;
      if (!compressed) throw 'uglify-js failed';
      return esbuild.transformSync(compressed, {
        minify: true,
        target: 'es2020',
      }).code;
    },
    'Compress partially with uglify-js, then minify with esbuild': () => {
      const compressed = UglifyJS.minify(elm.iife.content.toString(), {
        compress: {
          ...Object.fromEntries(
            Object.entries(UglifyJS.default_options().compress).map(([key, value]) => [
              key,
              value === true ? false : value,
            ])
          ),
          pure_funcs: pureFuncs,
          pure_getters: true,
          strings: true,
          sequences: true,
          merge_vars: true,
          switches: true,
          dead_code: true,
          if_return: true,
          inline: true,
          join_vars: true,
          reduce_vars: true,
          conditionals: true,
          collapse_vars: true,
          unused: true,
        },
        mangle: false,
      }).code;
      if (!compressed) throw 'uglify-js failed';
      return esbuild.transformSync(compressed, {
        minify: true,
        target: 'es2020',
      }).code;
    },
    'Compress partially with uglify-js (and `reduce_vars:false`), then minify with esbuild': () => {
      const compressed = UglifyJS.minify(elm.iife.content.toString(), {
        compress: {
          ...Object.fromEntries(
            Object.entries(UglifyJS.default_options().compress).map(([key, value]) => [
              key,
              value === true ? false : value,
            ])
          ),
          pure_funcs: pureFuncs,
          pure_getters: true,
          strings: true,
          sequences: true,
          merge_vars: true,
          switches: true,
          dead_code: true,
          if_return: true,
          inline: true,
          join_vars: true,
          conditionals: true,
          collapse_vars: true,
          unused: true,
        },
        mangle: false,
      }).code;
      if (!compressed) throw 'uglify-js failed';
      return esbuild.transformSync(compressed, {
        minify: true,
        target: 'es2020',
      }).code;
    },
  },
  esbuild: {
    minify: (outfile) => {
      esbuild.buildSync({
        entryPoints: [elm.iife.filepath],
        outfile,
        minify: true,
        pure: pureFuncs,
        target: 'es5',
        format: 'iife',
      });
    },
    'minify (transform API)': () =>
      esbuild.transformSync(elm.iife.content.toString(), {
        minify: true,
        pure: pureFuncs,
        target: 'es5',
        format: 'iife',
      }).code,
    'minifiy (with IIFE trick)': (outfile) => {
      const code = elm.iife.content.toString();
      const newCode = `var scope = window;${code.slice(
        code.indexOf('{') + 1,
        code.lastIndexOf('}')
      )}`;
      return esbuild.transformSync(newCode, {
        minify: true,
        pure: pureFuncs,
        target: 'es5',
        format: 'iife',
      }).code;
    },
  },
};

// Minify Elm ESM

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

const formats = {
  iife,
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
      const result = minify(outputfile);
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
