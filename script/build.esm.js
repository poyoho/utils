const path = require("path")
const chalk = require("chalk")
const rollup = require("rollup")
const typescript = require("rollup-plugin-typescript2")
const { terser } = require('rollup-plugin-terser')
const dts = require("rollup-plugin-dts")
const { getPackagesSync } = require("@lerna/project")

__dirname = path.join(__dirname, "..")

async function build(pkgPath) {
  const pkgs = require(path.resolve(__dirname, `packages/${pkgPath}/package.json`)).peerDependencies || {}
  const deps = Object.keys(pkgs)
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
    file: path.resolve(__dirname, `packages/${pkgPath}/dist/index.js`),
  })
}

async function builddts(pkgPath) {
  const pkgs = require(path.resolve(__dirname, `packages/${pkgPath}/package.json`)).peerDependencies || {}
  const deps = Object.keys(pkgs)
  const esm = await rollup.rollup({
    input: path.resolve(__dirname, `packages/${pkgPath}/index.ts`),
    plugins: [
      dts.default(),
    ],
    external(id) {
      // 不打包deps的项目
      return deps.some(k => new RegExp("^" + k).test(id))
        || /^@shared/.test(id) // 不打包packages的包
    },
  })
  console.log(chalk.blueBright(`${pkgPath} dts done`))
  await esm.write({
    file: path.resolve(__dirname, `packages/${pkgPath}/dist/index.d.ts`),
    format: "es",
  })
}

const inputs = getPackagesSync()
  .map(pkg => pkg.name)
  .filter(name => name.includes('@shared'))

inputs.forEach(pkg => {
  const name = pkg.split('@shared/')[1]
  build(name)
  builddts(name)
})
