// npm run walkthrough:app [-- --empty | -- --commissions | -- --progress | -- --payments | -- --income | -- --reminders] [-- --keep]
// npm run walkthrough:app -- --reopen
//
// --keep (chặng F, session 37): do not remove the temporary data folder when the app closes; its path is
// written to a file of its own (KEPT_FILE of walkthrough_lib.mjs, in the system temp folder), so that
// --reopen can start the app again on that same folder. A kept folder that an earlier --keep left behind
// and nobody reopened is removed first (it is this tool's own temporary folder).
// --reopen: open the app again on the data folder of the last --keep run (no sample data, nothing created).
// It does NOT pass --ct-test-no-dialog (nor does the first run): the dialog the desktop shows after it
// applied a prepared restore is the real one, and the person reads its text and sees whether it comes to
// the front (DSK-25). The fixture's control file is set to `up` first: a `down` left in it would switch the
// backend off right after it is READY. When the reopened app exits with code 0 the folder and the kept
// file are removed; on any other exit the folder is kept, and its path is printed.
// The data folder is always a temporary one given with --ct-test-data-dir: never the real %APPDATA%.
//
// Starts the real desktop app (built UI/dist, real Backend.py behind the
// switchable fixture) on a temporary data folder, reads the backend port from
// the desktop Main's log, loads sample data, and prints how to switch the
// backend off and on. Runs until the app window is closed; then removes the
// data folder. Sample data: by default the D1 sample (clients); with
// --commissions the D2 sample (its own clients and three commissions); with
// --progress the D3 sample (the D2 sample, one more commission, stages set);
// with --payments the D4 sample (the D2 sample and payments on two of its
// commissions); with --reminders the D6 sample (three commissions, settings saved, and two reminders made by this tool, which waits up to a minute for the digest); with --income the D5 sample (the D4 sample, a second month of
// USD, and a cancelled commission with a payment); with --empty none.
//
// For the Project Owner running the walkthroughs by hand
// (src/screens/pages/{client_list,client_detail,client_form,commission_list,
// commission_detail,commission_form,progress_board,stage_change,payment_list,
// payment_form,income_report,reminder_list,reminder_settings}/walkthrough.yaml).
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
  D3_EXPECTED_BOARD,
  d6ExpectedReminders,
  D5_PERIODS,
  electronBinary,
  KEPT_FILE,
  launchArgs,
  makeDataDir,
  portFromLog,
  resetFixtureControl,
  RUNNER_VARIABLE,
  SAMPLE_DETAILED,
  seedCommissionSample,
  seedIncomeSample,
  seedPaymentSample,
  seedProgressSample,
  seedReminderSample,
  seedSampleData,
  walkthroughRunner,
  writeSession,
} from './walkthrough_lib.mjs'

const keep = process.argv.includes('--keep')
const reopen = process.argv.includes('--reopen')
if (keep && reopen) {
  console.error('--keep and --reopen do not go together: --keep ends a run, --reopen starts the next one.')
  process.exit(1)
}
const empty = process.argv.includes('--empty')
const reminders = !empty && process.argv.includes('--reminders')
const income = !empty && !reminders && process.argv.includes('--income')
const payments = !empty && !reminders && !income && process.argv.includes('--payments')
const progress = !empty && !reminders && !income && !payments && process.argv.includes('--progress')
const commissions = !empty && !reminders && !income && !payments && !progress && process.argv.includes('--commissions')

if (!fs.existsSync(path.join(DESKTOP_ROOT, 'dist', 'main.js'))) {
  console.error('Desktop is not built: run npm run build in Desktop/ first.')
  process.exit(1)
}
if (!fs.existsSync(path.join(UI_ROOT, 'dist', 'index.html'))) {
  console.error('UI/dist is missing: run npm run build in UI/ first.')
  process.exit(1)
}

// The folder an earlier --keep run left, if any (its own temporary folder).
function readKeptFolder() {
  if (!fs.existsSync(KEPT_FILE)) return null
  const { dataDir: kept } = JSON.parse(fs.readFileSync(KEPT_FILE, 'utf8'))
  return typeof kept === 'string' ? kept : null
}

let dataDir
if (reopen) {
  const kept = readKeptFolder()
  if (kept === null || !fs.existsSync(kept)) {
    console.error('Nothing to reopen: run npm run walkthrough:app -- --keep first, close its window, then --reopen.')
    process.exit(1)
  }
  dataDir = kept
  // A `down` left in the control file would switch the backend off again as soon as it is READY.
  resetFixtureControl(dataDir)
} else {
  if (keep) {
    // A folder kept by an earlier --keep and never reopened is this tool's own: remove it first.
    const stale = readKeptFolder()
    if (stale !== null) {
      fs.rmSync(stale, { recursive: true, force: true })
      fs.rmSync(KEPT_FILE, { force: true })
      console.log(`Removed the folder an earlier --keep run left behind: ${stale}`)
    }
  }
  dataDir = makeDataDir()
}
// No --ct-test-no-dialog, for the first run and for --reopen: the dialogs are the real ones.
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
  let reminderSample = null
  if (reopen) {
    // Nothing is made: the data is what the last run left, after the restore the desktop has just applied.
  } else if (reminders) {
    console.log('Đang nạp dữ liệu mẫu D6: chờ qua phút của nhắc việc tổng hợp (tối đa khoảng một phút)…')
    reminderSample = await seedReminderSample(baseUrl)
  } else if (income) {
    await seedIncomeSample(baseUrl)
  } else if (payments) {
    await seedPaymentSample(baseUrl)
  } else if (progress) {
    await seedProgressSample(baseUrl)
  } else if (commissions) {
    await seedCommissionSample(baseUrl)
  } else if (!empty) {
    await seedSampleData(baseUrl)
  }
  console.log('')
  console.log('============ Commission Tracker — walkthrough ============')
  console.log(`Người chạy (${RUNNER_VARIABLE}): ${walkthroughRunner()}`)
  console.log(`Thư mục dữ liệu tạm: ${dataDir}`)
  console.log(`Backend (qua fixture bật/tắt được): ${baseUrl}`)
  if (reopen) {
    console.log('ĐÃ MỞ LẠI trên thư mục dữ liệu của lần trước (--reopen). Không nạp dữ liệu mẫu, và KHÔNG có --ct-test-no-dialog:')
    console.log('  nếu lần trước đã "Chuẩn bị khôi phục", Desktop đã áp dụng nó trước khi mở cửa sổ và hiện hộp thoại "Khôi phục dữ liệu" THẬT.')
    console.log('  Ghi lại: chữ trên hộp thoại; hộp thoại có tự lên trên cùng không, có tiêu điểm không (DSK-25). Rồi bấm "Đóng".')
    console.log('  Kiểm: khách thêm sau bản sao lưu đã không còn; trang "Khôi phục" không còn lần chờ nào.')
  } else if (empty) {
    console.log('Cơ sở dữ liệu TRỐNG.')
  } else if (reminders && reminderSample !== null) {
    console.log('ĐÃ NẠP XONG dữ liệu mẫu D6 (nhắc việc). Mở mục "Nhắc việc". Giao diện không tự tạo nhắc việc; công cụ này đã gọi POST /reminders/checks một lần.')
    console.log('  Hai nhắc việc đang chờ, cũ nhất trước (ngày theo ngày chạy hôm nay):')
    for (const [main, detail] of d6ExpectedReminders(reminderSample)) console.log(`    ${main} — ${detail}`)
    console.log('  Cài đặt đã được lưu (cả hai loại nhắc việc bật), nên trang cài đặt hiện "Lưu lần cuối lúc …". Muốn thấy "Chưa lưu lần nào" thì chạy với --empty.')
  } else if (income) {
    console.log('ĐÃ NẠP XONG dữ liệu mẫu D5 (thu nhập). Mở mục "Thu nhập". Mọi ngày thanh toán của mẫu nằm trong tháng 8 và tháng 9 năm 2026.')
    const [a1, a2] = D5_PERIODS.twoMonths
    const [b1, b2] = D5_PERIODS.september
    const [c1, c2] = D5_PERIODS.nothingPaid
    console.log(`  Khoảng ${a1} .. ${a2}: USD thực nhận 20,05, hoàn 0,00, còn phải thu -7,55; tháng 8 là 5,05, tháng 9 là 15,00.`)
    console.log('                                 VND thực nhận 5.100.000, hoàn 500.000, còn phải thu 6.000.000; tháng 8 là 500.000, tháng 9 là 4.600.000.')
    console.log(`  Khoảng ${b1} .. ${b2}: USD 15,00 / 0,00 / -7,55; VND 4.600.000 / 500.000 / 6.000.000 (còn phải thu không đổi).`)
    console.log(`  Khoảng ${c1} .. ${c2}: không khoản nào; USD 0,00 / 0,00 / -7,55; VND 0 / 0 / 6.000.000; câu "Không có khoản thanh toán nào trong kỳ.".`)
    console.log('  Ô ngày của trang mở sẵn từ 1/1 năm nay tới hôm nay (đổi theo ngày chạy); nhập các khoảng trên để so.')
  } else if (payments) {
    console.log('ĐÃ NẠP XONG dữ liệu mẫu D4 (thanh toán). Mở "Đơn hàng", bấm một đơn, rồi bấm "Thanh toán".')
    console.log('  "Minh họa bìa sách" (9.000.000 VND): năm khoản, một khoản đã hủy; đã nhận 4.600.000 VND, còn phải thu 4.500.000 VND.')
    console.log('  "Chibi đôi" (12,50 USD): một khoản 15,00 USD, "Đã thu dư 2,50 USD".')
    console.log('  "Chân dung bán thân" (1.500.000 VND): chưa có khoản nào.')
  } else if (progress) {
    console.log('ĐÃ NẠP XONG dữ liệu mẫu D3 (tiến độ). Mở mục "Tiến độ" để thấy nó.')
    console.log('  Bảng tiến độ mong đợi:')
    for (const [group, rows] of D3_EXPECTED_BOARD) {
      console.log(`    ${group}`)
      for (const [title, detail] of rows) console.log(`      ${title} — ${detail}`)
    }
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
  if (keep) {
    console.log('Đóng cửa sổ ứng dụng để kết thúc. Thư mục dữ liệu được GIỮ LẠI (--keep): mở lại bằng npm run walkthrough:app -- --reopen.')
    console.log('  Trước khi đóng: nếu đã chạy walkthrough:backend -- down thì chạy -- up trước (công cụ --reopen cũng đặt lại, nhưng đừng để backend tắt khi đóng).')
  } else {
    console.log('Đóng cửa sổ ứng dụng để kết thúc.')
  }
  console.log('==============================================================================')
}

app.on('exit', (code) => {
  clearSession()
  if (keep) {
    fs.writeFileSync(KEPT_FILE, JSON.stringify({ dataDir }, null, 2))
    console.log(`walkthrough:app: the desktop app exited with code ${code}; the temporary data folder is KEPT for --reopen: ${dataDir}`)
  } else if (reopen && code !== 0) {
    // A reopening that did not end well: the folder stays, so it can be looked at or tried again.
    console.log(`walkthrough:app: the reopened app exited with code ${code}; the temporary data folder is kept: ${dataDir}`)
  } else {
    fs.rmSync(dataDir, { recursive: true, force: true })
    if (reopen) fs.rmSync(KEPT_FILE, { force: true })
    console.log(`walkthrough:app: the desktop app exited with code ${code}; temporary data removed.`)
  }
  process.exit(code ?? 1)
})
