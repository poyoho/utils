const path = require("path")
const chalk = require("chalk")
const rollup = require("rollup")
const typescript = require("rollup-plugin-typescript2")
const { terser } = require('rollup-plugin-terser')
const pkg = require("../package.json")
const { getPackagesSync } = require("@lerna/project")
const deps = Object.keys(pkg.dependencies || {});

__dirname = path.join(__dirname, "..")

async function build(pkgPath) {
  const esm = await rollup.rollup({
    input: path.resolve(__dirname, `packages/${pkgPath}/index.ts`),
    plugins: [
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            declaration: false,
          },
          "exclude": [
            "node_modules",
            "__tests__",
          ],
        },
        abortOnError: false,
        clean: true,
      }),
    ],
    external(id) {
      // 不打包deps的项目
      return deps.some(k => new RegExp("^" + k).test(id))
      || /^@shared/.test(id) // 不打包packages的包
    },
  })
  console.log(chalk.green(`${pkgPath} done`))
  await esm.write({
    format: "es",
    file: path.resolve(__dirname, `dist/${pkgPath}/index.js`),
    paths(id) {
      if (/^@shared/.test(id)) {
        return id.replace('@shared/', '../')
      }
    }
  })
}

const inputs = getPackagesSync()
  .map(pkg => pkg.name)
  .filter(name => name.includes('@shared'))

inputs.forEach(name => build(name.split('@shared/')[1]))
