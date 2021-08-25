const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const childProcess = require("child_process");
const UglifyJS = require("uglify-js");
const esbuild = require("esbuild");

const args = process.argv.slice(2);
