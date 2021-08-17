/* eslint-disable no-console */
const UglifyJs = require("uglify-js");
const fs = require("fs");

const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error("Must pass exactly 1 arg: output.js");
  process.exit(1);
}

const [elmOutputFile] = args;

const code = fs.readFileSync(elmOutputFile, "utf8");

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

function minify(options) {
  const result = UglifyJs.minify(code, {
    compress: {
      pure_funcs: pureFuncs,
      pure_getters: true,
      keep_fargs: false,
      unsafe_comps: true,
      unsafe: true,
      ...options,
    },
    mangle: {
      reserved: pureFuncs,
    },
  });

  if (result.error !== undefined) {
    throw result.error;
  }

  return result.code.length;
}

const baseline = minify({});
console.log("baseline", baseline);
for (const [key, value] of Object.entries(
  UglifyJs.default_options().compress
)) {
  if (typeof value === "boolean") {
    console.log(minify({ [key]: false }) - baseline, key);
  }
}
