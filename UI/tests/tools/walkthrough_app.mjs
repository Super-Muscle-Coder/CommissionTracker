// npm run walkthrough:app [-- --empty | -- --commissions | -- --progress | -- --payments | -- --income]
//
// Starts the real desktop app (built UI/dist, real Backend.py behind the
// switchable fixture) on a temporary data folder, reads the backend port from
// the desktop Main's log, loads sample data, and prints how to switch the
// backend off and on. Runs until the app window is closed; then removes the
// data folder. Sample data: by default the D1 sample (clients); with
// --commissions the D2 sample (its own clients and three commissions); with
// --progress the D3 sample (the D2 sample, one more commission, stages set);
// with --payments the D4 sample (the D2 sample and payments on two of its
// commissions); with --income the D5 sample (the D4 sample, a second month of
// USD, and a cancelled commission with a payment); with --empty none.
//
// For the Project Owner running the walkthroughs by hand
// (src/screens/pages/{client_list,client_detail,client_form,commission_list,
// commission_detail,commission_form,progress_board,stage_change,payment_list,
// payment_form,income_report}/walkthrough.yaml).
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
  D5_PERIODS,
  electronBinary,
  launchArgs,
  makeDataDir,
  portFromLog,
  RUNNER_VARIABLE,
  SAMPLE_DETAILED,
  seedCommissionSample,
  seedIncomeSample,
  seedPaymentSample,
  seedProgressSample,
  seedSampleData,
  walkthroughRunner,
  writeSession,
} from './walkthrough_lib.mjs'

const empty = process.argv.includes('--empty')
const income = !empty && process.argv.includes('--income')
const payments = !empty && !income && process.argv.includes('--payments')
const progress = !empty && !income && !payments && process.argv.includes('--progress')
const commissions = !empty && !income && !payments && !progress && process.argv.includes('--commissions')

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
  if (income) {
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
  if (empty) {
    console.log('Cơ sở dữ liệu TRỐNG.')
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
  console.log('Đóng cửa sổ ứng dụng để kết thúc.')
  console.log('==============================================================================')
}

app.on('exit', (code) => {
  clearSession()
  fs.rmSync(dataDir, { recursive: true, force: true })
  console.log(`walkthrough:app: the desktop app exited with code ${code}; temporary data removed.`)
  process.exit(code ?? 1)
})
