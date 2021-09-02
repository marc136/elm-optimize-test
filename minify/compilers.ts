import UglifyJS from 'uglify-js';
import ClosureCompiler from 'google-closure-compiler';
import terser from 'terser';
import swc from '@swc/core';

import { pureFuncs } from './common';

export const uglifyDefaultCompressOptions: UglifyJS.CompressOptions =
  // @ts-ignore `UglifyJS.default_options()` is unknown to TS
  UglifyJS.default_options().compress;

export const uglifyAllFalseCompressOptions: UglifyJS.CompressOptions = Object.fromEntries(
  Object.entries(uglifyDefaultCompressOptions).map(([key, value]) => [
    key,
    value === true ? false : value,
  ])
);

/**
 * A good trade-off between speed and size documented by Lydell
 * on https://github.com/evanw/esbuild/issues/639#issuecomment-894467981
 * And explained on https://discourse.elm-lang.org/t/what-i-ve-learned-about-minifying-elm-code/7632#uglifyjs-tradeoff-9
 */
export const uglifyLydellCompressOptions: UglifyJS.CompressOptions = {
  ...uglifyAllFalseCompressOptions,
  pure_funcs: pureFuncs,
  pure_getters: true,
  join_vars: true,
  conditionals: true,
  unused: true,
};

/**
 * Terser started as a fork of uglify-es and has mostly the same compress options.
 */
export const terserDefaultCompressOptions: terser.CompressOptions = {
  arguments: false,
  arrows: true,
  booleans: true,
  booleans_as_integers: false,
  collapse_vars: true,
  comparisons: true,
  computed_props: true,
  conditionals: true,
  dead_code: true,
  defaults: true,
  directives: true,
  drop_console: false,
  drop_debugger: true,
  ecma: 5,
  evaluate: true,
  expression: false,
  global_defs: {},
  hoist_funs: false,
  hoist_props: true,
  hoist_vars: false,
  ie8: false,
  if_return: true,
  inline: 3,
  join_vars: true,
  keep_classnames: false,
  keep_fargs: true,
  keep_fnames: false,
  keep_infinity: false,
  loops: true,
  module: false, // important for ESM
  negate_iife: true,
  passes: 1,
  properties: true,
  pure_funcs: pureFuncs,
  pure_getters: true, // TODO, look into this
  reduce_funcs: true,
  reduce_vars: true,
  sequences: true,
  side_effects: true,
  switches: true,
  top_retain: null,
  toplevel: false, // TODO, look into this
  typeofs: false,
  unsafe: false,
  unsafe_arrows: false,
  unsafe_comps: false,
  unsafe_Function: false,
  unsafe_math: false,
  unsafe_symbols: false,
  unsafe_methods: false,
  unsafe_proto: false,
  unsafe_regexp: false,
  unsafe_undefined: false,
  unused: true,
};

/**
 * A good trade-off between speed and size documented by Lydell
 * on https://github.com/evanw/esbuild/issues/639#issuecomment-894467981
 * And explained on https://discourse.elm-lang.org/t/what-i-ve-learned-about-minifying-elm-code/7632#uglifyjs-tradeoff-9
 */
export const terserLydellCompressOptions: terser.CompressOptions = {
  ...Object.fromEntries(
    Object.entries(terserDefaultCompressOptions).map(([key, value]) => [
      key,
      value === true ? false : value,
    ])
  ),
  pure_funcs: pureFuncs,
  pure_getters: true,
  join_vars: true,
  conditionals: true,
  unused: true,
};

/**
 * Tested with with @swc/core@1.2.84
 * Uses default terser values except where it breaks compilation in swc.
 * Swc tries to use the same properties as terser, but is not fully compatible.
 */
export const swcWorkingCompressOptions: swc.TerserCompressOptions = {
  arguments: false,
  arrows: true,
  booleans: true,
  booleans_as_integers: false,
  collapse_vars: true,
  comparisons: true,
  computed_props: true,
  conditionals: true,
  dead_code: true,
  defaults: true,
  directives: true,
  drop_console: false,
  drop_debugger: true,
  ecma: 5,
  evaluate: true,
  expression: false,
  global_defs: {},
  hoist_funs: false,
  hoist_props: true,
  hoist_vars: false,
  if_return: false, // default value `true` breaks output with @swc/core@1.2.84
  inline: 3,
  join_vars: true,
  keep_classnames: false,
  keep_fargs: true,
  keep_fnames: false,
  keep_infinity: false,
  loops: true,
  module: false, // important for ESM
  negate_iife: true,
  passes: 1,
  properties: true,
  pure_funcs: pureFuncs,
  pure_getters: true, // TODO, look into this
  reduce_vars: false, // default value `true` breaks output with @swc/core@1.2.84
  sequences: false, // default value `true` breaks output with @swc/core@1.2.84
  side_effects: true,
  switches: true,
  top_retain: null,
  toplevel: false, // TODO, look into this
  typeofs: false,
  // unsafe_passes: false, // throws an error in @swc/core@1.2.84
  unsafe_arrows: false,
  unsafe_comps: false,
  // unsafe_function: false, // throws an error in @swc/core@1.2.84
  unsafe_math: false,
  unsafe_symbols: false,
  unsafe_methods: false,
  unsafe_proto: false,
  unsafe_regexp: false,
  unsafe_undefined: false,
  unused: true,
};

/**
 *
 * @param {Object} config See https://github.com/google/closure-compiler/wiki/Flags-and-Options
 * @returns void
 */
export async function compileWithGoogleClosureCompiler(
  config: ClosureCompiler.CompileOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    new ClosureCompiler.compiler(config).run((exitCode, stdOut, stdErr) => {
      if (exitCode === 0) resolve(stdOut);
      else {
        console.error(`google-closure-compiler failed with exit code '${exitCode}'`);
        console.error(stdErr);
        reject(stdErr);
      }
    });
  });
}
