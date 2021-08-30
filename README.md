# README

This repository exists so experimenting with different minification settings becomes easy and one can choose the the tool combination that works best for the codebase.

It can be used to check both IIFE and [ESModule](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) minification. So you can either use it like

```js
<script src="./results/iife.js"></script>
<script>
window.Elm.Main.init(...)
</script>
```

Or like this:
```js
<script type="module">
import { Elm } from './results/esm.mjs';
Elm.Main.init(...)
</script>
```

## Summary
So far I have no better advice than what [Simon Lydell](https://twitter.com/SimonLydell) posted on the [Elm discourse](https://discourse.elm-lang.org/t/what-i-ve-learned-about-minifying-elm-code/7632#timesize-comparison-table-13_)

- UglifyJS produces the smallest file
- But you can get even smaller by first running just parts of UglifyJS and then esbuild
- Esbuild alone produces ~2% more code than UglifyJS, but it is ~40 times faster.

## This repo

Is designed so you can clone it and then run all the minification options on your Elm projects.  
To compile one or more Elm apps into one js file and then minify it using the different tools, e.g. run this:
```sh
❯ npx ts-eager compare-minify-elm-esm src/*.elm
```

After that you can alter `./results/results.html` and then open it in your browser to see the compiled file works for your codebase.  
If you need special behavior to initialize an Elm app like flags, you should alter `./template.html` accordingly. As this file will be copied on every run, you can safely `rm -rf results`.


## Tools

- [esbuild](https://esbuild.github.io)
- [google-closure-compiler](https://github.com/google/closure-compiler-npm/tree/master/packages/google-closure-compiler)
- [swc](https://github.com/swc-project/swc) **TODO**
- [terser](https://github.com/terser/terser) **TODO**
- [uglify-js](https://github.com/mishoo/UglifyJS)


## TODO 

- Add compilation with [elm-optimize-level-2](https://github.com/mdgriffith/elm-optimize-level-2)
- Create a report page similar to https://evmar.github.io/js-min-bench/
- Change `results/results.html`, so it allows the user to initialize every compiled Elm app and every minified variant by clicking inside that html file.
- And to make this available as a tool on npm


# Notes

## This extends results gathered by Lydell
The major work of the IIFE minification was done by Lydell and posted to https://discourse.elm-lang.org/t/what-i-ve-learned-about-minifying-elm-code/7632


## Transforming compiled Elm code to an ESModule

Converting the compiled Elm code from an IIFE to an ESM is done very similar to [`elm-esm`](https://github.com/ChristophP/elm-esm). Just with less RegEx (and with relying on the minifier tool to remove unused code).


## esbuild

Note by [lydell on a thread about minification with esbuild](https://github.com/evanw/esbuild/issues/639#issuecomment-894467981) which contains several interesting comments about esbuild.

NOTE: To get dead code elimination with an ESModule, you currently need to use `format:"esm"` and `bundle:true` with esbuild@0.12.22.  
I created the issue https://github.com/evanw/esbuild/issues/1551 and it seems like that strange behavior will not go away as it is necessary [for the svelte compiler (it appends code that uses otherwise unused code)](https://github.com/evanw/esbuild/issues/1551#issuecomment-906008421).


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

*Implemented idea:*
Replace `(function(r){"use strict";` at the beginning with `const r={};`, then replace `})(this);` at the end with `export const Elm = r.Elm;`.


---

## Links
List of prior art (some were also referenced in the text above):

- [Comparison of esbuild, terser and uglify-js (by esbuild dev)](https://github.com/evanw/esbuild/issues/639#issuecomment-792057348)
- Evan Martin [on JS minification](http://neugierig.org/software/blog/2019/04/js-minifiers.html) and [a benchmark table](https://evmar.github.io/js-min-bench/)
- [Elm discourse post by Simon Lydell on minification](https://discourse.elm-lang.org/t/what-i-ve-learned-about-minifying-elm-code/7632)
- The npm module [elm-esm](https://github.com/ChristophP/elm-esm)
- https://github.com/mdgriffith/elm-optimize-level-2