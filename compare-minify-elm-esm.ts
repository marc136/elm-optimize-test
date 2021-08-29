import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import childProcess from 'child_process';
import find from 'fast-glob';

import { ElmVariants, VariantInfo, VariantInfoWithContent, ToolVariants } from './minify/common';
import { iifeToEsm } from './minify/iifeThenEsm';
import iifeTools from './minify/iife';
import esmTools from './minify/esm';

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

function findElmJsonFolder(dir: string): string | undefined {
  return fs.existsSync(path.join(dir, 'elm.json'))
    ? dir
    : dir === path.parse(dir).root
    ? undefined
    : findElmJsonFolder(path.dirname(dir));
}

function elmMake(elmInputFiles: string[]): ElmVariants {
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

  // TODO Step 3: Minor change to facilitate IIFE compression and then conversion to ESM
  // bypass scope wth code.replace('_Platform_export({', 'window.Elm = {`)

  return { iife, esm };
}

const KiB = 1024;
const MiB = 1024 * KiB;

function printSize(byteLength: number): string {
  return byteLength >= MiB
    ? `${(byteLength / MiB).toFixed(2)}MiB`
    : `${(byteLength / KiB).toFixed(0)}KiB`;
}

function analyzeFile(
  title: string,
  filepath: string,
  duration: number = 0
): VariantInfoWithContent {
  const buffer = fs.readFileSync(filepath);
  return {
    title,
    filepath,
    filename: path.basename(filepath),
    content: buffer,
    size: buffer.byteLength,
    gzipSize: zlib.gzipSync(buffer).byteLength,
    duration,
  };
}

/**
 *
 * @param {VariantInfo} param0
 * @returns string
 */
function variantInfoToString({ filename, title, duration, size, gzipSize }: VariantInfo) {
  const s = isNaN(duration) || duration <= 0 ? '-' : `${duration.toFixed(1)}s`;
  return `|${filename}|${title}|${s}|${printSize(size)}|${printSize(gzipSize)}|`;
}

type Progress = Map<string, VariantInfo>;

async function minifyWithAllVariants(formats: Formats): Promise<Progress> {
  const progress: Progress = new Map();

  for (const [formatName, tools] of Object.entries(formats)) {
    for (const [toolName, variants] of Object.entries(tools)) {
      for (const variant of variants) {
        const variantName = `${formatName} ${toolName} ${variant.description}`;
        const ext = formatName === 'esm' ? 'mjs' : 'js';
        const filename = `${formatName}_${toolName}_${variant.key}.${ext}`;
        const outputfile = path.join(results, filename);
        const start = Date.now();
        const result = await variant.transform(elm, outputfile, progress);
        const end = Date.now();

        if (typeof result === 'string' && result.length > 10) {
          fs.writeFileSync(outputfile, result, 'utf8');
        }

        const stat = analyzeFile(variantName, outputfile, (end - start) / 1000);
        console.log(variantInfoToString(stat));
        progress.set(filename, stat);
      }
    }
  }
  return progress;
}

function convertIifeToEsm(progress: Progress) {
  const converted = [];
  const m = new Map();

  for (const [filename, stat] of progress) {
    if (
      !filename.startsWith('iife') ||
      // esbuild can directly create ESM with the same size as the IIFE, so we don't need to convert those
      filename.startsWith('iife_esbuild')
    ) {
      continue;
    }

    try {
      const start = Date.now();
      const filepath = iifeToEsm(stat.filepath);
      const end = Date.now();

      const result = analyzeFile(
        stat.title.replace('iife', 'iifeThenEsm'),
        filepath,
        stat.duration + (end - start) / 1000
      );
      console.log(variantInfoToString(result));
      converted.push(result);
    } catch (err) {
      console.error(`Could not convert ${filename} to an ESM.`);
      console.error(err);
    }
  }
  converted.forEach((stat) => progress.set(stat.filename, stat));
  return progress;
}

function persistResults(progress: Progress) {
  function dropContent(a: { content: any }) {
    delete a.content;
    return a;
  }
  const arr = Array.from(Object.values(elm)).concat(Array.from(progress.values())).map(dropContent);
  fs.writeFileSync(path.join(results, 'results.json'), JSON.stringify(arr, undefined, 2));

  fs.copyFileSync('template.html', path.join(results, 'results.html'));
}

//
//
// START OF PROGRAM
//
//

const elm = elmMake(elmInputFiles);

interface Formats {
  iife: ToolVariants;
  esm: ToolVariants;
  [key: string]: ToolVariants;
}
const formats: Formats = {
  iife: iifeTools,
  esm: esmTools,
};

// print lines for the uncompressed elm compiler output
for (const variant of Object.values(elm)) {
  console.log(variantInfoToString(variant));
}

// TODO remove
// delete formats.iife;
// delete formats.esm.uglify;
// delete formats.iife.uglify;
// delete formats.iife['uglify+esbuild'];
// delete formats.iife.closure;
// delete formats.esm;

minifyWithAllVariants(formats).then(convertIifeToEsm).then(persistResults);
