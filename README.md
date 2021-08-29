In this folder, I want to look into turning compiled elm code from an IIFE into an ESM and optimizing it.

I copied a minimal example using [Browser.sandbox](https://dark.elm.dmy.fr/packages/elm/browser/latest/Browser#sandbox) from https://elm-lang.org/examples/buttons and then compiled it with the default elm compiler:

```sh
elm make --optimize src/Sandbox.elm --output=output/sandbox_default.js
```

Then for comparison, I also used [`elm-esm`](https://github.com/ChristophP/elm-esm)

```sh
npx elm-esm make  --optimize src/Sandbox.elm --output=output/sandbox_elm-esm.js
```

[Comparison of esbuild, terser and uglify-js (by esbuild dev)](https://github.com/evanw/esbuild/issues/639#issuecomment-792057348)

Note by [lydell on a thread about minification with esbuild](https://github.com/evanw/esbuild/issues/639#issuecomment-894467981) which contains several interesting comments about esbuild.


NOTE: To get dead code elimination with an ESModule, you currently need to use `format:"esm"` and `bundle:true` with esbuild@0.12.22. I created the issue https://github.com/evanw/esbuild/issues/1551 for this behavior and maybe it will be fixed.


## Idea to minify IIFE and then change it to ESM
Initial idea: Prepend `export const Elm = `, take after first `{` and drop `})(this);` at the end, and then append `;`. But that will not work.

Anaylized generated code:

iife_closure_*: `(function(tg){`...`]})(this);\n`

iife_esbuild_*: `(function(){`...`})();\n`
Problem: The different compilation settings add window.Elm in different ways, and none pass `this` to the IIFE.
But for esbuild it does not make sense, as the compiling with `format:esm` achieves the same size. So I can ignore this.

iife_uglify_1 `(function(n){`...`})(this);\n`
iife_uglify_[2-4] `!(function(n){`...`}(this);\n`
iife_uglify_6 `(function(r){`...`})(this);\n`

iife_uglify+esbuild_0.js `(function(No){`...`})(this);\n`
iife_uglify+esbuild_1.js `(function(Go){`...`})(this);\n`
iife_uglify+esbuild_2.js `(function(la){`...`})(this);\n`

What works is: Prepend `const scope = {};`, then slice until last occurence of `(` and append `(scope);export const Elm=scope.Elm;\n`.

Another idea for `iife_uglify_6`:
Replace `(function(r){"use strict"` with `const r={}`, then replace `})(this);` with `export const Elm = r.Elm;`.

---

## Tools

- [uglify-js](https://github.com/mishoo/UglifyJS)
- [esbuild](https://esbuild.github.io)

### Further tools to add

- [google-closure-compiler](https://github.com/google/closure-compiler-npm/tree/master/packages/google-closure-compiler)
- [terser](https://github.com/terser/terser)
- [swc](https://github.com/swc-project/swc)

---

List of prior art (also referenced in the text above):

- https://github.com/ChristophP/elm-esm exposes the npm module `elm-esm`
- Elm discourse post by lydell on minification https://discourse.elm-lang.org/t/what-i-ve-learned-about-minifying-elm-code/7632
- https://github.com/mdgriffith/elm-optimize-level-2
