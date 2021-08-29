const fs = require('fs');
const path = require('path');

/**
 * Replace `(function(r){"use strict";` with `const r={};`, then replace `})(this);` with `export const Elm = r.Elm;`.

 * @param {string} filepath 
 */
function iifeToEsm(filepath) {
  if (!filepath.endsWith('.js')) throw 'filepath must end with ".js"';
  const iife = fs.readFileSync(filepath, 'utf8');

  // replace `(function(r){"use strict";` with `const r={};` at the beginning
  const start = iife.indexOf(';', 2);
  if (start === -1) throw 'Could not find the first ";"';
  let match = /\(([a-zA-Z0-9]+)\)/.exec(iife.substring(0, start));
  if (!match) throw 'Could not find the global context variable';
  const varname = match[1]; // 'r'

  // 2. Replace `})(this);` with `export const Elm = r.Elm;` at the end
  const end = iife.lastIndexOf('}');
  if (end === -1) throw 'Could not find last "}"';

  const esm = `const ${varname}={}${iife.slice(start, end)};export const Elm=${varname}.Elm;`;
  const outputpath = filepath.slice(0, -3) + '.mjs';
  fs.writeFileSync(outputpath, esm, 'utf8');
  return outputpath;
}

module.exports = { iifeToEsm };
