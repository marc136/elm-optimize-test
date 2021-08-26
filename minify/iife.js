const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const childProcess = require('child_process');
const UglifyJS = require('uglify-js');
const esbuild = require('esbuild');

const { pureFuncs, compileWithGoogleClosureCompiler } = require('./common');

/**
 * Minify Elm IIFE
 * Copied from https://gist.github.com/lydell/b92ec8b6c7ae91945da10c814e565d5e (revision 5)
 *
 * TODO use the uglifyjs cli to directly operate on files?
 */
const variants = {
  uglify: {
    'Remove whitespace and comments': ({ elm }) =>
      UglifyJS.minify(elm.iife.content.toString(), {
        compress: false,
        mangle: false,
      }).code,
    'Remove whitespace and comments, and mangle variable names': ({ elm }) =>
      UglifyJS.minify(elm.iife.content.toString(), {
        compress: false,
        mangle: true,
      }).code,
    'Elm Guide command (run UglifyJS twice: `compress` then `mangle`)': ({ elm }) => {
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
    'Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`)': ({ elm }) =>
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
    'Tweaked Elm Guide command (`passes: 2`)': ({ elm }) =>
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
    'Tweaked Elm Guide command (`passes: 3`)': ({ elm }) =>
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
    'UglifyJS tradeoff': ({ elm }) =>
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
    'Elm Guide compress with uglify-js, then minify with esbuild': ({ elm }) => {
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
    'Compress partially with uglify-js, then minify with esbuild': ({ elm }) => {
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
    'Compress partially with uglify-js (and `reduce_vars:false`), then minify with esbuild': ({
      elm,
    }) => {
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
    minify: ({ elm }, outfile) => {
      esbuild.buildSync({
        entryPoints: [elm.iife.filepath],
        outfile,
        minify: true,
        pure: pureFuncs,
        target: 'es5',
        format: 'iife',
      });
    },
    'minify (transform API)': ({ elm }) =>
      esbuild.transformSync(elm.iife.content.toString(), {
        minify: true,
        pure: pureFuncs,
        target: 'es5',
        format: 'iife',
      }).code,
    'minify (with IIFE trick)': ({ elm }) => {
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
  closure: {
    default: ({ elm }, outfile) =>
      compileWithGoogleClosureCompiler({
        js: elm.iife.filepath,
        jsOutputFile: outfile,
        // Changing from 'STABLE' to 'ECMASCRIPT5' only increased the time, but created identical
        // files. I assume because it only verifies if the generated file matches the spec and does
        // not transform the code.
        languageOut: 'STABLE', // default
      }),
    advanced: ({ elm }, outfile) =>
      compileWithGoogleClosureCompiler({
        js: elm.iife.filepath,
        jsOutputFile: outfile,
        compilation_level: 'ADVANCED',
      }),
  },
};

module.exports = variants;
