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

async function buildWASMPackage(name) {
  const rootPath = WASMPkgRoot(name)
  const opts = { cwd: rootPath, stdio: 'pipe' }
  try {
    await runIfNotDry(
      'wasm-pack',
      [
        'build',
        "--target",
        "web"
      ],
      opts
    )
    console.log(chalk.green('Successfully build wasm'))
  } catch (e) {
    throw e
  }
}

async function copyWASMPackage(name) {
  async function copyDist(pkgname) {
    await fs.copy(
      path.resolve(__dirname, `../wasm/${name}/pkg/`, pkgname),
      path.resolve(__dirname, `../packages/service/third/wasm/${name}`, pkgname),
    )
  }
  const copyTask = fs.readdirSync(path.resolve(__dirname, `../wasm/${name}/pkg/`))
    .filter(p => RegExp(`${name}.*`).test(p))
    .map(path => copyDist(path))
  await Promise.all(copyTask)
  console.log(chalk.green(`Successfully copy wasm`))
}

async function main() {
  const name = "hash"
  step('\nBuilding wasm package...')
  await buildWASMPackage(name)

  step('\nCopy wasm package to packages third...')
  await copyWASMPackage(name)
}

main()
