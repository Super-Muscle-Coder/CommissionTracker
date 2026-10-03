// ===WCA-CHECKPOINT-START===
// workflow: send_reminder
// clause: external
// component: services
// last_updated_by: coding-agent@2026-10-03#1
// last_updated_at: 2026-10-03T10:42:22.0487385+07:00
//
// EXPERIENCES:
//   - id: send_reminder-EXP-001
//     content: >
//       Bốn lời gọi (ui_decomposition.md, "Chặng D6", bảng "Lời gọi"), bảng nhãn ở configs.ts,
//       [CONTRACT] api_contract.yaml 4.0.0, chép từng dòng (kiểm thử so nguyên bảng): list_pending GET
//       /reminders/pending { 200 ok, 500 ERR_STORAGE_IO }; acknowledge PUT /reminders/{notification_id}/ack
//       (không thân; id đi trên đường dẫn, URL-encode) { 200 ok, 404 ERR_NOT_FOUND, 500 }; get_settings GET
//       /reminders/settings { 200 ok, 500 }; edit_settings PUT /reminders/settings, thân
//       { reminder_settings_input } { 200 ok, 400 ERR_VALIDATION, 500 }. check_due KHÔNG có ở đây và không
//       có ở đâu trong UI/src (called_by chỉ là reminder_ticker của desktop; kiểm thử khẳng định Configs
//       không chứa đường dẫn của nó; grep src không thấy lời gọi). errorMessages theo từng lời gọi; kiểm
//       thử "mọi mã có câu" duyệt 6 cặp (lời gọi, mã) từ bảng nhãn. Configs ghi Data Schema 9.0.2, API
//       Contract 4.0.0.
//   - id: send_reminder-EXP-002
//     content: >
//       Kiểm thân bằng Zod, mức tối thiểu của I3.3. reminder_notification_record là z.discriminatedUnion
//       theo kind: 'deadline' phải có deadline_item và digest null, 'periodic_digest' phải có digest và
//       deadline_item null; kind khác là contract_violation. Entities viết đúng hai ca đó (một kiểu hợp
//       theo kind), nên Services phân nhánh bằng switch + assertNever (R13 cấm so sánh .kind; không tắt
//       luật). Mọi luật của reminder_settings_record được kiểm ở phản hồi (superRefine): every >= 1,
//       at_time đúng HH:MM 00:00..23:59, weekday 1..7 và bắt buộc khi unit weeks / null khi days,
//       lead_times 1..5 mục, mỗi mốc <= 365 ngày / 8760 giờ (1 ngày = 24 giờ), không hai mốc cùng độ dài;
//       due_at, updated_at, acknowledged_at đúng formats.timestamp (và là một thời điểm thật), deadline
//       đúng formats.date (và là một ngày thật); mọi số nguyên là số nguyên an toàn. updated_at null ok
//       (mặc định chưa lưu). Trường thừa bị bỏ.
//   - id: send_reminder-EXP-003
//     content: >
//       Quyết định trình bày ở Services (mỗi điều qua phép thử §5): (1) dòng chính/phụ của hai loại nhắc
//       việc đúng ui_decomposition.md D6; mốc "<n> ngày|giờ"; ngày giờ theo giờ máy HH:mm dd/mm/yyyy, ngày
//       cắt từ chuỗi; (2) "sớm nhất" của nhắc việc tổng hợp là phần tử ĐẦU của upcoming (hợp đồng: sớm nhất
//       trước), không sắp lại; upcoming rỗng thì không có phần "sớm nhất"; thứ tự danh sách giữ đúng hợp
//       đồng; (3) "Đã xem" KHÔNG hỏi xác nhận (đặc tả D6, §7.2 nguyên tắc 5: không mất dữ liệu, không hậu
//       quả); kiểm thử: một lần gọi adapter ngay lần đầu, khác payment_list nơi hủy khoản hỏi trước; (4)
//       bản nháp form là chuỗi (weekday '' khi unit ngày); đổi unit sang ngày thì bỏ thứ, sang tuần mà chưa
//       có thì Thứ Hai; (5) "Thêm mốc nhắc": đặc tả viết "mặc định '1 ngày' nếu chưa có, không thì ô số
//       trống". Agent hiểu "nếu chưa có" là chưa có mốc dài đúng 24 giờ (1 ngày hay 24 giờ), vì hai mốc
//       cùng độ dài bị cấm; không thì số để trống, đơn vị ngày. Orchestrator xem lại nếu ý khác. Không quá
//       5, không dưới 1 dòng (view mang leadTimeLimits từ Configs [CONTRACT]).
//   - id: send_reminder-EXP-004
//     content: >
//       Routers: bốn lối vào gọi backend (loadPending, acknowledge, openSettings, saveSettings) và ba hàm
//       thuần cho bản nháp (changePeriodicUnit, addLeadTime, removeLeadTime; không gọi gì, chuyển cho
//       Services). Kiểm form = bản sao reminder_settings_record, áp cho cả phần đang tắt (hợp đồng đòi mọi
//       trường hợp lệ): every số nguyên >= 1 đọc trên chuỗi chữ số (rỗng required; "abc", "1.5", > 2^53−1
//       not_integer; 0 và âm violates_type_constraint; cả hai nói "Nhập một số nguyên từ 1 trở lên"); at_time
//       đúng HH:MM; thứ bắt buộc khi unit tuần, gửi null khi ngày bất kể bản nháp còn giữ gì; mốc: số đọc
//       như every, tối đa 365 ngày / 8760 giờ, hai mốc cùng độ dài thì lỗi ở mốc SAU. Khóa lỗi theo đường
//       dẫn trường hợp đồng: periodic.every, periodic.at_time, periodic.weekday,
//       deadline.lead_times.<i>.amount|unit. Hai chỗ đặc tả không nói, agent quyết: (a) mã lỗi — số mốc <= 0
//       là not_integer để dành violates_type_constraint cho "quá 365 ngày" (hai câu khác nhau trên cùng ô),
//       mốc trùng khóa trên CẢ MỐC (deadline.lead_times.<i>) vì cùng ô số mà cần câu thứ ba; Services tra
//       câu theo khóa đã bỏ chỉ số, trang lấy lỗi của ô số từ khóa amount rồi khóa mốc; (b) mốc để trống
//       nói "Nhập thời gian nhắc trước" (đặc tả chỉ có câu cho "Mỗi"). Thứ tự con trỏ: every, unit,
//       at_time, weekday, rồi từng mốc.
//   - id: send_reminder-EXP-005
//     content: >
//       Dữ liệu mẫu và vì sao spec reminder_settings tách khỏi reminder_list: lưu cài đặt làm mất "Chưa
//       lưu lần nào", mà seedReminderSample phải lưu cài đặt để công cụ tạo được nhắc việc, nên hai spec
//       dùng hai lần mở ứng dụng. Mẫu tạo ba đơn (hạn HÔM NAY, 2026-01-01, không hạn), lưu cài đặt (trước
//       hạn "1 ngày" + tổng hợp hằng ngày vào phút cách >= 3 s), chờ qua phút đó rồi công cụ gọi
//       POST /reminders/checks một lần (chờ 4–64 s; gần nửa đêm thì chờ qua nửa đêm trước). Ra đúng hai
//       nhắc việc: hạn giao (đến hạn 00:00 hôm nay) rồi tổng hợp (3 đơn mở, 2 có hạn, sớm nhất 01/01/2026).
//       Ngày giờ trong ảnh bằng chứng đổi theo ngày chạy (đã ghi trong walkthrough.yaml).
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Kiểm thử của send_reminder đạt, đủ ma trận phủ I3.6 cho bốn lời gọi, cộng mọi ca bắt buộc của plan
//       phiên 27 việc 3.
//     how: >
//       Trong UI/: npm run check (vitest, http_client giả, không mạng); npx vitest run
//       src/logic/workflows/send_reminder. Tệp tests/adapters.test.ts, services.test.ts, routers.test.ts.
//     result: >
//       "Tests 198 passed (198)": adapters.test.ts 96 (bảng nhãn khớp từng dòng và không có đường dẫn của
//       check_due; Configs ghi 9.0.2 và 4.0.0; mỗi lời gọi: phương thức, đường dẫn, query, thân keyed theo tên
//       input; mọi nhãn khai báo; code khác mã; thân lỗi sai hình; unreachable ghi console.error; nhãn không
//       khai báo; thân rỗng; thiếu trường; sai kiểu; số nguyên 2^53; một phần tử sai của danh sách; trường thừa
//       bị bỏ; hình dạng đi cùng từng loại nhắc việc (thiếu deadline_item, digest thừa, kind lạ); due_at,
//       acknowledged_at, deadline sai định dạng hoặc ngày không có thật; từng luật của reminder_settings_record:
//       weekday với unit, every >= 1, at_time 9:00 / 24:00 / 12:60, 0 và 6 mốc, 365 ngày và 8760 giờ ok còn 366
//       và 8761 không, 1 ngày cùng 24 giờ trùng còn 2 ngày cùng 24 giờ ok, mốc 0, âm, lẻ). services.test.ts 53
//       (6 cặp mã có câu duyệt từ Configs; mọi loại CallResult của bốn thao tác; 404 của acknowledge ra đúng câu
//       "Nhắc việc này không còn trong danh sách."; "Đã xem" một lần gọi, không hỏi; hai loại nhắc việc, tổng hợp
//       với upcoming rỗng và không rỗng, giờ ở Asia/Ho_Chi_Minh và America/Los_Angeles, thứ tự hợp đồng giữ
//       nguyên; "Chưa lưu lần nào" / "Lưu lần cuối lúc …"; bản nháp từ settings; đổi đơn vị, thêm mốc "1 ngày"
//       hoặc để trống số, không quá 5, không dưới 1; câu của từng lỗi ô). routers.test.ts 49 (every: rỗng, 0,
//       -1, 1.5, abc, 2^53 và 99999999999999999999 lỗi, 1 ok; at_time: 9:00, 24:00, 12:60, rỗng lỗi, 00:00 và
//       23:59 ok; "tuần" chưa chọn thứ lỗi, "ngày" gửi weekday null kể cả khi bản nháp còn giữ thứ; 365 ngày và
//       8760 giờ ok, 366 ngày và 8761 giờ lỗi; 1 ngày + 24 giờ lỗi ở mốc sau, 2 ngày + 24 giờ ok; phần đang tắt
//       vẫn bị kiểm; đúng các trường của reminder_settings_input; Services/adapter ghi không được gọi khi có lỗi).
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       Các kiểm thử bắt buộc cắn: làm hỏng từng quyết định thì kiểm thử hỏng.
//     how: >
//       Sửa tạm một dòng, chạy npx vitest run src/logic/workflows/send_reminder, khôi phục nguyên byte (kiểm
//       bằng grep "false &&" ra 0 ở mọi tệp của workflow, rồi chạy lại cả ba tệp).
//     result: >
//       (a) routers.ts: "if (false && seenHours.has(hours)) fail(…)" (bỏ luật mốc trùng): routers.test.ts "3
//       failed". (b) services.ts: "const taken = false && draft.leadTimes.some(…)" (luôn thêm mốc "1 ngày"):
//       services.test.ts "1 failed". Khôi phục: "Tests 198 passed (198)".
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       Chạy thật (iWCA D7): Routers của send_reminder, được reminder_list và reminder_settings gọi, đi qua
//       Services, Adapters, http_client tới Backend.py thật, cho cả bốn lời gọi; giao diện không gọi check_due.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-10-03#1, npm run e2e (từng lượt,
//       không chạy song song). Bản ghi UI/evidence/walkthroughs/{reminder_list,reminder_settings}/*-run.json.
//       Dữ liệu: công cụ kiểm thử seedReminderSample (tests/tools/walkthrough_lib.mjs) gọi POST /reminders/checks
//       một lần; trong UI/src không có lời gọi nào tới đường dẫn đó (chỉ chữ trong checkpoint của các phiên cũ).
//     result: >
//       Mỗi lượt đạt "69 passed" (mốc 59). loadPending (list_pending): reminder_list S1..S5 (S3: unreachable rồi
//       ok); acknowledge: S4 (một lần, ra thông báo "Đã đánh dấu đã xem."), S5 (mục cuối, ra trạng thái rỗng);
//       openSettings (get_settings): reminder_settings S1..S5 và reminder_list S5 ("Lưu lần cuối lúc …");
//       saveSettings (edit_settings): reminder_settings S2 (ok), S4 (rejected_input: ba lần, không gửi gì), S5
//       (unreachable rồi ok). Backend thật nhận và trả lại đúng giá trị đã lưu (S2: định kỳ bật, mỗi 2 tuần,
//       08:15, Thứ Năm; hai mốc 1 ngày và 12 giờ). Hai nhắc việc của mẫu: hạn giao (00:00 hôm nay) rồi tổng hợp
//       ("3 đơn đang mở", "2 đơn có hạn giao", "sớm nhất: Minh họa bìa sách (01/01/2026)").
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//
// NOTES: []
// ===WCA-CHECKPOINT-END===
/**
 * Services of the interface workflow send_reminder: the only place of the
 * workflow that decides, and only presentation decisions (iwca_theory.md §5).
 * Every CallResult becomes a ViewResult by the table of i3-logic.md Step I3.4.
 */
import { assertNever, INPUT_FORMAT_CODE } from '../../shared/results'
import type { CallResult, InputFormatCode, ResultMessages, ViewResult } from '../../shared/results'
import type { SendReminderAdapters } from './adapters'
import type { SendReminderConfigs } from './configs'
import type {
  AcknowledgedView,
  ChoiceView,
  LeadTime,
  LeadTimeDraft,
  OpenTarget,
  PendingListView,
  PendingNotifications,
  PendingRowView,
  ReminderNotificationRecord,
  ReminderSettings,
  ReminderSettingsDraft,
  ReminderSettingsRecord,
  SavedSettingsView,
  SettingsFormView,
} from './entities'

type EndpointKey = keyof SendReminderConfigs['endpoints']

type Failed = Exclude<CallResult<unknown>, { kind: 'ok' }>

// "{title}" with { title: 'Chân dung' } → "Sắp tới hạn giao: Chân dung".
function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([a-z]+)\}/g, (whole, key: string) => (Object.hasOwn(values, key) ? values[key] : whole))
}

// "2026-10-03" → "03/10/2026", cut from the string (a date has no time zone).
const dayText = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`

export function createSendReminderServices(adapters: SendReminderAdapters, cfg: SendReminderConfigs, messages: ResultMessages) {
  // Presentation decision: dates and times in the machine's time zone, Vietnamese format.
  const dateTime = new Intl.DateTimeFormat(cfg.displayLocale, cfg.dateTimeFormat)
  const { texts, limits } = cfg

  const instantText = (timestamp: string) => dateTime.format(new Date(timestamp))
  // Presentation decision (D6, "Mốc nhắc"): "<amount> ngày" or "<amount> giờ".
  const leadText = (lead: LeadTime) => `${lead.amount} ${cfg.leadUnitNames[lead.unit]}`

  // Where a click on the main line of a reminder goes (D6): a deadline
  // reminder opens its commission, the periodic digest opens the list.
  function openTarget(n: ReminderNotificationRecord): OpenTarget {
    switch (n.kind) {
      case 'deadline':
        return { to: 'commission_detail', commissionId: n.deadline_item.commission_id }
      case 'periodic_digest':
        return { to: 'commission_list' }
      default:
        return assertNever(n)
    }
  }

  // Presentation decision (D6, reminder_list): the main and the secondary line
  // of each kind of reminder. The digest's earliest commission is the first of
  // `upcoming` (the contract: earliest deadline first); nothing is sorted here.
  function rowView(n: ReminderNotificationRecord): PendingRowView {
    const when = instantText(n.due_at)
    switch (n.kind) {
      case 'deadline': {
        const item = n.deadline_item
        return {
          notificationId: n.notification_id,
          text: fillTemplate(texts.deadlineMain, { title: item.title }),
          detailText: fillTemplate(texts.deadlineDetail, { deadline: dayText(item.deadline), lead: leadText(item.lead), when }),
          open: openTarget(n),
        }
      }
      case 'periodic_digest': {
        const digest = n.digest
        const first = digest.upcoming.length === 0 ? [] : [fillTemplate(texts.digestEarliest, { title: digest.upcoming[0].title, deadline: dayText(digest.upcoming[0].deadline) })]
        return {
          notificationId: n.notification_id,
          text: fillTemplate(texts.digestMain, { count: String(digest.open_count) }),
          detailText: [fillTemplate(texts.digestDetail, { upcoming: String(digest.upcoming.length), when }), ...first].join(texts.separator),
          open: openTarget(n),
        }
      }
      default:
        return assertNever(n)
    }
  }

  // The list keeps the order the contract promises (oldest first).
  function listView(pending: PendingNotifications): PendingListView {
    return { rows: pending.map(rowView), isEmpty: pending.length === 0, emptyText: texts.emptyList }
  }

  // Presentation decision (D6, reminder_settings): the sub-line, and the form
  // draft as text (the weekday is '' when the unit is "ngày", where the contract has null).
  function draftOf(s: ReminderSettingsRecord): ReminderSettingsDraft {
    return {
      periodicEnabled: s.periodic.enabled,
      every: String(s.periodic.every),
      periodicUnit: s.periodic.unit,
      atTime: s.periodic.at_time,
      weekday: s.periodic.weekday === null ? '' : String(s.periodic.weekday),
      deadlineEnabled: s.deadline.enabled,
      leadTimes: s.deadline.lead_times.map((l) => ({ amount: String(l.amount), unit: l.unit })),
    }
  }

  function settingsView(r: ReminderSettings): SettingsFormView {
    const choice = (names: Readonly<Record<string, string>>) => (value: string): ChoiceView => ({ value, label: names[value] })
    return {
      subtitle: r.updated_at === null ? texts.neverSaved : fillTemplate(texts.savedAt, { when: instantText(r.updated_at) }),
      draft: draftOf(r.settings),
      periodicUnitChoices: cfg.periodicUnits.map(choice(cfg.periodicUnitNames)),
      weekdayChoices: Object.keys(cfg.weekdayNames).map(choice(cfg.weekdayNames)),
      leadUnitChoices: cfg.leadUnits.map(choice(cfg.leadUnitNames)),
      weekdayUnit: cfg.weekdayUnit,
      leadTimeLimits: { min: limits.leadTimes.min, max: limits.leadTimes.max },
    }
  }

  // The length in hours of a lead time as typed, or null when it is not read as
  // a whole number (1 day = 24 hours).
  function typedHours(row: LeadTimeDraft): number | null {
    const amount = row.amount.trim()
    if (!/^[0-9]{1,6}$/.test(amount)) return null
    return Number(amount) * (row.unit === 'days' ? limits.leadTimes.hoursPerDay : 1)
  }

  // A CallResult that is not ok, to its ViewResult (i3-logic.md Step I3.4).
  // The message of a declared error is the one of that call.
  function failure(r: Failed, endpoint: EndpointKey): ViewResult<never> {
    switch (r.kind) {
      case 'declared_error':
        // Presentation decision: the message for each declared error code of each call.
        return { kind: 'rejected', origin: 'system', code: r.error.code, message: cfg.errorMessages[endpoint][r.error.code], fieldErrors: {} }
      case 'unreachable':
        return { kind: 'unreachable', message: messages.unreachable }
      case 'contract_violation':
        return { kind: 'contract_violation', message: messages.contractViolation }
      default:
        return assertNever(r)
    }
  }

  // Every CallResult to a ViewResult; ok builds the view.
  function toView<T, V>(r: CallResult<T>, endpoint: EndpointKey, ok: (data: T) => V): ViewResult<V> {
    switch (r.kind) {
      case 'ok':
        return { kind: 'ok', view: ok(r.data) }
      case 'declared_error':
      case 'unreachable':
      case 'contract_violation':
        return failure(r, endpoint)
      default:
        return assertNever(r)
    }
  }

  return {
    // reminder_list: list_pending — one call.
    async loadPending(): Promise<ViewResult<PendingListView>> {
      return toView(await adapters.listPending(), 'listPending', listView)
    },

    // reminder_list, "Đã xem": acknowledge — one call. Presentation decision
    // (D6): no question first — acknowledging loses no data and changes nothing
    // else (§7.2, principle 5 asks for confirmation only where the act is hard
    // to undo and has consequences).
    async acknowledge(notificationId: string): Promise<ViewResult<AcknowledgedView>> {
      return toView(await adapters.acknowledge(notificationId), 'acknowledge', () => ({ message: cfg.notices.acknowledged }))
    },

    // reminder_settings: get_settings — one call.
    async openSettings(): Promise<ViewResult<SettingsFormView>> {
      return toView(await adapters.getSettings(), 'getSettings', settingsView)
    },

    // reminder_settings, "Lưu" (input has passed the format check of Routers).
    async saveSettings(input: ReminderSettingsRecord): Promise<ViewResult<SavedSettingsView>> {
      return toView(await adapters.editSettings(input), 'editSettings', () => ({ message: cfg.notices.saved }))
    },

    // Presentation decision (D6, "Vào thứ"): changing the unit of the cadence.
    // To "tuần" with no weekday chosen yet, the weekday becomes Thứ Hai; to
    // "ngày", the weekday is dropped (sent as null by Routers).
    changePeriodicUnit(draft: ReminderSettingsDraft, unit: string): ReminderSettingsDraft {
      if (unit === cfg.weekdayUnit) return { ...draft, periodicUnit: unit, weekday: draft.weekday === '' ? cfg.defaults.weekday : draft.weekday }
      return { ...draft, periodicUnit: unit, weekday: '' }
    },

    // Presentation decision (D6, "Thêm mốc nhắc"): a new row is "1 ngày" when no
    // row has that length yet, else its number is left empty; never more than 5 rows.
    addLeadTime(draft: ReminderSettingsDraft): ReminderSettingsDraft {
      if (draft.leadTimes.length >= limits.leadTimes.max) return draft
      const defaultHours = limits.leadTimes.hoursPerDay
      const taken = draft.leadTimes.some((row) => typedHours(row) === defaultHours)
      const row = taken ? cfg.defaults.newLeadTimeFollowing : cfg.defaults.newLeadTime
      return { ...draft, leadTimes: [...draft.leadTimes, { amount: row.amount, unit: row.unit }] }
    },

    // Presentation decision (D6, "Bỏ mốc này"): never fewer than one row.
    removeLeadTime(draft: ReminderSettingsDraft, index: number): ReminderSettingsDraft {
      if (draft.leadTimes.length <= limits.leadTimes.min) return draft
      return { ...draft, leadTimes: draft.leadTimes.filter((_, i) => i !== index) }
    },

    // The fixed rejection function for Routers (i3-logic.md, Step I3.4):
    // Routers detects, Services chooses the words — the workflow's own message
    // for the field and reason (configs.inputMessages), else the layer's. The
    // index of a lead time is left out of the key the message is looked up by.
    rejectInput(fields: Record<string, InputFormatCode>): ViewResult<never> {
      const fieldErrors = Object.fromEntries(
        Object.entries(fields).map(([field, code]) => [field, cfg.inputMessages[field.replace(/\.[0-9]+(?=\.|$)/g, '')]?.[code] ?? messages.input[code]]),
      )
      return { kind: 'rejected', origin: 'input', code: INPUT_FORMAT_CODE, message: messages.inputSummary, fieldErrors }
    },
  }
}

export type SendReminderServices = ReturnType<typeof createSendReminderServices>
