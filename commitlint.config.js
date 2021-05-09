module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "build", "docs", "ci", "chore", "style", "revert", "perf", "test", "wip", "types"],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "wasm",
        "service",
        "build",
        "playground",
        "package.json",
      ],
    ],
  },
};
