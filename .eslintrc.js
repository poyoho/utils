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
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "max-lines-per-function": "off",
    "@typescript-eslint/no-empty-function": "off",
    "sonarjs/cognitive-complexity": "off"
  }
}
