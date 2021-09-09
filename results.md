# Results 

When compiling two Elm apps into one bundle.

When using dependencies

| tool                    | version      |
|-------------------------|--------------|
| @swc/core               | 1.2.84       |
| esbuild                 | 0.12.22      |
| google-closure-compiler | 20210808.0.0 |
| terser                  | 5.7.2        |
| uglify-js               | 3.14.1       |

## Global IIFE

| variant                                                                                      | time | size    | gzip   |
|----------------------------------------------------------------------------------------------|------|---------|--------|
| elm make --optimize (for reference)                                                          | 0.4s | 1.25MiB | 200KiB |
| iife esbuild minify                                                                          | 0.2s | 315KiB  | 102KiB |
| iife esbuild minify (transform API)                                                          | 0.1s | 315KiB  | 102KiB |
| iife esbuild minify (with IIFE trick)                                                        | 0.1s | 306KiB  | 99KiB  |
| iife closure default                                                                         | 6.6s | 278KiB  | 93KiB  |
| iife closure advanced                                                                        | 9.8s | 277KiB  | 92KiB  |
| iife swc Remove whitespace and comments (transform)                                          | 0.4s | 1.07MiB | 173KiB |
| iife swc Remove whitespace and comments (minify)                                             | 0.2s | 1.02MiB | 168KiB |
| iife swc working compress settings                                                           | 0.5s | 356KiB  | 126KiB |
| iife swc working compress settings (`passes:2`)                                              | 0.6s | 355KiB  | 126KiB |
| iife swc working compress settings (`passes:3`)                                              | 0.6s | 355KiB  | 126KiB |
| iife terser Remove whitespace and comments                                                   | 0.8s | 1.02MiB | 168KiB |
| iife terser Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`)        | 4.3s | 290KiB  | 92KiB  |
| iife terser Tweaked Elm Guide command (`passes: 2`)                                          | 5.2s | 287KiB  | 92KiB  |
| iife terser Tweaked Elm Guide command (`passes: 3`)                                          | 6.2s | 287KiB  | 92KiB  |
| iife terser Lydell tradeoff                                                                  | 2.4s | 309KiB  | 97KiB  |
| iife uglify Remove whitespace and comments                                                   | 0.6s | 1.02MiB | 168KiB |
| iife uglify Remove whitespace and comments, and mangle variable names                        | 1.0s | 345KiB  | 104KiB |
| iife uglify Elm Guide command (run UglifyJS twice: `compress` then `mangle`)                 | 5.8s | 281KiB  | 91KiB  |
| iife uglify Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`)        | 4.7s | 281KiB  | 91KiB  |
| iife uglify Tweaked Elm Guide command (`passes: 2`)                                          | 7.1s | 277KiB  | 90KiB  |
| iife uglify Tweaked Elm Guide command (`passes: 3`)                                          | 9.5s | 276KiB  | 90KiB  |
| iife uglify UglifyJS tradeoff                                                                | 1.5s | 307KiB  | 97KiB  |
| iife uglify+esbuild Elm Guide compress with uglify-js, then minify with esbuild              | 3.7s | 277KiB  | 92KiB  |
| iife uglify+esbuild Compress partially with uglify-js, then minify with esbuild              | 3.5s | 280KiB  | 92KiB  |
| iife uglify+esbuild Compress partially with uglify-js (and `reduce_vars:false`), then minify | 2.6s | 283KiB  | 93KiB  |


## ESModule
| variant                                                                                             | time | size    | gzip   |
|-----------------------------------------------------------------------------------------------------|------|---------|--------|
| elm make --optimize and convert to ESM (for reference)                                              | 0.4s | 1.25MiB | 200KiB |
| esm esbuild minify                                                                                  | 0.1s | 306KiB  | 99KiB  |
| esm esbuild minify (transform API - strange: does not remove unused code)                           | 0.1s | 315KiB  | 102KiB |
| esm uglify UglifyJS tradeoff (uglify is not designed to handle ESM)                                 | 1.5s | 905KiB  | 142KiB |
| iifeThenEsm closure default                                                                         | 6.6s | 278KiB  | 93KiB  |
| iifeThenEsm closure advanced                                                                        | 9.8s | 276KiB  | 92KiB  |
| iifeThenEsm swc Remove whitespace and comments (transform)                                          | 0.5s | 1.07MiB | 173KiB |
| iifeThenEsm swc Remove whitespace and comments (minify)                                             | 0.2s | 1.02MiB | 168KiB |
| iifeThenEsm swc working compress settings                                                           | 0.5s | 356KiB  | 126KiB |
| iifeThenEsm swc working compress settings (`passes:2`)                                              | 0.6s | 355KiB  | 126KiB |
| iifeThenEsm swc working compress settings (`passes:3`)                                              | 0.6s | 355KiB  | 126KiB |
| iifeThenEsm terser Remove whitespace and comments                                                   | 0.8s | 1.02MiB | 168KiB |
| iifeThenEsm terser Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`)        | 4.3s | 290KiB  | 92KiB  |
| iifeThenEsm terser Tweaked Elm Guide command (`passes: 2`)                                          | 5.2s | 287KiB  | 92KiB  |
| iifeThenEsm terser Tweaked Elm Guide command (`passes: 3`)                                          | 6.2s | 287KiB  | 92KiB  |
| iifeThenEsm terser Lydell tradeoff                                                                  | 2.4s | 309KiB  | 97KiB  |
| iifeThenEsm uglify Remove whitespace and comments                                                   | 0.6s | 1.02MiB | 168KiB |
| iifeThenEsm uglify Remove whitespace and comments, and mangle variable names                        | 1.0s | 345KiB  | 104KiB |
| iifeThenEsm uglify Elm Guide command (run UglifyJS twice: `compress` then `mangle`)                 | 5.8s | 281KiB  | 91KiB  |
| iifeThenEsm uglify Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`)        | 4.7s | 281KiB  | 91KiB  |
| iifeThenEsm uglify Tweaked Elm Guide command (`passes: 2`)                                          | 7.1s | 277KiB  | 90KiB  |
| iifeThenEsm uglify Tweaked Elm Guide command (`passes: 3`)                                          | 9.5s | 276KiB  | 90KiB  |
| iifeThenEsm uglify UglifyJS tradeoff                                                                | 1.5s | 307KiB  | 97KiB  |
| iifeThenEsm uglify+esbuild Elm Guide compress with uglify-js, then minify with esbuild              | 3.7s | 277KiB  | 92KiB  |
| iifeThenEsm uglify+esbuild Compress partially with uglify-js, then minify with esbuild              | 3.5s | 280KiB  | 92KiB  |
| iifeThenEsm uglify+esbuild Compress partially with uglify-js (and `reduce_vars:false`), then minify | 2.6s | 283KiB  | 93KiB  |