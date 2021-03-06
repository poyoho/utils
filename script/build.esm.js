const path = require("path")
const chalk = require("chalk")
const rollup = require("rollup")
const typescript = require("rollup-plugin-typescript2")
const { terser  } = require("rollup-plugin-terser")
// const dts = require("rollup-plugin-dts")
const esbuild = require("rollup-plugin-esbuild")
const { importMetaAssets } = require("@web/rollup-plugin-import-meta-assets")
const fs = require("fs-extra")
const rm = require("rimraf")

__dirname = path.join(__dirname, "..")

async function build(pkgPath, subPath) {
  const pkgs = require(path.resolve(__dirname, `packages/${pkgPath}/package.json`)).peerDependencies || {}
  const deps = Object.keys(pkgs)
  console.log(path.resolve(__dirname, `packages/${pkgPath}/${subPath}/index.ts`))
  const esm = await rollup.rollup({
    input: path.resolve(__dirname, `packages/${pkgPath}/${subPath}/index.ts`),
    plugins: [
      esbuild({
        tsconfig: path.resolve(__dirname, "tsconfig.json"),
        exclude: [
          "node_modules",
          "__tests__",
        ],
      }),
      importMetaAssets(),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      }),
    ],
    external(id) {
      // 不打包deps的项目
      return deps.some(k => new RegExp("^" + k).test(id))
      || /^@poyoho\/shared-/.test(id) // 不打包packages的包
    },
  })
  await esm.write({
    format: "es",
    sourcemap: true,
    dir: path.resolve(__dirname, `packages/${pkgPath}/dist/${subPath}`),
  })
  console.log(chalk.green(`${pkgPath}/${subPath} done`))
}

async function builddts(pkgPath) {
  const pkgs = require(path.resolve(__dirname, `packages/${pkgPath}/package.json`)).peerDependencies || {}
  const deps = Object.keys(pkgs)
  const esm = await rollup.rollup({
    input: path.resolve(__dirname, `packages/${pkgPath}/index.ts`),
    plugins: [
      typescript({
        // 修改tsconfig配置
        tsconfigOverride: {
          "exclude": [
            "node_modules",
            "packages/**/__tests__/*",
          ],
          include: [
            `packages/${pkgPath}/**/*`
          ]
        },
        tsconfig: path.resolve(__dirname, "tsconfig.json"),
        abortOnError: false,
      }),
      importMetaAssets(),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      }),
    ],
    external(id) {
      // 不打包deps的项目
      return deps.some(k => new RegExp("^" + k).test(id))
    },
  })
  const outputDir = path.resolve(__dirname, `packages/${pkgPath}/dist/`)
  await esm.write({
    dir: outputDir,
    format: "es",
    sourcemap: true
  })
  fs.move(path.join(outputDir, "index.js"), path.join(outputDir, "indes.esm.js"))
  console.log(chalk.blueBright(`${pkgPath} dts done`))
}

function rmDir(dir) {
  return new Promise((resolve) => {
    rm(dir, {}, () => {
      resolve()
    })
  })
}

async function packaging(name, externalList) {
  const pkgPath = path.resolve(__dirname, `packages/${name}/`)
  await rmDir(path.join(pkgPath, "dist"))
  const subPaths = fs.readdirSync(pkgPath).map(el => el.replace(pkgPath, "")).filter(el => !externalList.includes(el))

  subPaths.forEach(p => build(name, p))
  builddts(name)
}


// services
function main() {
  const baseBlackList = ["index.ts", "package.json", "dist"]
  packaging("service", [...baseBlackList, "third"])
  packaging("util", baseBlackList)
}

main()

