/**
 * Minify Elm ESM
 */

import UglifyJS from 'uglify-js';
import esbuild from 'esbuild';
import { pureFuncs, ToolVariants, variant } from './common';
import { uglifyLydellCompressOptions } from './compilers';

const esBuildVariants = [
  variant('minify', 'minify', async (elm, outfile) => {
    esbuild.buildSync({
      entryPoints: [elm.esm.filepath],
      outfile,
      minify: true,
      bundle: true, // needed to enable DCE (see See https://github.com/evanw/esbuild/issues/1551)
      pure: pureFuncs,
      target: 'es2020',
      format: 'esm',
    });
  }),
  variant(
    'minify(transform)',
    'minify (transform API - strange: does not remove unused code)',
    async (elm) =>
      // No dead code eliminiation because it would break the Svelte compiler.
      // See https://github.com/evanw/esbuild/issues/1551#issuecomment-906008421
      esbuild.transformSync(elm.esm.content.toString(), {
        minify: true,
        pure: pureFuncs,
        target: 'es2020',
        format: 'esm',
      }).code
  ),
];

const variants: ToolVariants = {
  esbuild: esBuildVariants,
  closure: [], // only generates IIFE
  uglify: [
    variant(
      'tradeoff',
      'UglifyJS tradeoff (uglify is not designed to handle ESM)',
      async (elm) =>
        UglifyJS.minify(elm.esm.content.toString(), {
          compress: uglifyLydellCompressOptions,
          mangle: {
            reserved: pureFuncs,
          },
        }).code
    ),
  ],
  'uglify+esbuild': [], // uglify is not designed to handle ESM, not worth running
};
export default variants;
