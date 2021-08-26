const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const childProcess = require('child_process');
const UglifyJS = require('uglify-js');
const esbuild = require('esbuild');
const { pureFuncs } = require('./common');

/**
 * Minify Elm ESM
 *
 * Note: uglify-js does not operate well on these files
 */
const variants = {};

module.exports = variants;
