import * as UglifyJS from 'uglify-js';
import * as ClosureCompiler from 'google-closure-compiler';

import { pureFuncs } from './common';

export const uglifyDefaultCompressOptions: UglifyJS.CompressOptions = Object.fromEntries(
  // @ts-ignore `UglifyJS.default_options()` is unknown to TS
  Object.entries(UglifyJS.default_options().compress).map(([key, value]) => [
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
  ...uglifyDefaultCompressOptions,
  pure_funcs: pureFuncs,
  pure_getters: true,
  join_vars: true,
  conditionals: true,
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
