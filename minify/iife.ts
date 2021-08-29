/**
 * Minify Elm IIFE
 * Most of the variants were copied from https://gist.github.com/lydell/b92ec8b6c7ae91945da10c814e565d5e (revision 5)
 */

import UglifyJS from 'uglify-js';
import esbuild from 'esbuild';

import { pureFuncs, Variant, ToolVariants, variant } from './common';
import {
  compileWithGoogleClosureCompiler,
  uglifyDefaultCompressOptions,
  uglifyLydellCompressOptions,
} from './compilers';

//  TODO use the uglifyjs cli to directly operate on files?
const uglifyVariants: Variant[] = [
  variant(
    'safe',
    'Remove whitespace and comments',
    async ({ iife }) =>
      UglifyJS.minify(iife.content.toString(), {
        compress: false,
        mangle: false,
      }).code
  ),
  variant(
    'safe+mangle',
    'Remove whitespace and comments, and mangle variable names',
    async ({ iife }) =>
      UglifyJS.minify(iife.content.toString(), {
        compress: false,
        mangle: true,
      }).code
  ),
  variant(
    'elm-guide',
    'Elm Guide command (run UglifyJS twice: `compress` then `mangle`)',
    async ({ iife }) => {
      const compressed = UglifyJS.minify(iife.content.toString(), {
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
    }
  ),
  variant(
    'elm-guide-tweaked',
    'Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`)',
    async ({ iife }) =>
      UglifyJS.minify(iife.content.toString(), {
        compress: {
          pure_funcs: pureFuncs,
          pure_getters: true,
          unsafe_comps: true,
          unsafe: true,
        },
        mangle: {
          reserved: pureFuncs,
        },
      }).code
  ),
  variant(
    'elm-guide_tweaked-x2',
    'Tweaked Elm Guide command (`passes: 2`)',
    async ({ iife }) =>
      UglifyJS.minify(iife.content.toString(), {
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
      }).code
  ),
  variant(
    'elm-guide_tweaked-x2',
    'Tweaked Elm Guide command (`passes: 3`)',
    async ({ iife }) =>
      UglifyJS.minify(iife.content.toString(), {
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
      }).code
  ),
  variant(
    'tradeoff',
    'UglifyJS tradeoff',
    async ({ iife }) =>
      UglifyJS.minify(iife.content.toString(), {
        compress: uglifyLydellCompressOptions,
        mangle: {
          reserved: pureFuncs,
        },
      }).code
  ),
];

const uglifyAndEsbuildVariants: Variant[] = [
  variant(
    'compress+minify',
    'Elm Guide compress with uglify-js, then minify with esbuild',
    async (elm) => {
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
    }
  ),
  variant(
    'compress(partial)+minify',
    'Compress partially with uglify-js, then minify with esbuild',
    async (elm) => {
      const compressed = UglifyJS.minify(elm.iife.content.toString(), {
        compress: {
          ...uglifyDefaultCompressOptions,
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
    }
  ),
  variant(
    'compress(partial+reduce)+minify',
    'Compress partially with uglify-js (and `reduce_vars:false`), then minify with esbuild',
    async (elm) => {
      const compressed = UglifyJS.minify(elm.iife.content.toString(), {
        compress: {
          ...uglifyDefaultCompressOptions,
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
    }
  ),
];

const esbuildVariants: Variant[] = [
  variant('minify', 'minify', async (elm, outfile) => {
    esbuild.buildSync({
      entryPoints: [elm.iife.filepath],
      outfile,
      minify: true,
      pure: pureFuncs,
      target: 'es5',
      format: 'iife',
    });
  }),
  variant('minify(transform)', 'minify (transform API)', async (elm) => {
    return esbuild.transformSync(elm.iife.content.toString(), {
      minify: true,
      pure: pureFuncs,
      target: 'es5',
      format: 'iife',
    }).code;
  }),
  variant('minify(transform-IIFE-trick)', 'minify (with IIFE trick)', async (elm) => {
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
  }),
];

const closureVariants: Variant[] = [
  variant('default', 'default', (elm, jsOutputFile) =>
    compileWithGoogleClosureCompiler({
      js: elm.iife.filepath,
      jsOutputFile,
      // Changing from 'STABLE' to 'ECMASCRIPT5' only increased the time, but created identical
      // files. I assume because it only verifies if the generated file matches the spec and does
      // not transform the code.
      languageOut: 'STABLE', // default
    })
  ),
  variant('advanced', 'advanced', (elm, jsOutputFile) =>
    compileWithGoogleClosureCompiler({
      js: elm.iife.filepath,
      jsOutputFile,
      compilation_level: 'ADVANCED',
    })
  ),
];

const variants: ToolVariants = {
  esbuild: esbuildVariants,
  closure: closureVariants,
  uglify: uglifyVariants,
  'uglify+esbuild': uglifyAndEsbuildVariants,
};
export default variants;
