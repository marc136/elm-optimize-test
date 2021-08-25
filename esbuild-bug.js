// I created https://github.com/evanw/esbuild/issues/1551 for this problem

const esbuild = require('esbuild');
const fs = require('fs');
const os = require('os');

function print(caption, code) {
  console.log(caption, '\n```js\n', code.toString().trim(), '\n```\n');
}

const esm = `// as ESM
function unusedFn(a) {
    return a + 1;
}

const a = 5;
let b = 7;

export const c = 2;
`;

const iife = `// as IIFE
function unusedFn(a) {
    return a + 1;
}

const a = 5;
let b = 7;

window.c = 2;
`;

const options = {
  target: 'es2020',
  format: 'esm',
};

let result = esbuild.transformSync(iife, Object.assign({}, options, { format: 'iife' }));
print('Unused code is removed with format:iife', result.code);

result = esbuild.transformSync(esm, options);
print('Unused code is kept with format:esm', result.code);

const tmpFile = `${os.tmpdir()}/esbuild-test-${Date.now()}.js`;
fs.writeFileSync(tmpFile, esm, { encoding: 'utf8' });
esbuild.buildSync(
  Object.assign(options, {
    entryPoints: [tmpFile],
    outfile: tmpFile,
    allowOverwrite: true,
    bundle: true,
  })
);
result = fs.readFileSync(tmpFile, { encoding: 'utf8' });
fs.rmSync(tmpFile);
print('Unused code is removed with format:esm and bundle:true', result);
