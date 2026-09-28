// Start-up time of the packaged app, and a record of every process around it
// (plan of desktop session 13, task 7; session 14, task 6b: DSK-2, DSK-3):
//   node tests/packaged/measure_startup.cjs [runs] [exe or its folder] [label]
// Defaults: 3 runs, release/win-unpacked, label "run".
// Each run starts the exe with a fresh temporary data folder and no dialogs,
// measures from the spawn to the Main's first log line, "backend started",
// "backend READY" and "first load finished", then closes its window
// (taskkill without /F sends WM_CLOSE) so the Main stops the backend
// cleanly. Never touches the user's real %APPDATA%.
// For every run, startup-logs/<label>-run<N>.log holds the whole
// stderr of the exe and, every ~500 ms, a snapshot of every process whose
// image lies in the exe's folder or whose command line holds the run's data
// folder: a second Main or backend that this script did not start shows up
// there, with its parent. One JSON line per run goes to stdout, and all of
// them to startup-logs/<label>-summary.json, with the exe's SHA-256
// (hashed only after the runs: reading the file first could trigger a scan
// and change the first run).
'use strict'

const { execFileSync, spawn } = require('node:child_process')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const layerRoot = path.resolve(__dirname, '..', '..')
const config = JSON.parse(fs.readFileSync(path.join(layerRoot, 'configs', 'desktop.json'), 'utf8'))
const productName = JSON.parse(fs.readFileSync(path.join(layerRoot, 'package.json'), 'utf8')).productName
const exeName = `${productName}.exe`

const runs = Number(process.argv[2] ?? 3)
const target = path.resolve(process.argv[3] ?? path.join(layerRoot, 'release', 'win-unpacked'))
const exe = target.toLowerCase().endsWith('.exe') ? target : path.join(target, exeName)
const exeDir = path.dirname(exe)
const label = process.argv[4] ?? 'run'
// Not under test-results/: Playwright empties that folder on every run.
const outDir = path.join(layerRoot, 'startup-logs')

const TIMEOUT_MS = 120_000
const SNAPSHOT_EVERY_MS = 500
// Keep watching after the Main exits: a copy started by someone else may
// still be running.
const WATCH_AFTER_EXIT_MS = 5_000
const SYSTEM32 = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32')
const TASKKILL = path.join(SYSTEM32, 'taskkill.exe')
const POWERSHELL = path.join(SYSTEM32, 'WindowsPowerShell', 'v1.0', 'powershell.exe')
// FILETIME (100 ns since 1601) -> Unix ms.
const fileTimeToMs = (ft) => Number(BigInt(ft) / 10_000n - 11_644_473_600_000n)

/** A PowerShell process that appends one JSON line per snapshot to
 * snapFile until killed. It writes to a file, not to a pipe: spawn() of the
 * exe can block this script's event loop for a minute (DSK-2), and a full
 * pipe would then stop the snapshots too. CreationDate goes out as a
 * FILETIME string (see tests/helpers.ts). */
function startWatcher(dataDir, snapFile) {
  const q = (s) => `'${s.replace(/'/g, "''")}'`
  const script = `
$ProgressPreference = 'SilentlyContinue'
$dir = ${q(exeDir + path.sep)}; $dd = ${q(dataDir)}; $out = ${q(snapFile)}
function FileTimeOf($d) { if ($d) { $d.ToFileTimeUtc().ToString() } else { $null } }
while ($true) {
  $t0 = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $all = Get-CimInstance Win32_Process
  $byId = @{}; foreach ($p in $all) { $byId[[int]$p.ProcessId] = $p }
  $rows = @(foreach ($p in $all) {
    $hit = ($p.ExecutablePath -and $p.ExecutablePath.StartsWith($dir, [StringComparison]::OrdinalIgnoreCase)) -or ($p.CommandLine -and $p.CommandLine.Contains($dd))
    if ($hit) {
      $par = $byId[[int]$p.ParentProcessId]
      [pscustomobject]@{ pid = $p.ProcessId; ppid = $p.ParentProcessId; name = $p.Name; created = (FileTimeOf $p.CreationDate);
        parent = $(if ($par) { $par.Name } else { $null }); parentCreated = $(if ($par) { FileTimeOf $par.CreationDate } else { $null });
        cmd = $p.CommandLine; exe = $p.ExecutablePath }
    }
  })
  $line = ConvertTo-Json -Compress -Depth 4 -InputObject ([pscustomobject]@{ t = $t0; rows = $rows })
  [IO.File]::AppendAllText($out, $line + [char]10)
  $left = ${SNAPSHOT_EVERY_MS} - ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $t0)
  if ($left -gt 0) { Start-Sleep -Milliseconds $left }
}`
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  return spawn(POWERSHELL, ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
    stdio: ['ignore', 'ignore', 'inherit'],
    windowsHide: true,
  })
}

function lineSplitter(onLine) {
  let pending = ''
  return (chunk) => {
    pending += chunk
    let end
    while ((end = pending.indexOf('\n')) >= 0) {
      onLine(pending.slice(0, end).replace(/\r$/, ''))
      pending = pending.slice(end + 1)
    }
  }
}

const isMain = (r) => r.name === exeName && !(r.cmd ?? '').includes('--type=')
const isPython = (r) => /^python/i.test(r.name)

function once(run) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-startup-'))
  const logFile = path.join(outDir, `${label}-run${run}.log`)
  const snapFile = path.join(outDir, `${label}-run${run}.snapshots.jsonl`)
  fs.rmSync(snapFile, { force: true })
  const watcher = startWatcher(dataDir, snapFile)
  return new Promise((resolve) => {
    let started = null
    const ms = () => (started === null ? 0 : Number((process.hrtime.bigint() - started) / 1_000_000n))
    // Log entries [ms since spawn, text], merged with the snapshots and
    // written to the log file when the run ends.
    const entries = []
    const note = (line) => entries.push([ms(), line])
    let spawnEpoch = null
    // Let the watcher take one snapshot before the spawn.
    const waitFirst = setInterval(() => {
      if (fs.existsSync(snapFile) && fs.statSync(snapFile).size > 0) {
        clearInterval(waitFirst)
        launch()
      }
    }, 50)

    const result = {
      label,
      run,
      exe,
      main_pid: null,
      main_created_ms: null,
      first_log_ms: null,
      backend_started_ms: null,
      ready_ms: null,
      window_loaded_ms: null,
      close_sent_ms: null,
      exit_ms: null,
      exit_code: null,
      fatal: false,
      timed_out: false,
      extra_main_instances: 0,
      extra_mains: [],
      backends: [],
      backend_exit_without_stop_line: [],
      dsk8_sandbox_access_denied: 0,
      gpu_cache_in_use: 0,
      failed_real_location: 0,
      log_file: path.relative(layerRoot, logFile),
    }
    let text = ''
    let timer = null
    let child = null

    function launch() {
      note(`SPAWN ${exe} (data folder ${dataDir})`)
      started = process.hrtime.bigint()
      spawnEpoch = Date.now()
      child = spawn(exe, [`${config.test_flags.data_dir}${dataDir}`, config.test_flags.no_dialog], {
        cwd: exeDir,
        stdio: ['ignore', 'ignore', 'pipe'],
      })
      result.main_pid = child.pid
      note(`SPAWNED pid ${child.pid}`)
      timer = setTimeout(() => {
        result.timed_out = true
        note(`TIMEOUT: no "first load finished" within ${TIMEOUT_MS} ms; taskkill /F /T`)
        try {
          execFileSync(TASKKILL, ['/F', '/T', '/PID', String(child.pid)])
        } catch {
          // already gone
        }
      }, TIMEOUT_MS)
      child.stderr.setEncoding('utf8')
      child.stderr.on(
        'data',
        lineSplitter((line) => {
          text += `${line}\n`
          note(line)
          if (result.first_log_ms === null && line.includes('[desktop-main] ')) result.first_log_ms = ms()
          if (result.backend_started_ms === null && /backend started \(pid \d+\)/.test(line)) result.backend_started_ms = ms()
          if (result.ready_ms === null && /backend READY on port \d+/.test(line)) result.ready_ms = ms()
          if (result.window_loaded_ms === null && /first load finished/.test(line)) {
            result.window_loaded_ms = ms()
            clearTimeout(timer)
            result.close_sent_ms = ms()
            note(`CLOSE: taskkill /PID ${child.pid} (WM_CLOSE)`)
            execFileSync(TASKKILL, ['/PID', String(child.pid)])
          }
        }),
      )
      child.on('exit', (code, signal) => {
        clearTimeout(timer)
        result.exit_code = code
        result.exit_ms = ms()
        note(`EXIT code ${code}${signal ? ` signal ${signal}` : ''}`)
        setTimeout(finish, WATCH_AFTER_EXIT_MS)
      })
    }

    function finish() {
      watcher.kill()
      const snapshots = []
      for (const line of fs.readFileSync(snapFile, 'utf8').split('\n')) {
        try {
          snapshots.push(JSON.parse(line))
        } catch {
          // empty, or cut short by the kill
        }
      }
      fs.rmSync(snapFile, { force: true })
      for (const snap of snapshots) {
        const at = snap.t - spawnEpoch
        entries.push([at, `SNAPSHOT (taken ${at < 0 ? 'before spawn' : `+${at} ms`}) ${JSON.stringify(snap.rows)}`])
      }
      analyse(result, text, snapshots, spawnEpoch)
      try {
        fs.rmSync(dataDir, { recursive: true, force: true })
      } catch (e) {
        // Another process (a second Main) still holds the data folder.
        result.data_folder_left = `${dataDir} (${e.code})`
        entries.push([ms(), `DATA FOLDER NOT DELETED: ${dataDir} (${e.code}); a process still uses it`])
      }
      entries.push([ms(), `RESULT ${JSON.stringify(result)}`])
      entries.sort((a, b) => a[0] - b[0])
      fs.writeFileSync(logFile, entries.map(([at, line]) => `[+${String(at).padStart(6)} ms] ${line}\n`).join(''))
      resolve(result)
    }
  })
}

/** Every distinct process (PID + creation time) seen in the snapshots. */
function distinct(snapshots) {
  const seen = new Map()
  for (const s of snapshots) {
    for (const r of s.rows) {
      const key = `${r.pid}/${r.created}`
      if (!seen.has(key)) seen.set(key, { ...r, first_seen: s.t })
    }
  }
  return [...seen.values()]
}

function analyse(result, text, snapshots, spawnEpoch) {
  const procs = distinct(snapshots)
  const last = snapshots.length === 0 ? [] : snapshots[snapshots.length - 1].rows
  const ours = procs.find((r) => r.pid === result.main_pid && isMain(r))
  if (ours !== undefined && ours.created !== null) result.main_created_ms = fileTimeToMs(ours.created) - spawnEpoch
  const sameCmd = (r) => ours !== undefined && r.cmd === ours.cmd
  const dataFlag = (r) => (r.cmd ?? '').includes(config.test_flags.data_dir)
  result.extra_mains = procs
    .filter((r) => isMain(r) && r.pid !== result.main_pid && dataFlag(r))
    .map((r) => ({
      pid: r.pid,
      parent_pid: r.ppid,
      parent: r.parent,
      created_ms: r.created === null ? null : fileTimeToMs(r.created) - spawnEpoch,
      same_command_line: sameCmd(r),
      still_running_at_end: last.some((x) => x.pid === r.pid && x.created === r.created),
      cmd: r.cmd,
    }))
  result.extra_main_instances = result.extra_mains.length
  // Mains from the same folder without the test data folder (would use the
  // real %APPDATA%): not expected at all, reported apart.
  result.other_mains_in_folder = procs.filter((r) => isMain(r) && r.pid !== result.main_pid && !dataFlag(r)).length
  result.backends = procs
    .filter(isPython)
    .map((r) => ({
      pid: r.pid,
      parent_pid: r.ppid,
      parent: r.parent,
      created_ms: r.created === null ? null : fileTimeToMs(r.created) - spawnEpoch,
      child_of_our_main: r.ppid === result.main_pid,
    }))
  // A backend that exited with code 0 while nobody stopped it, and without
  // its own stop lines (Backend.py: "standard input closed", uvicorn:
  // "Shutting down"), was ended from outside.
  for (const m of text.matchAll(/backend \(pid (\d+)\) exited with code 0/g)) {
    const stopped = text.includes(`stopping backend (pid ${m[1]})`)
    const ownLines = /standard input closed|Shutting down/.test(text)
    if (!stopped || !ownLines) result.backend_exit_without_stop_line.push({ pid: Number(m[1]), stopped_by_main: stopped, own_stop_lines: ownLines })
  }
  // A launch with the same data folder while our Main holds the instance
  // lock: our Main logs it (it may live too briefly for a snapshot).
  result.second_instance_events = (text.match(/\[desktop-main\] second-instance:/g) ?? []).length
  result.fatal = /FATAL/.test(text)
  result.dsk8_sandbox_access_denied = (text.match(/Failed to grant sandbox access/g) ?? []).length
  result.gpu_cache_in_use = (text.match(/being used by another process/g) ?? []).length
  result.failed_real_location = (text.match(/Failed to find real location/g) ?? []).length
}

;(async () => {
  if (!fs.existsSync(exe)) throw new Error(`${exe} not found: run "npm run dist" first`)
  fs.mkdirSync(outDir, { recursive: true })
  const results = []
  for (let run = 1; run <= runs; run++) {
    const r = await once(run)
    console.log(JSON.stringify(r))
    results.push(r)
  }
  const sha256 = createHash('sha256').update(fs.readFileSync(exe)).digest('hex')
  const summary = { label, exe, exe_sha256: sha256, measured_at: new Date().toISOString(), results }
  fs.writeFileSync(path.join(outDir, `${label}-summary.json`), `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`exe SHA-256 ${sha256}; summary in ${path.relative(layerRoot, path.join(outDir, `${label}-summary.json`))}`)
  const suspicious = (r) =>
    r.fatal ||
    r.timed_out ||
    r.exit_code !== 0 ||
    r.extra_main_instances > 0 ||
    r.second_instance_events > 0 ||
    r.other_mains_in_folder > 0 ||
    r.data_folder_left !== undefined
  if (results.some(suspicious)) process.exitCode = 1
})().catch((e) => {
  console.error(e.message)
  process.exitCode = 1
})
