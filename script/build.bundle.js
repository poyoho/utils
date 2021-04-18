const path = require("path")
const rollup = require("rollup")
const typescript = require("rollup-plugin-typescript2")
const pkg = require("../package.json")
const deps = Object.keys(pkg.dependencies || {});

__dirname = path.join(__dirname, "..")

console.log(path.resolve(__dirname, `packages/services/index.ts`),);

export default [
  {
    input: path.resolve(__dirname, `packages/services/index.ts`),
    output: {
      format: "es",
      file: path.resolve(__dirname, `dist/index.js`)
    },
    plugins: [
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            declaration: true,
          },
          "include": [
            "packages/**/*",
            "typings/vue-shim.d.ts",
          ],
          "exclude": [
            "node_modules",
            "packages/**/__tests__/*",
          ],
        },
        abortOnError: false,
        clean: true,
      }),
    ],
    external(id) {
      // 不打包deps的项目
      return deps.some(k => new RegExp("^" + k).test(id))
    }
  }
]
