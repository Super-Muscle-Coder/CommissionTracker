// Builds packaging/stage/{python,backend,ui}: the three folders that
// electron-builder copies into resources/ of the packaged app
// (.plan/desktop_plan.md, D2 and tasks 3-4). Run from Desktop/:
//   node packaging/prepare_runtime.mjs
// It first checks the build conditions (powershell.exe in PATH) and deletes
// release/ (electron-builder's output), so that a file held open there stops
// the build at once with a clear message (open issue DSK-5).
// The stage folder is deleted and rebuilt on every run. The downloaded
// Python archive is kept in packaging/cache/ and reused while its SHA-256
// matches python_runtime.json.
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import * as net from 'node:net'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGING = path.dirname(fileURLToPath(import.meta.url))
const DESKTOP = path.dirname(PACKAGING)
const PROJECT = path.dirname(DESKTOP)
const BACKEND = path.join(PROJECT, 'Backend')
const UI = path.join(PROJECT, 'UI')

const RUNTIME_FILE = path.join(PACKAGING, 'python_runtime.json')
const CACHE = path.join(PACKAGING, 'cache')
const STAGE = path.join(PACKAGING, 'stage')
const STAGE_PYTHON = path.join(STAGE, 'python')
const STAGE_SITE_PACKAGES = path.join(STAGE_PYTHON, 'Lib', 'site-packages')
const STAGE_BACKEND = path.join(STAGE, 'backend')
const STAGE_UI = path.join(STAGE, 'ui')

// The virtual environment's interpreter runs pip and extracts the archive;
// the embedded interpreter itself has no pip.
const VENV_PYTHON = path.join(BACKEND, 'env', 'Scripts', 'python.exe')
const REQUIREMENTS = path.join(BACKEND, 'requirements.txt')

// python313._pth decides the whole sys.path of the embedded interpreter
// (paths relative to the folder of the ._pth file). The script's folder is
// not added by Python in this mode, so Backend.py only finds its
// "workflows" package through ..\backend. No "import site": site-packages
// holds no .pth file to process, and site would also add the user's own
// site-packages folder (see the Main's checkpoint).
const PTH_FILE = 'python313._pth'
const PTH_LINES = ['python313.zip', '.', 'Lib\\site-packages', '..\\backend']

// What the packaged backend needs from Backend/: never its tests, its
// virtual environment, caches or Visual Studio files.
const BACKEND_FILES = ['Backend.py']
const BACKEND_DIRS = ['configs', 'workflows']
const BACKEND_SKIPPED_DIRS = new Set(['tests', '__pycache__', '.pytest_cache'])
const BACKEND_EXTENSIONS = new Set(['.py', '.yaml'])

// electron-builder.yml directories.output. Deleted here, before anything
// else, rather than half-way through by electron-builder.
const RELEASE = path.join(DESKTOP, 'release')
// A file held open (the app still running, an antivirus scanning it) makes
// the delete fail with EBUSY or EPERM; it is tried again a few times.
const DELETE_ATTEMPTS = 5
const DELETE_RETRY_DELAY_MS = 3_000

// electron-builder runs "npm list" through powershell.exe, found in PATH.
const POWERSHELL_EXE = 'powershell.exe'
const POWERSHELL_DIR = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0')

const READY_LINE = 'READY'
const SMOKE_READY_TIMEOUT_MS = 60_000
const SMOKE_EXIT_TIMEOUT_MS = 15_000

function step(message) {
  console.log(`[prepare_runtime] ${message}`)
}

function fail(message) {
  console.error(`[prepare_runtime] ERROR: ${message}`)
  process.exit(1)
}

function run(command, args, options = {}) {
  step(`$ ${[command, ...args].join(' ')}`)
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.error) fail(`${command} could not be run: ${result.error.message}`)
  if (result.status !== 0) fail(`${command} exited with code ${result.status}`)
}

function sha256Of(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function folderSize(dir) {
  let total = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) total += fs.statSync(path.join(entry.parentPath, entry.name)).size
  }
  return total
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

// --- 0. build conditions --------------------------------------------------------------

function checkPowerShellInPath() {
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH'
  const dirs = (process.env[pathKey] ?? '').split(path.delimiter).filter((d) => d !== '')
  const hit = dirs.find((d) => fs.existsSync(path.join(d, POWERSHELL_EXE)))
  if (hit === undefined) {
    fail(
      `${POWERSHELL_EXE} is not in PATH; electron-builder needs it and would stop with "spawn ${POWERSHELL_EXE} ENOENT". ` +
        `Add ${POWERSHELL_DIR} to the Path variable (System variables), open a new terminal, and run again.`,
    )
  }
  step(`${POWERSHELL_EXE} found in PATH: ${path.join(hit, POWERSHELL_EXE)}`)
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function remainingFiles(dir, max = 5) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true, recursive: true })
      .filter((e) => e.isFile())
      .slice(0, max)
      .map((e) => path.join(e.parentPath, e.name))
  } catch {
    return []
  }
}

/** Deletes a folder, trying again while a file in it is held open; stops the
 * build with the held file's name when it still cannot be deleted. */
function deleteFolder(dir) {
  for (let attempt = 1; ; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
      step(`deleted ${path.relative(DESKTOP, dir)}${attempt > 1 ? ` (attempt ${attempt}/${DELETE_ATTEMPTS})` : ''}`)
      return
    } catch (err) {
      // rmSync names only the top folder; every other file is gone by now,
      // so the files left are the ones held open.
      const left = remainingFiles(dir)
      const held = left.length > 0 ? left : [err.path ?? dir]
      step(`could not delete ${path.relative(DESKTOP, dir)} (attempt ${attempt}/${DELETE_ATTEMPTS}): ${err.code}; still there: ${held.join(', ')}`)
      if (!['EBUSY', 'EPERM', 'ENOTEMPTY', 'EACCES'].includes(err.code) || attempt >= DELETE_ATTEMPTS) {
        fail(
          `${held[0]} could not be deleted after ${attempt} attempt(s) (${err.code}): a program is holding it open. ` +
            `Close the app if it is running from this folder. To find the program, open Resource Monitor (resmon), ` +
            `tab CPU, "Associated Handles", and search for "${path.basename(held[0])}". If it is an antivirus, add ` +
            `${dir} to its folder exceptions. Then run again.`,
        )
      }
      sleepSync(DELETE_RETRY_DELAY_MS)
    }
  }
}

// --- 1. the embedded Python archive ---------------------------------------------

async function ensureArchive(runtime) {
  fs.mkdirSync(CACHE, { recursive: true })
  const archive = path.join(CACHE, runtime.file)
  if (fs.existsSync(archive) && runtime.sha256 !== '' && sha256Of(archive) === runtime.sha256) {
    step(`using the cached ${runtime.file} (SHA-256 matches)`)
    return archive
  }
  step(`downloading ${runtime.url}`)
  const response = await fetch(runtime.url)
  if (!response.ok) fail(`download failed: HTTP ${response.status}`)
  fs.writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
  const actual = sha256Of(archive)
  if (runtime.sha256 === '') {
    // First download: record the hash, to be checked against python.org.
    runtime.sha256 = actual
    fs.writeFileSync(RUNTIME_FILE, `${JSON.stringify(runtime, null, 2)}\n`)
    step(`recorded SHA-256 ${actual} in ${path.relative(DESKTOP, RUNTIME_FILE)}`)
  } else if (actual !== runtime.sha256) {
    fs.rmSync(archive)
    fail(`SHA-256 of ${runtime.file} is ${actual}, expected ${runtime.sha256}`)
  }
  step(`${runtime.file}: ${fs.statSync(archive).size} bytes, SHA-256 ${actual}`)
  return archive
}

// --- 2. stage/python ---------------------------------------------------------------

function stagePython(archive) {
  fs.mkdirSync(STAGE_PYTHON, { recursive: true })
  run(VENV_PYTHON, ['-m', 'zipfile', '-e', archive, STAGE_PYTHON])
  const dlls = fs.readdirSync(STAGE_PYTHON).filter((f) => f.toLowerCase().endsWith('.dll'))
  step(`DLLs in the archive: ${dlls.join(', ')}`)
  for (const crt of ['vcruntime140.dll', 'vcruntime140_1.dll']) {
    if (!dlls.some((f) => f.toLowerCase() === crt)) fail(`${crt} is missing from the embedded Python: stop and report (plan, task 3)`)
  }
  const pth = path.join(STAGE_PYTHON, PTH_FILE)
  if (!fs.existsSync(pth)) fail(`${PTH_FILE} not found in the archive`)
  step(`original ${PTH_FILE}: ${JSON.stringify(fs.readFileSync(pth, 'utf8'))}`)
  fs.writeFileSync(pth, `${PTH_LINES.join('\r\n')}\r\n`)
  step(`written ${PTH_FILE}: ${JSON.stringify(PTH_LINES)}`)

  // Binary wheels only: a package without a wheel stops the build.
  run(VENV_PYTHON, [
    '-m', 'pip', 'install',
    '--no-input', '--disable-pip-version-check', '--no-compile',
    '--only-binary=:all:',
    '--target', STAGE_SITE_PACKAGES,
    '-r', REQUIREMENTS,
  ])

  // pip --target writes console-script launchers (uvicorn.exe, pytest.exe...)
  // into site-packages\bin. They point at the build machine's virtual
  // environment: useless in the package, and more exe files to scan.
  const bin = path.join(STAGE_SITE_PACKAGES, 'bin')
  if (fs.existsSync(bin)) {
    step(`removing site-packages\\bin: ${fs.readdirSync(bin).join(', ')}`)
    fs.rmSync(bin, { recursive: true, force: true })
  }
}

// --- 3. stage/backend --------------------------------------------------------------

function copyBackendDir(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name)
    const target = path.join(to, entry.name)
    if (entry.isDirectory()) {
      if (!BACKEND_SKIPPED_DIRS.has(entry.name)) copyBackendDir(source, target)
    } else if (entry.isFile() && BACKEND_EXTENSIONS.has(path.extname(entry.name))) {
      fs.mkdirSync(to, { recursive: true })
      fs.copyFileSync(source, target)
    }
  }
}

function stageBackend() {
  fs.mkdirSync(STAGE_BACKEND, { recursive: true })
  for (const file of BACKEND_FILES) fs.copyFileSync(path.join(BACKEND, file), path.join(STAGE_BACKEND, file))
  for (const dir of BACKEND_DIRS) copyBackendDir(path.join(BACKEND, dir), path.join(STAGE_BACKEND, dir))
}

// --- 4. byte code ------------------------------------------------------------------

function compileByteCode() {
  // Unchecked hash-based .pyc: valid whatever the files' modification times
  // become after installation.
  run(path.join(STAGE_PYTHON, 'python.exe'), [
    '-m', 'compileall', '-q', '-f', '-j', '0',
    '--invalidation-mode', 'unchecked-hash',
    STAGE_BACKEND, STAGE_SITE_PACKAGES,
  ])
}

// --- 5. stage/ui ---------------------------------------------------------------------

function stageUi() {
  if (!fs.existsSync(path.join(UI, 'node_modules'))) fail('UI/node_modules is missing: run "npm ci" in UI first')
  // npm is a .cmd file on Windows, run through the shell as one command line.
  run('npm run build', [], { cwd: UI, shell: true })
  const dist = path.join(UI, 'dist')
  if (!fs.existsSync(path.join(dist, 'index.html'))) fail('UI/dist/index.html was not built')
  fs.cpSync(dist, STAGE_UI, { recursive: true })
}

// --- 6. smoke test of the staged backend ----------------------------------------

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

async function smokeTest() {
  const [port, aiPort] = [await freePort(), await freePort()]
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-stage-smoke-'))
  const dbFile = path.join(dataDir, 'CommissionTracker', 'data.db')
  step(`smoke test: staged Backend.py with CT_DB_FILE_PATH=${dbFile}`)
  const child = spawn(path.join(STAGE_PYTHON, 'python.exe'), ['Backend.py'], {
    cwd: STAGE_BACKEND,
    env: {
      ...process.env,
      CT_PORT: String(port),
      CT_DB_FILE_PATH: dbFile,
      CT_AI_SERVICE_BASE_URL: `http://127.0.0.1:${aiPort}`,
      CT_APP_VERSION: JSON.parse(fs.readFileSync(path.join(DESKTOP, 'package.json'), 'utf8')).version,
    },
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
  })
  return new Promise((resolve) => {
    let stdout = ''
    let ready = false
    const timer = setTimeout(() => {
      child.kill()
      fail(`smoke test: no ${READY_LINE} within ${SMOKE_READY_TIMEOUT_MS} ms`)
    }, SMOKE_READY_TIMEOUT_MS)
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
      if (!ready && stdout.split(/\r?\n/).includes(READY_LINE)) {
        ready = true
        clearTimeout(timer)
        step(`smoke test: ${READY_LINE} seen; closing standard input`)
        setTimeout(() => {
          child.kill()
          fail(`smoke test: backend did not exit within ${SMOKE_EXIT_TIMEOUT_MS} ms after stdin closed`)
        }, SMOKE_EXIT_TIMEOUT_MS).unref()
        child.stdin.end()
      }
    })
    child.on('exit', (code) => {
      if (!ready) fail(`smoke test: backend exited with code ${code} before ${READY_LINE}`)
      if (code !== 0) fail(`smoke test: backend exited with code ${code}, expected 0`)
      if (!fs.existsSync(dbFile)) fail(`smoke test: ${dbFile} was not created`)
      step(`smoke test passed: stdout ${JSON.stringify(stdout)}, exit code 0, database created`)
      fs.rmSync(dataDir, { recursive: true, force: true })
      resolve()
    })
  })
}

// --- main ----------------------------------------------------------------------------

checkPowerShellInPath()
deleteFolder(RELEASE)
const runtime = JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'))
if (!fs.existsSync(VENV_PYTHON)) fail(`${VENV_PYTHON} not found`)
const archive = await ensureArchive(runtime)
deleteFolder(STAGE)
stagePython(archive)
stageBackend()
compileByteCode()
stageUi()
await smokeTest()
for (const [name, dir] of [
  ['python (all)', STAGE_PYTHON],
  ['python/Lib/site-packages', STAGE_SITE_PACKAGES],
  ['backend', STAGE_BACKEND],
  ['ui', STAGE_UI],
]) step(`size of stage/${name}: ${mb(folderSize(dir))}`)
step('done')
