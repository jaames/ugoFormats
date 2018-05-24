const { version } = require("./package");

const banner = `/*!
 * ugo-formats.js v${version}
 * 2018 James Daniel
 * Released under the MIT License
 * github.com/jaames
 */
`

module.exports = {
  banner,
  input: "./src/index.js",
  format: ["umd", "umd-min"],
  moduleName: "ugoFormats",
  js: "buble",
  env: {
    VERSION: version
  }
}