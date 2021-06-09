const fs = require("fs-extra")
const path = require("path")
const chalk = require('chalk')
const execa = require('execa')
const args = require('minimist')(process.argv.slice(2))

const isDryRun = args.dry
const run = (bin, args, opts = {}) =>
  execa(bin, args, { stdio: 'inherit', ...opts })
const dryRun = (bin, args, opts = {}) =>
  console.log(chalk.blue(`[dryrun] ${bin} ${args.join(' ')}`), opts)
const runIfNotDry = isDryRun ? dryRun : run
const step = msg => console.log(chalk.cyan(msg))

const WASMPkgRoot = (name) => path.resolve(__dirname, '../wasm/', name)

async function buildWASMPackage(name, target) {
  const rootPath = WASMPkgRoot(name)
  const opts = { cwd: rootPath, stdio: 'pipe' }
  try {
    await runIfNotDry(
      'wasm-pack',
      [
        'build',
        "--target",
        target
      ],
      opts
    )
    console.log(chalk.green('Successfully build wasm'))
  } catch (e) {
    console.log(e)
  }
}

async function copyWASMPackage(name, formatJsName) {
  async function copyDist(pkgname) {
    let outName = pkgname
    if (pkgname === name+".js") {
      outName = pkgname.replace(name+".js", name+formatJsName)
    }
    await fs.copy(
      path.join(__dirname, `../wasm/${name}/pkg/`, pkgname),
      path.join(__dirname, `../packages/service/third/wasm/${name}`, outName)
    )
    console.log(chalk.bgBlue("finish"), chalk.gray(outName))
  }
  const copyTask = fs.readdirSync(path.resolve(__dirname, `../wasm/${name}/pkg/`))
    .filter(p => RegExp(`${name}.*`).test(p))
    .map(path => copyDist(path))
  await Promise.all(copyTask)
  console.log(chalk.green(`Successfully copy wasm`))
}

async function main() {
  const name = "hash"
  step('\nBuilding wasm package with web...')
  await buildWASMPackage(name, "web")

  step('\nCopy wasm package to packages third...')
  await copyWASMPackage(name, ".es.js")

  step('\nBuilding wasm package with no-modules...')
  await buildWASMPackage(name, "no-modules")

  step('\nCopy wasm package to packages third...')
  await copyWASMPackage(name, ".js")
}

main()
