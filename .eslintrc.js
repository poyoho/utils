/**
 * @type import("eslint").Linter.Config
 */
module.exports = {
  root: true,
  plugins: ["@poyoho/config"],
  extends: [
    "plugin:@poyoho/config/ts",
    // "plugin:@poyoho/config/stat"
  ],
}
