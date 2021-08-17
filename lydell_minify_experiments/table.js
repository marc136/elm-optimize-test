/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const childProcess = require("child_process");
const UglifyJS = require("uglify-js");
const esbuild = require("esbuild");

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Must pass at least 2 args: Input.elm output.js");
  process.exit(1);
}

const [elmInputFile, elmOutputFile, variantName] = args;

const pureFuncs = [
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
  "A7",
  "A8",
  "A9",
];

function findClosest(name, dir) {
  const entry = path.join(dir, name);
  return fs.existsSync(entry)
    ? entry
    : dir === path.parse(dir).root
      ? undefined
      : findClosest(name, path.dirname(dir));
}

const variants = {
  "`elm make --optimize` (for reference)": () => {
    childProcess.spawnSync(
      "elm",
      ["make", path.resolve(elmInputFile), "--optimize", "--output", path.resolve(elmOutputFile)],
      { cwd: path.dirname(findClosest("elm.json", path.dirname(elmInputFile))) }
    );
    return { code: fs.readFileSync(elmOutputFile, "utf8") };
  },
  "UglifyJS, only whitespace and comments removal": (code) =>
    UglifyJS.minify(code, {
      compress: false,
      mangle: false,
    }),
  "Above, plus shortened variable names (`mangle`)": (code) =>
    UglifyJS.minify(code, {
      compress: false,
      mangle: true,
    }),
  "Elm Guide command (run UglifyJS twice: `compress` then `mangle`)": (
    code
  ) => {
    const result = UglifyJS.minify(code, {
      compress: {
        pure_funcs: pureFuncs,
        pure_getters: true,
        unsafe_comps: true,
        unsafe: true,
      },
      mangle: false,
    });
    return UglifyJS.minify(result.code, {
      compress: false,
      mangle: true,
    });
  },
  "Tweaked Elm Guide command (run UglifyJS just once with `mangle.reserved`)": (
    code
  ) =>
    UglifyJS.minify(code, {
      compress: {
        pure_funcs: pureFuncs,
        pure_getters: true,
        unsafe_comps: true,
        unsafe: true,
      },
      mangle: {
        reserved: pureFuncs,
      },
    }),
  "Above, plus `passes: 2`": (code) =>
    UglifyJS.minify(code, {
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
    }),
  "Above, plus `passes: 3`": (code) =>
    UglifyJS.minify(code, {
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
    }),
  "UglifyJS with Elm Guide `compress` (but no `mangle`) plus esbuild": (
    code
  ) => {
    const result = UglifyJS.minify(code, {
      compress: {
        pure_funcs: pureFuncs,
        pure_getters: true,
        unsafe_comps: true,
        unsafe: true,
      },
      mangle: false,
    });

    if (result.error !== undefined) {
      throw result.error;
    }

    return esbuild.transformSync(result.code, {
      minify: true,
      target: "es5",
    });
  },
  "Parts of UglifyJS plus esbuild": (code) => {
    const result = UglifyJS.minify(code, {
      compress: {
        ...Object.fromEntries(
          Object.entries(UglifyJS.default_options().compress).map(
            ([key, value]) => [key, value === true ? false : value]
          )
        ),
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

    return esbuild.transformSync(result.code, {
      minify: true,
      target: "es5",
    });
  },
  "Above, but with the slow option `reduce_vars` disabled": (code) => {
    const result = UglifyJS.minify(code, {
      compress: {
        ...Object.fromEntries(
          Object.entries(UglifyJS.default_options().compress).map(
            ([key, value]) => [key, value === true ? false : value]
          )
        ),
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
    });

    if (result.error !== undefined) {
      throw result.error;
    }

    return esbuild.transformSync(result.code, {
      minify: true,
      target: "es5",
    });
  },
  "Just esbuild": (code) =>
    esbuild.transformSync(code, {
      minify: true,
      pure: pureFuncs,
      target: "es5",
    }),
  "Just esbuild with the IIFE trick": (code) => {
    const newCode = `var scope = window;${code.slice(
      code.indexOf("{") + 1,
      code.lastIndexOf("}")
    )}`;

    return esbuild.transformSync(newCode, {
      minify: true,
      pure: pureFuncs,
      target: "es5",
      format: "iife",
    });
  },
  "UglifyJS tradeoff": (code) =>
    UglifyJS.minify(code, {
      compress: {
        ...Object.fromEntries(
          Object.entries(UglifyJS.default_options().compress).map(
            ([key, value]) => [key, value === true ? false : value]
          )
        ),
        pure_funcs: pureFuncs,
        pure_getters: true,
        join_vars: true,
        conditionals: true,
        unused: true,
      },
      mangle: {
        reserved: pureFuncs,
      },
    }),
  "UglifyJS with all `compress` options off (measure `compress` overhead)": (
    code
  ) =>
    UglifyJS.minify(code, {
      compress: {
        ...Object.fromEntries(
          Object.entries(UglifyJS.default_options().compress).map(
            ([key, value]) => [key, value === true ? false : value]
          )
        ),
      },
      mangle: true,
    }),
};

if (variantName === undefined) {
  for (const name of Object.keys(variants)) {
    childProcess.spawnSync(
      "node",
      [__filename, elmInputFile, elmOutputFile, name],
      { stdio: "inherit" }
    );
  }
  process.exit(0);
}

const KiB = 1024;
const MiB = 1024 * KiB;

function printSize(buffer) {
  return buffer.byteLength >= MiB
    ? `${(buffer.byteLength / MiB).toFixed(2)}MiB`
    : `${(buffer.byteLength / KiB).toFixed(0)}KiB`;
}

const elmCode =
  variantName === Object.keys(variants)[0]
    ? ""
    : fs.readFileSync(elmOutputFile, "utf8");
const fn = variants[variantName];
const start = Date.now();
const { code } = fn(elmCode);
const end = Date.now();
const duration = `${((end - start) / 1000).toFixed(1)}s`;
const buffer = Buffer.from(code);
const size = printSize(buffer);
const gzipSize = printSize(zlib.gzipSync(buffer));

console.log(`|${variantName}|${duration}|${size}|${gzipSize}|`);
