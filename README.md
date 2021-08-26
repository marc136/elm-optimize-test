In this folder, I want to look into turning compiled elm code from an IIFE into an ESM and optimizing it.

I copied a minimal example using [Browser.sandbox](https://dark.elm.dmy.fr/packages/elm/browser/latest/Browser#sandbox) from https://elm-lang.org/examples/buttons and then compiled it with the default elm compiler:

```sh
elm make --optimize src/Sandbox.elm --output=output/sandbox_default.js
```

Then for comparison, I also used [`elm-esm`](https://github.com/ChristophP/elm-esm)

```sh
npx elm-esm make  --optimize src/Sandbox.elm --output=output/sandbox_elm-esm.js
```

Note by [lydell on a thread about minification with esbuild](https://github.com/evanw/esbuild/issues/639#issuecomment-894467981) which contains several interesting comments about esbuild.



---

List of prior art (also referenced in the text above):

- https://github.com/ChristophP/elm-esm exposes the npm module `elm-esm`
- Elm discourse post by lydell on minification https://discourse.elm-lang.org/t/what-i-ve-learned-about-minifying-elm-code/7632
- https://github.com/mdgriffith/elm-optimize-level-2
