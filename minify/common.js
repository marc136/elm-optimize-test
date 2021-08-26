const ClosureCompiler = require('google-closure-compiler').compiler;

const pureFuncs = 'F2,F3,F4,F5,F6,F7,F8,F9,A2,A3,A4,A5,A6,A7,A8,A9'.split(',');

/**
 *
 * @param {Object} config See https://github.com/google/closure-compiler/wiki/Flags-and-Options
 * @returns void
 */
async function compileWithGoogleClosureCompiler(config) {
  return new Promise((resolve, reject) => {
    new ClosureCompiler(config).run((exitCode, stdOut, stdErr) => {
      if (exitCode === 0) resolve(stdOut);
      else {
        console.error(`google-closure-compiler failed with exit code '${exitCode}'`);
        console.error(stdErr);
        reject(stdErr);
      }
    });
  });
}

module.exports = { pureFuncs, compileWithGoogleClosureCompiler };
