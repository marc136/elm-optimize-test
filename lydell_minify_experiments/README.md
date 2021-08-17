_Copied from https://gist.github.com/lydell/b92ec8b6c7ae91945da10c814e565d5e (revision 5)_

---

# What I’ve learned about minifying Elm code

## Summary

The Elm Guide has a page on [minification](https://guide.elm-lang.org/optimization/asset_size.html), but it’s not the end of the story.

- The [UglifyJS](https://github.com/mishoo/UglifyJS) command in the Elm Guide can be tweaked to produce slightly smaller code a tiny bit faster.
- But you can get even smaller by first running just parts of UglifyJS and then [esbuild](https://github.com/evanw/esbuild/) – and much faster!
- Gzip is really unpredictable. Slightly increasing the minified size can sometimes _decrease_ the gzipped size.
- If you’re OK with ~2% more of the original JS, you can run only esbuild in less than a second (~40 times faster).
- There’s a trick to getting esbuild to remove even more JS.
- [Terser](https://github.com/terser/terser) produced ever so slightly more code than UglifyJS last time I checked (and has dependencies, while UglifyJS has none).
- I didn’t bother with Google Closure Compiler.
- [swc](https://github.com/swc-project/swc) is porting Terser to Rust – I’m excited to see if that beats esbuild in the future!

Make sure to check out the “Time/Size comparison table” at the end of this post!

## A note on how UglifyJS works

To understand why I’ve configured UglifyJS like I have, one needs to know a little bit about UglifyJS.

UglifyJS has two central things called `mangle` and `compress`, which can be enabled and configured individually.

### mangle:off, compress:off

If _both_ are _off,_ UglifyJS only removes whitespace and comments, which is the simplest form of minification.

```js
var cool = true; // hi!
```

⬇️

<!--prettier-ignore-->
```js
var cool=true;
```

### mangle:on, compress:off

`mangle` renames variables to be shorter.

```js
var cool = true; // hi!
```

⬇️

<!--prettier-ignore-->
```js
var r=true;
```

### mangle:off, compress:on

`compress` has a bunch of sub-options that do everything from shortening booleans to dead code elimination.

```js
var cool = true; // hi!
```

⬇️

<!--prettier-ignore-->
```js
var cool=!0;
```

### mangle:on, compress:on

Usually one enables both:

```js
var cool = true; // hi!
```

⬇️

<!--prettier-ignore-->
```js
var r=!0;
```

Sometimes `mangle` and `compress` can interact. I’ll get to that in the next section.

(Note that the above examples are a little bit simplified. If you feed them directly to UglifyJS you might not get the exact same results without more flags (such as `--toplevel`), or more complicated code examples.)

## The Elm Guide, tweaked

The Elm Guide page about [minification](https://guide.elm-lang.org/optimization/asset_size.html) says:

> ```
> uglifyjs elm.js --compress 'pure_funcs=[F2,F3,✂,A8,A9],✂' | uglifyjs --mangle --output elm.min.js
> ```
>
> `uglifyjs` is called twice there. First to `--compress` and second to `--mangle`. This is necessary! Otherwise `uglifyjs` will ignore our `pure_funcs` flag.

That’s correct! `--mangle` renames stuff like `F2` to `t`, and at the same time we’re saying that functions called `F2` should be treated as pure. UglifyJS must be doing mangling first or something, because they say this in their docs:

> Make sure symbols under `pure_funcs` are also under `mangle.reserved` to avoid mangling.

So while it works running UglifyJS like the Elm Guide says, repeating the list of pure functions in `mangle.reserved` is better:

- It results in a little bit smaller output.
- It’s ever so slightly faster. I had expected _much_ faster, but it turns out parsing is fast, so doing it twice doesn’t matter much.

Here’s the updated version of the CLI command from the Elm guide:

```bash
uglifyjs elm.js --compress 'pure_funcs=[F2,F3,F4,F5,F6,F7,F8,F9,A2,A3,A4,A5,A6,A7,A8,A9],pure_getters,unsafe_comps,unsafe' --mangle 'reserved=[F2,F3,F4,F5,F6,F7,F8,F9,A2,A3,A4,A5,A6,A7,A8,A9]' --output elm.min.js
```

Or using the JS API:

```js
const fs = require("fs");
const UglifyJS = require("uglify-js");

// prettier-ignore
const pureFuncs = [ "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"];

const elmCode = fs.readFileSync("elm.js", "utf8");

const result = UglifyJS.minify(elmCode, {
  compress: {
    pure_funcs: pureFuncs,
    pure_getters: true,
    unsafe_comps: true,
    unsafe: true,
  },
  mangle: {
    reserved: pureFuncs,
  },
});
```

(I also removed `keep_fargs=false` since that’s the default.)

## UglifyJS `passes` option

`passes` is an option for `compress` that allows running `compress` several times. `passes: 2` eeks out a little bit more code, but is really expensive: The runtime is up to 50% longer. With `passes: 3` we’re _really_ talking diminishing returns.

The default is `passes: 1` – go with that unless you really need those extra kilobyte savings. Too slow build times can be a pain!

## UglifyJS tradeoff

The UglifyJS docs suggest only enabling `mangle` for faster minification, since whitespace+comments removal and variable renaming are faster than other optimizations and give the biggest wins.

I also researched only enabling _some_ `compress` options. This is pretty tricky because many times the options work together. The way to do it is to start out with some UglifyJS command to use as a baseline, and then disable just one option at a time using a script. If disabling an option resulted in the same size, that option did nothing. If disabling an option increased the size, it actually helps when enabled!

I tested this with 3.2MiB of JS from a pretty large Elm app at work, and used the tweaked Elm Guide command as a baseline. Turns out only about half of the options affected the size!

| compress option | character increase when disabled |
| --------------- | -------------------------------: |
| negate_iife     |                                4 |
| assignments     |                                7 |
| unsafe_comps    |                               24 |
| properties      |                               30 |
| typeofs         |                              108 |
| hoist_props     |                              116 |
| unsafe          |                              121 |
| comparisons     |                              147 |
| loops           |                              377 |
| reduce_funcs    |                              469 |
| side_effects    |                              497 |
| evaluate        |                              694 |
| strings         |                             1074 |
| booleans        |                             1134 |
| functions       |                             1337 |
| sequences       |                             1933 |
| merge_vars      |                             3818 |
| switches        |                             6261 |
| dead_code       |                             6529 |
| pure_funcs      |                             7572 |
| if_return       |                             7996 |
| inline          |                            14381 |
| pure_getters    |                            15110 |
| join_vars       |                            17762 |
| reduce_vars     |                            19239 |
| conditionals    |                            20698 |
| collapse_vars   |                            20763 |
| unused          |                            53527 |

What I did then was to pick and choose just a few of the above and see how they behaved: How much size do they eat, with what time cost? Is enabling _those two_ expensive but effective options better than enabling _those four_ cheaper ones? How does _this_ rule improve if _that_ is also enabled?

From trial and error I found that the following combo gave a lot of bang for the buck, so to speak:

```js
const fs = require("fs");
const UglifyJS = require("uglify-js");

// prettier-ignore
const pureFuncs = [ "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"];

const elmCode = fs.readFileSync("elm.js", "utf8");

const result = UglifyJS.minify(elmCode, {
  compress: {
    // Turn off all options.
    ...Object.fromEntries(
      Object.entries(UglifyJS.default_options().compress).map(
        ([key, value]) => [key, value === true ? false : value]
      )
    ),
    // The options with a lot of bang for the buck:
    pure_funcs: pureFuncs,
    pure_getters: true,
    join_vars: true,
    conditionals: true,
    unused: true,
  },
  mangle: {
    reserved: pureFuncs,
  },
});
```

It’s easy to lose yourself in this, trying to find the perfect tradeoff. It’s also very hard to decide how much time to spend and how much space to “waste!” But after I realized that esbuild is stable enough to use, it doesn’t matter anymore. It outperforms any UglifyJS option combo you can think of, both in terms of size and time. (Unless you look at the gzipped size…)

## esbuild

esbuild is easy to use:

```
esbuild elm.js --minify --target=es5 --outfile=elm.min.js
```

The `elm make` output is ES5. `--target=es5` makes sure that esbuild doesn’t “upgrade” `function` to `=>`.

Using esbuild’s JS API (also with `pure` functions specified – I’m not sure if that actually makes any difference):

```js
const fs = require("fs");
const esbuild = require("esbuild");

// prettier-ignore
const pureFuncs = [ "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"];

const elmCode = fs.readFileSync("elm.js", "utf8");

const result = esbuild.transformSync(elmCode, {
  minify: true,
  pure: pureFuncs,
  target: "es5",
});
```

## esbuild trick

esbuild only removes unused functions at the top level. `elm make` wraps everything in an “IIFE” (immediately invoked function expression):

```js
(function (scope) {
  // actual code
})(this);
```

By removing the IIFE esbuild can remove more code:

```js
var scope = window;
// actual code
```

(`this` refers to `window` in this case, but unless I explicitly say `window` I couldn’t get esbuild to output what I want).

This is easier to do with JavaScript than command line tools:

```js
const fs = require("fs");
const esbuild = require("esbuild");

// prettier-ignore
const pureFuncs = [ "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"];

const elmCode = fs.readFileSync("elm.js", "utf8");

// Remove IIFE.
const newCode =
  "var scope = window;" +
  elmCode.slice(elmCode.indexOf("{") + 1, elmCode.lastIndexOf("}"));

const result = esbuild.transformSync(elmCode, {
  minify: true,
  pure: pureFuncs,
  target: "es5",
  // This enables top level minification, and re-adds an IIFE.
  format: "iife",
});
```

(I’ve run the final output in the browser. It works just fine.)

## UglifyJS plus esbuild

UglifyJS produces smaller code than esbuild simply because it has more optimization tricks. By only enabling the UglifyJS stuff that esbuild doesn’t do and then running esbuild, we can get the same code size – actually even better! – but in less time.

There’s no need for the IIFE trick when running UglifyJS first.

```js
const fs = require("fs");
const UglifyJS = require("uglify-js");
const esbuild = require("esbuild");

// prettier-ignore
const pureFuncs = [ "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"];

const elmCode = fs.readFileSync("elm.js", "utf8");

const result = UglifyJS.minify(elmCode, {
  compress: {
    // Disable all options.
    ...Object.fromEntries(
      Object.entries(UglifyJS.default_options().compress).map(
        ([key, value]) => [key, value === true ? false : value]
      )
    ),
    // These are the options that actually resulted in smaller output.
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
});

if (result.error !== undefined) {
  throw result.error;
}

const result2 = esbuild.transformSync(result.code, {
  minify: true,
  target: "es5",
});
```

Here’s a command line approximation:

```
uglifyjs elm.js --compress 'pure_funcs=[F2,F3,F4,F5,F6,F7,F8,F9,A2,A3,A4,A5,A6,A7,A8,A9],pure_getters' | esbuild --minify --target=es5 > elm.min.js
```

## Time/Size comparison table

Here’s a comparison of commands, ran on a pretty large Elm app at work. The times fluctuate with a couple of tenths of a second every time I run them, and sometimes more if I let a day pass between.

Use the below table as a rough size-time tradeoff guide, but measure yourself too.

- Computer: 2019 MacBook Pro (2.6 GHz 6-core Intel Core i7, 16 GB RAM)
- UglifyJS version: 3.14.1
- esbuild version: 0.12.18
- Node.js version: 16.1.0

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

The last line shows how just enabling the `compress` AST pass takes a second. (UglifyJS seems to remove braces after `if`, `for` and `while` (where possible) whenever `compress` is enabled – that’s why the `mangle`-only run is ~2KiB larger.)

It’s interesting how in 2.2s UglifyJS can remove 2.3MiB. Almost double that time (to 4.3s) and you only remove another 91KiB. Quadruple _that_ (and then some, to 19.4s) to remove a final 70KiB. And at the same time esbuild comes really close in just 0.3s. So:

- If you are plagued by long build times, there’s just one option: esbuild. And it still does a great job! Especially with the IIFE trick.
- If you need the absolute smallest code size, you have to use UglifyJS. Best in combination with esbuild (faster and (possibly) slightly smaller).

---

GitHub Gist of this post, with more tables and scripts: https://gist.github.com/lydell/b92ec8b6c7ae91945da10c814e565d5e
