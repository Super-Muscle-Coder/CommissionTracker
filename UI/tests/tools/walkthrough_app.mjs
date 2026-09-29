// npm run walkthrough:app [-- --empty | -- --commissions]
//
// Starts the real desktop app (built UI/dist, real Backend.py behind the
// switchable fixture) on a temporary data folder, reads the backend port from
// the desktop Main's log, loads sample data, and prints how to switch the
// backend off and on. Runs until the app window is closed; then removes the
// data folder. Sample data: by default the D1 sample (clients); with
// --commissions the D2 sample (its own clients and three commissions); with
// --empty none.
//
// For the Project Owner running the walkthroughs by hand
// (src/screens/pages/{client_list,client_detail,client_form,commission_list,
// commission_detail,commission_form}/walkthrough.yaml).
// The runner name printed (and written by the automated run) comes from
// CT_WALKTHROUGH_RUNNER. Test tooling only.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  DESKTOP_ROOT,
  EXPECTED_ACTIVE,
  EXPECTED_ARCHIVED,
  UI_ROOT,
  baseUrlFor,
  clearSession,
  D2_EXPECTED_LIST,
  electronBinary,
  launchArgs,
  makeDataDir,
  portFromLog,
  RUNNER_VARIABLE,
  SAMPLE_DETAILED,
  seedCommissionSample,
  seedSampleData,
  walkthroughRunner,
  writeSession,
} from './walkthrough_lib.mjs'

const empty = process.argv.includes('--empty')
const commissions = !empty && process.argv.includes('--commissions')

if (!fs.existsSync(path.join(DESKTOP_ROOT, 'dist', 'main.js'))) {
  console.error('Desktop is not built: run npm run build in Desktop/ first.')
  process.exit(1)
}
if (!fs.existsSync(path.join(UI_ROOT, 'dist', 'index.html'))) {
  console.error('UI/dist is missing: run npm run build in UI/ first.')
  process.exit(1)
}

const dataDir = makeDataDir()
const app = spawn(electronBinary(), launchArgs(dataDir, { noDialog: false }), {
  cwd: DESKTOP_ROOT,
  stdio: ['ignore', 'inherit', 'pipe'],
})

let log = ''
let started = false
app.stderr.on('data', (chunk) => {
  const text = chunk.toString('utf8')
  process.stderr.write(text)
  log += text
  const port = started ? null : portFromLog(log)
  if (port !== null) {
    started = true
    void onReady(baseUrlFor(port))
  }
})

async function onReady(baseUrl) {
  writeSession({ dataDir, baseUrl, pid: app.pid ?? null })
  if (commissions) {
    await seedCommissionSample(baseUrl)
  } else if (!empty) {
    await seedSampleData(baseUrl)
  }
  console.log('')
  console.log('============ Commission Tracker — walkthrough ============')
  console.log(`Người chạy (${RUNNER_VARIABLE}): ${walkthroughRunner()}`)
  console.log(`Thư mục dữ liệu tạm: ${dataDir}`)
  console.log(`Backend (qua fixture bật/tắt được): ${baseUrl}`)
  if (empty) {
    console.log('Cơ sở dữ liệu TRỐNG.')
  } else if (commissions) {
    console.log('ĐÃ NẠP XONG dữ liệu mẫu D2 (đơn hàng). Mở mục "Đơn hàng" để thấy nó.')
    console.log('  Đơn hàng, thứ tự mong đợi (mới sửa nhất trước):')
    for (const [title, detail] of D2_EXPECTED_LIST) console.log(`    ${title} — ${detail}`)
    console.log('  Khách "Lan Chi" đã lưu trữ; khách đang hoạt động: Mai Anh, Quốc Bảo.')
  } else {
    console.log(`ĐÃ NẠP XONG dữ liệu mẫu. Bấm "Tải lại" trên trang để thấy nó.`)
    console.log(`  Khách có liên hệ và ghi chú: ${SAMPLE_DETAILED.display_name}`)
    console.log(`  Đang hoạt động, thứ tự mong đợi: ${EXPECTED_ACTIVE.join(', ')}`)
    console.log(`  Đã lưu trữ: ${EXPECTED_ARCHIVED.join(', ')}`)
  }
  console.log('Tắt / bật backend (từ thư mục UI, ở một cửa sổ lệnh khác):')
  console.log('  npm run walkthrough:backend -- down')
  console.log('  npm run walkthrough:backend -- up')
  console.log('Đóng cửa sổ ứng dụng để kết thúc.')
  console.log('==============================================================================')
}

app.on('exit', (code) => {
  clearSession()
  fs.rmSync(dataDir, { recursive: true, force: true })
  console.log(`walkthrough:app: the desktop app exited with code ${code}; temporary data removed.`)
  process.exit(code ?? 1)
})
