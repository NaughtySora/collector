"use strict";

const { globSync } = require("node:fs");
const path = require("node:path");

const files = globSync("*.js", { exclude: ["index.js"], cwd: __dirname });

for (const file of files) require(path.join(__dirname, file));
