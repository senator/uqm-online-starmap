#!/usr/bin/env node

var fs = require("fs");

var OUT_DIR = "www/lib/gamedata";
var OUT_NAME = "condensed.js"
var IN_DIR = "data";

if (!fs.existsSync(IN_DIR) || !fs.existsSync(OUT_DIR)) {
  throw new Error("Expected to be able to see " + IN_DIR + " and " +
      OUT_DIR + " from here. Change directories?");
}

var all_data = {};
var ext_re = /.json$/;

fs.readdirSync(IN_DIR).filter(
  function(fn) {
    return Boolean(fn.match(ext_re));
  }
).forEach(
  function(fn) {
    /* XXX nodejs' require() looks for modules relative to the script's
     * location, not the current working directory, hence the ".." below.
     *
     * This means that if this script or the data directory is moved to
     * another path, this might have to be changed. */
    all_data[fn.replace(ext_re, '')] = require("../" + IN_DIR + "/" + fn)
  }
);

var output_file = OUT_DIR + "/" + OUT_NAME;
fs.writeFile(
  output_file,
  "define([], function() {\n  return " +
    JSON.stringify(all_data) +
    ";\n});"
);

console.log("Game data built as: " + output_file);
