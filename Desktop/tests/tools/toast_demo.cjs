// Demo for the Project Owner (DSK-17, plan of desktop session 30, task 4): the
// real app run from source on a TEMPORARY data folder (never the real
// %APPDATA%), with the reminder ticker on a short beat, so a real Windows toast
// shows. Test tooling only. Unlike `npm run walkthrough:app -- --reminders` of
// UI/, this tool never calls POST /reminders/checks itself: only the ticker does,
// so the toasts are the ticker's (there that call may take the reminders first).
//
// What it does: starts Desktop with --ct-test-data-dir and a 3 s beat, waits for
// the backend's READY line, then creates one client, three commissions (deadline
// today, long past, none) and saves the reminder settings (deadline reminder "1
// day before" on; a daily digest at the minute after next). Expected: a toast
// "Sắp tới hạn giao: Tranh hạn hôm nay" within about 3 s; a toast "Tổng hợp định
// kỳ: 3 đơn đang mở" at the digest minute (within about a minute). Clicking a toast
// only brings the app window to the front; the page "Nhắc việc" lists both until
// "Đã xem" is pressed. Close the window to end; the temporary data is removed.
//
// Run (from Desktop/, after npm run build here and in UI/):  node tests/tools/toast_demo.cjs
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const LAYER_ROOT = path.resolve(__dirname, '..', '..')
const config = JSON.parse(fs.readFileSync(path.join(LAYER_ROOT, 'configs', 'desktop.json'), 'utf8'))
const flags = config.test_flags
const electron = require(path.join(LAYER_ROOT, 'node_modules', 'electron'))
const two = (n) => String(n).padStart(2, '0')

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-toast-demo-'))
const app = spawn(electron, [LAYER_ROOT, `${flags.data_dir}${dataDir}`, `${flags.reminder_interval_ms}3000`], {
  cwd: LAYER_ROOT,
  stdio: ['ignore', 'inherit', 'pipe'],
})

let log = ''
let seeded = false
app.stderr.on('data', (chunk) => {
  const text = chunk.toString('utf8')
  process.stderr.write(text)
  log += text
  const ready = seeded ? null : /backend READY on port (\d+)/.exec(log)
  if (ready !== null) {
    seeded = true
    seed(`http://${config.boundary.loopback_host}:${ready[1]}`).catch((err) => console.error(`demo: seeding failed: ${err.message}`))
  }
})

async function call(baseUrl, method, route, body, expected) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (response.status !== expected) throw new Error(`${method} ${route}: expected ${expected}, got ${response.status} ${text}`)
  return JSON.parse(text)
}

async function seed(baseUrl) {
  const now = new Date()
  const today = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`
  const client = (await call(baseUrl, 'POST', '/clients', { client_input: { display_name: 'Mai Anh', contacts: [], note: null } }, 201)).client_id
  const make = (title, deadline) =>
    call(baseUrl, 'POST', '/commissions', {
      commission_input: { client_id: client, title, commission_type: null, agreed_price: { amount_minor: 1500000, currency: 'VND' }, deadline, description: null, reference_links: [] },
    }, 201)
  await make('Tranh hạn hôm nay', today)
  await make('Minh họa bìa sách', '2026-01-01')
  await make('Chibi đôi', null)
  const target = new Date(Math.ceil((Date.now() + 3000) / 60000) * 60000)
  const digestTime = `${two(target.getHours())}:${two(target.getMinutes())}`
  await call(baseUrl, 'PUT', '/reminders/settings', {
    reminder_settings_input: {
      periodic: { enabled: true, every: 1, unit: 'days', at_time: digestTime, weekday: null },
      deadline: { enabled: true, lead_times: [{ amount: 1, unit: 'days' }] },
    },
  }, 200)
  console.log('')
  console.log('============ Commission Tracker — thử thông báo ============')
  console.log(`Thư mục dữ liệu tạm: ${dataDir}`)
  console.log('Sẽ hiện thông báo Windows: (1) "Sắp tới hạn giao: Tranh hạn hôm nay" trong khoảng 3 giây;')
  console.log(`(2) "Tổng hợp định kỳ: 3 đơn đang mở" lúc ${digestTime} (trong vòng một phút).`)
  console.log('Bấm vào một thông báo: cửa sổ ứng dụng phải lên trước. Mở mục "Nhắc việc": cả hai nhắc việc còn đó cho tới khi bấm "Đã xem".')
  console.log('Đóng cửa sổ ứng dụng để kết thúc.')
  console.log('=============================================================')
}

app.on('exit', (code) => {
  fs.rmSync(dataDir, { recursive: true, force: true })
  console.log(`toast_demo: the desktop app exited with code ${code}; temporary data removed.`)
  process.exit(code ?? 1)
})
