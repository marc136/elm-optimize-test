## Small app

| Command                                                                   | Time |   Size |   Gzip |
| ------------------------------------------------------------------------- | ---: | -----: | -----: |
| `elm make --optimize` (for reference)                                     | 0.4s | 969KiB | 157KiB |
| UglifyJS, only whitespace and comments removal                            | 0.5s | 767KiB | 129KiB |
| Above, plus shortened variable names (`mangle`)                           | 0.9s | 283KiB |  86KiB |
| Elm Guide command (run UglifyJS twice: `compress` then `mangle`)          | 5.3s | 228KiB |  76KiB |
| Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`) | 5.1s | 229KiB |  76KiB |
| Above, plus `passes: 2`                                                   | 7.6s | 226KiB |  76KiB |
| Above, plus `passes: 3`                                                   | 9.9s | 225KiB |  76KiB |
| UglifyJS with Elm Guide `compress` (but no `mangle`) plus esbuild         | 4.8s | 226KiB |  78KiB |
| Parts of UglifyJS plus esbuild                                            | 3.8s | 227KiB |  77KiB |
| Above, but with the slow option `reduce_vars` disabled                    | 3.0s | 229KiB |  78KiB |
| Just esbuild                                                              | 0.1s | 258KiB |  85KiB |
| Just esbuild with the IIFE trick                                          | 0.1s | 250KiB |  82KiB |
| UglifyJS tradeoff                                                         | 1.8s | 250KiB |  79KiB |
| UglifyJS with all `compress` options off (measure `compress` overhead)    | 1.4s | 282KiB |  86KiB |

## Big app

| Command                                                                   |  Time |    Size |   Gzip |
| ------------------------------------------------------------------------- | ----: | ------: | -----: |
| `elm make --optimize` (for reference)                                     |  0.6s | 3.23MiB | 490KiB |
| UglifyJS, only whitespace and comments removal                            |  1.1s | 2.61MiB | 409KiB |
| Above, plus shortened variable names (`mangle`)                           |  2.2s |  897KiB | 260KiB |
| Elm Guide command (run UglifyJS twice: `compress` then `mangle`)          | 12.5s |  753KiB | 236KiB |
| Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`) | 12.0s |  748KiB | 235KiB |
| Above, plus `passes: 2`                                                   | 19.4s |  739KiB | 234KiB |
| Above, plus `passes: 3`                                                   | 25.4s |  738KiB | 233KiB |
| UglifyJS with Elm Guide `compress` (but no `mangle`) plus esbuild         | 11.3s |  730KiB | 238KiB |
| Parts of UglifyJS plus esbuild                                            |  8.8s |  732KiB | 236KiB |
| Above, but with the slow option `reduce_vars` disabled                    |  6.8s |  739KiB | 238KiB |
| Just esbuild                                                              |  0.3s |  813KiB | 257KiB |
| Just esbuild with the IIFE trick                                          |  0.3s |  798KiB | 250KiB |
| UglifyJS tradeoff                                                         |  4.3s |  806KiB | 244KiB |
| UglifyJS with all `compress` options off (measure `compress` overhead)    |  3.2s |  895KiB | 260KiB |

## Really big app

| Command                                                                   |  Time |    Size |   Gzip |
| ------------------------------------------------------------------------- | ----: | ------: | -----: |
| `elm make --optimize` (for reference)                                     |  1.3s | 5.34MiB | 796KiB |
| UglifyJS, only whitespace and comments removal                            |  1.8s | 4.33MiB | 668KiB |
| Above, plus shortened variable names (`mangle`)                           |  3.3s | 1.45MiB | 434KiB |
| Elm Guide command (run UglifyJS twice: `compress` then `mangle`)          | 19.4s | 1.26MiB | 403KiB |
| Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`) | 18.8s | 1.25MiB | 402KiB |
| Above, plus `passes: 2`                                                   | 29.6s | 1.24MiB | 400KiB |
| Above, plus `passes: 3`                                                   | 39.8s | 1.24MiB | 399KiB |
| UglifyJS with Elm Guide `compress` (but no `mangle`) plus esbuild         | 17.1s | 1.23MiB | 407KiB |
| Parts of UglifyJS plus esbuild                                            | 13.2s | 1.24MiB | 403KiB |
| Above, but with the slow option `reduce_vars` disabled                    | 10.0s | 1.24MiB | 405KiB |
| Just esbuild                                                              |  0.4s | 1.34MiB | 429KiB |
| Just esbuild with the IIFE trick                                          |  0.4s | 1.32MiB | 421KiB |
| UglifyJS tradeoff                                                         |  6.2s | 1.34MiB | 413KiB |
| UglifyJS with all `compress` options off (measure `compress` overhead)    |  4.7s | 1.45MiB | 433KiB |
