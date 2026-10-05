// ===WCA-CHECKPOINT-START===
// workflow: reminder_ticker
// clause: clause_d_desktop
// component: cross_cutting
// last_updated_by: coding-agent@2026-10-05#1
// last_updated_at: 2026-10-05T11:16:31.4746772+07:00
//
// EXPERIENCES:
//   - id: reminder_ticker-EXP-001
//     content: >
//       Vị trí khối checkpoint: đầu tệp chính của thành phần
//       (src/cross_cutting/reminder_ticker/reminder_ticker.ts), vì hạ tầng cắt
//       ngang không có Services (Giao thức 07). Tệp thứ hai toast_text.ts là hàm
//       thuần (kiểm hình dạng tối thiểu và dựng chữ), không import Electron.
//       reminder_ticker.ts cũng không import Electron: Main tiêm địa chỉ backend,
//       cấu hình, hàm showToast và hàm log, nên ticker kiểm thử được bằng Node
//       thuần với một máy chủ cục bộ (ca B1, B2).
//   - id: reminder_ticker-EXP-002
//     content: >
//       Hành vi (đặc tả đã chốt của plan phiên 30, API Contract 4.0.0
//       cross_cutting.reminder_ticker, send_reminder.check_due). start(): lần
//       kiểm đầu chạy NGAY rồi setInterval theo interval_ms. Không chồng lời gọi:
//       tick() bỏ qua và ghi "reminder check skipped" khi lần trước chưa xong. Mỗi
//       lời gọi POST /reminders/checks không thân, có AbortController với hạn
//       request_timeout_ms ("no answer within N ms"). Lỗi (HTTP khác 200, không
//       tới được, hết hạn, thân không phải JSON hay không phải danh sách): ghi
//       log "reminder check #N failed: ...", không hiện gì, thử lại ở nhịp sau,
//       ứng dụng không dừng. Mỗi phần tử trả về theo thứ tự, một toast; phần tử
//       sai hình dạng bị bỏ riêng và ghi log, các phần tử khác vẫn hiện. Ticker
//       không lọc, không sắp lại, không giữ dữ liệu nghiệp vụ, không gọi
//       GET /reminders/pending hay PUT /reminders/{id}/ack (kiểm thử D1: nhắc
//       việc vẫn nằm trong danh sách đang chờ). stop(): hủy hẹn giờ, abort lời
//       gọi dở, bỏ kết quả của nó (cờ stopped), chờ lời gọi đó kết thúc rồi ghi
//       "reminder ticker stopped"; chạy được lần hai mà không làm gì.
//   - id: reminder_ticker-EXP-003
//     content: >
//       Chữ thông báo nằm trong configs/desktop.json (reminder_ticker.toast), mẫu
//       có chỗ {name}; fill() thay một lượt nên giá trị chứa dấu ngoặc nhọn (tên
//       đơn) không bị thay lần hai. Ngày dd/mm/yyyy cắt từ chuỗi YYYY-MM-DD bằng
//       biểu thức chính quy, không qua đối tượng Date nên múi giờ không đổi ngày.
//       Cùng lời với trang reminder_list: "Sắp tới hạn giao: <title>" / "Hạn giao
//       <ngày> · nhắc trước <n> ngày|giờ"; "Tổng hợp định kỳ: <open_count> đơn đang
//       mở" / "<số upcoming> đơn có hạn giao" cộng " · sớm nhất: <title> (<ngày>)"
//       khi upcoming không rỗng. Hợp đồng cho deadline là kiểu date; phần tử có
//       kind lạ, thiếu notification_id, trường bắt buộc theo kind là null, ngày
//       sai dạng hay lead không nguyên dương bị coi là sai hình dạng.
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Chữ thông báo, phần tử sai hình dạng, và hành vi lỗi, hết hạn, dừng của
//       ticker.
//     how: >
//       cd Desktop; npx playwright test tests/reminder_ticker.spec.ts (A1-A4: hàm
//       thuần và AUMID khớp appId; B1-B2: ticker với máy chủ cục bộ; C1-C4: Main với
//       tests/fixtures/fake_backend_reminders.py; D1-D2: Main với backend thật).
//     result: >
//       12 passed (52,3 s). A3: 14 phần tử sai hình dạng đều bị từ chối. B1: ba
//       lần "no answer within 300 ms" trong 1,8 s, ứng dụng thử lại mỗi nhịp. B2:
//       stop() trả về sau 1 ms khi đang có lời gọi, không toast, dòng cuối là
//       "reminder ticker stopped". C1: "HTTP 500 ... ERR_STORAGE_IO", "the answer
//       is not a list", "the answer is not JSON", không có "reminder toast:",
//       ứng dụng chạy tiếp và đóng mã 0. C2: đúng hai toast theo thứ tự (deadline,
//       digest), một dòng "skipped a malformed notification (kind deadline without
//       deadline_item)". C3: số lời gọi đang chạy tại mỗi lần bắt đầu là [1,1,1],
//       nhiều dòng "reminder check skipped". C4: "reminder ticker stopped" trước
//       "stopping backend", không có "check #N start" nào sau đó. D1: backend thật,
//       toast "Sắp tới hạn giao: Tranh thử nhắc việc" / "Hạn giao <hôm nay> ·
//       nhắc trước 1 ngày", đúng một toast sau nhiều nhịp, GET /reminders/pending
//       còn đúng nhắc việc đó. D2: toast đầu 2056 ms sau khi cửa sổ mở với nhịp
//       600000 ms (nhắc việc đến hạn lúc ứng dụng đóng).
//     recorded_at: 2026-10-05T11:16:31.4746772+07:00
//   - claim: >
//       Phép cắn: kiểm thử hỏng khi hành vi bị bỏ.
//     how: >
//       Tạm sửa mã, chạy đúng ca, khôi phục. (a) bỏ this.tick() sau setInterval
//       trong start(), chạy ca D2. (b) bỏ khối "if (this.inFlight !== null)" trong
//       tick(), chạy ca C3. (c) bỏ await reminderTicker?.stop() trong shutdown của
//       main.ts, chạy ca C4.
//     result: >
//       (a) D2 hỏng: log "reminder toast: ... not seen within 20000 ms". (b) C3
//       hỏng, số lời gọi đang chạy tại mỗi lần bắt đầu là [1,2,3,4,5,5,5] thay cho
//       [1,1,1]. (c) C4 hỏng: không có dòng "reminder ticker stopped" (findIndex
//       -1). Sau khi khôi phục cả ba, 12 passed.
//     recorded_at: 2026-10-05T11:16:31.4746772+07:00
//   - claim: >
//       Toast thật, do Project Owner xác nhận bằng mắt, và ticker chạy được trong
//       bản đóng gói.
//     how: >
//       cd Desktop; npm run build; node tests/tools/toast_demo.cjs (ứng dụng thật
//       từ mã nguồn, dữ liệu tạm, nhịp 3 s, ticker là bên duy nhất gọi check_due).
//       Bản đóng gói: npm run test:packaged (P7, P8; P8 tạo đơn có hạn giao hôm
//       nay qua HTTP, đóng, mở lại, chờ toast).
//     result: >
//       Hai toast hiện đúng chữ (xem main-EXP-026), bấm thì log "click (window
//       brought to the front: true)" và cửa sổ lên trước; Project Owner xác nhận
//       toast khớp danh sách "Nhắc việc", nhắc việc còn đủ hai (ticker không đánh
//       dấu đã xem). P7: ticker chạy trong gói, lần kiểm đầu "reminder check #1: 0
//       notification(s)", không "failed", không FATAL. P8: toast "Sắp tới hạn
//       giao: Tranh thử thông báo gói" show rồi click, Project Owner bấm và xác
//       nhận khớp.
//     recorded_at: 2026-10-05T11:16:31.4746772+07:00
//
// NOTES:
//   - content: >
//       Không gọi PUT /reminders/{id}/ack và không gọi GET /reminders/pending;
//       nếu sau này cần "lấy lại" nhắc việc đã trao thì đó là việc của trang
//       reminder_list (D6), không phải của ticker. Nhịp mặc định 60000 ms nằm
//       trong configs/desktop.json; cờ --ct-test-reminder-interval-ms chỉ bản chạy
//       từ mã nguồn. Bản cài thật chưa được đo thông báo (main-EXP-026).
//     written_at: 2026-10-05
// ===WCA-CHECKPOINT-END===
/**
 * reminder_ticker (api_contract.yaml, clause_a_common.cross_cutting): calls
 * send_reminder.check_due (POST /reminders/checks) on a fixed interval and
 * hands one toast per returned notification to the Main, which shows it. It
 * decides nothing about what is due and acknowledges nothing: it does not
 * filter, choose or reorder, keeps no business data, and never calls
 * GET /reminders/pending or PUT /reminders/{id}/ack.
 *
 * Plain Node (global fetch, timers): no Electron import. The Main owns the
 * Windows toast and the "bring the window to the front" tool and passes them
 * in, together with the backend address and every configuration value.
 */

import { buildToastText, readNotification, type ToastTextConfig } from './toast_text'

export interface ReminderTickerConfig {
  interval_ms: number
  request_timeout_ms: number
  toast: ToastTextConfig
}

export interface Toast {
  notificationId: string
  title: string
  body: string
}

export interface ReminderTickerOptions {
  backendBaseUrl: string
  config: ReminderTickerConfig
  /** Shows one toast; supplied by the Main. */
  showToast: (toast: Toast) => void
  log: (message: string) => void
}

const CHECK_PATH = '/reminders/checks'

export class ReminderTicker {
  private timer: NodeJS.Timeout | null = null
  private inFlight: Promise<void> | null = null
  private controller: AbortController | null = null
  private stopped = false
  private checks = 0

  constructor(private readonly options: ReminderTickerOptions) {}

  /** The first check runs now (a reminder that fell due while the app was
   * closed shows when it opens), then one every interval_ms. */
  start(): void {
    if (this.timer !== null || this.stopped) return
    const { interval_ms: interval } = this.options.config
    this.options.log(`reminder ticker started: first check now, then every ${interval} ms`)
    this.timer = setInterval(() => this.tick(), interval)
    this.tick()
  }

  /** Cancels the timer and drops the result of a call still running. Resolves
   * when that call has ended, so the Main can stop the backend after it. */
  async stop(): Promise<void> {
    if (this.stopped) return
    this.stopped = true
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
    this.controller?.abort()
    await this.inFlight
    this.options.log('reminder ticker stopped')
  }

  private tick(): void {
    if (this.stopped) return
    // Never two checks at once: a slow answer makes the next ticks wait.
    if (this.inFlight !== null) {
      this.options.log('reminder check skipped: the previous one has not finished')
      return
    }
    this.inFlight = this.check().finally(() => {
      this.inFlight = null
    })
  }

  private async check(): Promise<void> {
    const { log } = this.options
    const number = ++this.checks
    const controller = new AbortController()
    this.controller = controller
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.options.config.request_timeout_ms)
    try {
      const response = await fetch(`${this.options.backendBaseUrl}${CHECK_PATH}`, { method: 'POST', signal: controller.signal })
      const text = await response.text()
      if (this.stopped) return
      if (response.status !== 200) {
        log(`reminder check #${number} failed: HTTP ${response.status} ${text.slice(0, 200)}`)
        return
      }
      this.show(number, text)
    } catch (err) {
      if (this.stopped) return
      const reason = timedOut ? `no answer within ${this.options.config.request_timeout_ms} ms` : err instanceof Error ? err.message : String(err)
      log(`reminder check #${number} failed: ${reason}`)
    } finally {
      clearTimeout(timer)
      if (this.controller === controller) this.controller = null
    }
  }

  /** One toast per element, in the order the backend returned them; an
   * element of the wrong shape is skipped and logged, the others still show. */
  private show(number: number, body: string): void {
    const { log, config, showToast } = this.options
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      log(`reminder check #${number} failed: the answer is not JSON`)
      return
    }
    if (!Array.isArray(parsed)) {
      log(`reminder check #${number} failed: the answer is not a list`)
      return
    }
    log(`reminder check #${number}: ${parsed.length} notification(s)`)
    for (const raw of parsed) {
      const read = readNotification(raw)
      if (!read.ok) {
        log(`reminder check #${number}: skipped a malformed notification (${read.reason})`)
        continue
      }
      const text = buildToastText(config.toast, read.notification)
      const toast: Toast = { notificationId: read.notification.notificationId, ...text }
      log(`reminder toast: ${JSON.stringify({ notification_id: toast.notificationId, title: toast.title, body: toast.body })}`)
      try {
        showToast(toast)
      } catch (err) {
        log(`reminder toast could not be shown: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }
}
