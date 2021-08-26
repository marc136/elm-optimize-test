const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const childProcess = require('child_process');
const UglifyJS = require('uglify-js');
const esbuild = require('esbuild');
const { pureFuncs } = require('./common');

/**
 * Minify Elm ESM
 */
const variants = {
  uglify: {
    'UglifyJS tradeoff (uglify cannot compress an ESM well)': ({ esm }) =>
      UglifyJS.minify(esm.content.toString(), {
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
  esbuild: {
    minify: ({ esm }, outfile) => {
      esbuild.buildSync({
        entryPoints: [esm.filepath],
        outfile,
        minify: true,
        bundle: true, // needed to enable DCE (see See https://github.com/evanw/esbuild/issues/1551)
        pure: pureFuncs,
        target: 'es2020',
        format: 'esm',
      });
    },
    'minify (transform API - strange: does not remove unused code)': ({ esm }) =>
      // No dead code eliminiation because it would break the Svelte compiler.
      // See https://github.com/evanw/esbuild/issues/1551#issuecomment-906008421
      esbuild.transformSync(esm.content.toString(), {
        minify: true,
        pure: pureFuncs,
        target: 'es2020',
        format: 'esm',
      }).code,
  },
};

module.exports = variants;
