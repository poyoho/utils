const fs = require("fs-extra")
const path = require("path")
const chalk = require('chalk')
const execa = require('execa')
const args = require('minimist')(process.argv.slice(2))

const isDryRun = args.dry
const getWASMPkgRoot = pkg => path.resolve(__dirname, '../wasm/lib/', pkg)

const run = (bin, args, opts = {}) =>
  execa(bin, args, { stdio: 'inherit', ...opts })
const dryRun = (bin, args, opts = {}) =>
  console.log(chalk.blue(`[dryrun] ${bin} ${args.join(' ')}`), opts)
const runIfNotDry = isDryRun ? dryRun : run
const step = msg => console.log(chalk.cyan(msg))

async function buildWASMPackage(pkgname) {
  const pkgRoot = getWASMPkgRoot(pkgname)
  const opts = { cwd: pkgRoot, stdio: 'pipe' }
  try {
    await runIfNotDry(
      'set',
      ['"GOARCH"="wasm"'],
      opts
    )
    await runIfNotDry(
      'set',
      ['"GOOS"="js"',],
      opts
    )
    await runIfNotDry(
      'go',
      ['build', '-o', `../../dist/${pkgname}.wasm`,],
      opts
    )
    console.log(chalk.green(`Successfully build wasm/${pkgname}`))
  } catch (e) {
    throw e
  }
}

async function copyWASMPackage(pkgname) {
  await fs.copy(
    path.resolve(__dirname, '../wasm/dist/', `${pkgname}.wasm`),
    path.resolve(__dirname, '../packages/service/src/third/', `${pkgname}.wasm`),
  )
  console.log(chalk.green(`Successfully copy wasm/${pkgname}`))
}

async function main() {
  const pkgname = "hash"

  step('\nBuilding wasm package...')
  await buildWASMPackage(pkgname)

  step('\nCopy wasm package to packages third...')
  await copyWASMPackage(pkgname)
}

main()
