// ===WCA-CHECKPOINT-START===
// workflow: update_progress
// clause: external
// component: services
// last_updated_by: coding-agent@2026-09-29#2
// last_updated_at: 2026-09-29T18:10:00+07:00
//
// EXPERIENCES:
//   - id: update_progress-EXP-001
//     content: >
//       Sáu lời gọi (ui_decomposition.md, "Chặng D3", bảng "Lời gọi"), bảng nhãn ở
//       configs.ts, [CONTRACT] api_contract.yaml 4.0.0, chép từng dòng (kiểm thử so
//       nguyên bảng): get_stage GET /commissions/{commission_id}/stage { 200 ok, 404
//       ERR_NOT_FOUND, 500 ERR_STORAGE_IO }; get_stage_history GET
//       /commissions/{commission_id}/stage/history { 200 ok, 404, 500 }; change_stage
//       PUT /commissions/{commission_id}/stage { 200 ok, 400 ERR_VALIDATION, 404, 409
//       ERR_INVALID_TRANSITION, 500 }; get_board GET /progress/board { 200 ok, 500 };
//       list_stages GET /progress/stages { 200 ok } (nhãn duy nhất); list_commissions
//       GET /commissions { 200 ok, 500 } là hàm riêng của Adapters workflow này
//       (I1.3, R2), Entities tự mô tả commission_list. Thân gửi { stage_change: {
//       to_stage, note } } (endpoint_forms.http). errorMessages theo từng lời gọi như
//       manage_commission; kiểm thử "mọi mã có câu" duyệt 10 cặp (lời gọi, mã) từ
//       bảng nhãn. Configs ghi Data Schema 8.0.1, API Contract 4.0.0.
//   - id: update_progress-EXP-002
//     content: >
//       Kiểm thân bằng Zod, mức tối thiểu của I3.3. stage_kind = z.enum của bốn giá
//       trị hợp đồng (configs.stageKinds, [CONTRACT]); giá trị khác (done, Active,
//       closed, rỗng) là contract_violation. progress_state.updated_at nullable,
//       progress_history.from_stage và note nullable, lịch sử rỗng và bảng rỗng là
//       ok. list_stages RỖNG là contract_violation: hợp đồng luôn nói đơn chưa đặt
//       giai đoạn "tính là giai đoạn đầu của danh mục" (progress_state,
//       progress_entry_record), nên danh mục có giai đoạn đầu; ràng buộc này không
//       viết trong ngoặc của type, ghi lại ở đây để Orchestrator xét. Mã giai đoạn
//       ngoài danh mục mặc định vẫn ok (backend được đổi stage_catalog).
//       commission_list kiểm đủ trường cam kết (money an toàn, date là ngày thật).
//   - id: update_progress-EXP-003
//     content: >
//       Quyết định trình bày ở Services (mỗi điều qua phép thử §5): (1) tên tiếng
//       Việt theo bảng configs.stageNames [UI-ONLY], mã lạ hiện nguyên mã; THỨ TỰ
//       luôn từ list_stages; (2) bảng: mọi đơn của list_commissions vào nhóm của
//       current_stage; đơn không có mục vào nhóm giai đoạn ĐẦU của list_stages; nhóm
//       theo thứ tự list_stages, nhóm rỗng bỏ; mã không có trong list_stages vào nhóm
//       cuối "Giai đoạn khác: <mã>", mỗi mã một nhóm, sắp theo mã; mục của đơn không có
//       trong list_commissions bỏ qua; tiêu đề nhóm "<tên> (<số>)"; (3) trong nhóm: hạn
//       giao sớm trước (so chuỗi YYYY-MM-DD), không hạn cuối, cùng hạn thì updated_at
//       của ĐƠN (commission_list; progress_entry_record không có thời điểm) mới nhất
//       trước (so thời điểm), rồi commission_id; (4) dòng phụ "Hạn giao dd/mm/yyyy"
//       (cắt chuỗi, không new Date) hoặc "Không có hạn"; (5) phần Tiến độ: tên giai
//       đoạn, "cập nhật lúc <ngày giờ>" hoặc "chưa cập nhật lần nào"; lịch sử MỚI NHẤT
//       TRƯỚC (hợp đồng trả cũ nhất trước), mỗi dòng "<từ> → <đến>" hoặc "Bắt đầu:
//       <đến>", " · <ngày giờ>", " · <ghi chú>" nếu có; rỗng → "Chưa đổi giai đoạn lần
//       nào"; (6) stage_change: lựa chọn = list_stages theo thứ tự TRỪ giai đoạn hiện
//       tại; (7) "khép lại" nhận theo KIND (finished, cancelled — configs.closedKinds,
//       [CONTRACT] từ description của update_progress), không theo mã: kiểm thử với
//       danh mục giả "shipped" kind finished, "delivered" kind active; (8) lưu sang
//       giai đoạn khép lại mà chưa xác nhận → ok { outcome: 'needs_confirmation',
//       message } và KHÔNG gọi change_stage; đã xác nhận hoặc giai đoạn thường → gọi
//       ngay → ok { outcome: 'changed', commissionId, "Đã đổi giai đoạn sang <tên>." }.
//       Services không giữ trạng thái: các giai đoạn khép lại đi theo view
//       (StageChangeTarget.closingStages) để lúc lưu không phải gọi list_stages lại.
//   - id: update_progress-EXP-004
//     content: >
//       R13 cho đọc thuộc tính tên kind DUY NHẤT ở vị trí discriminant của switch.
//       stage_options đặt tên trường là kind (hợp đồng; Entities giữ tên), nên
//       Services lấy giá trị qua kindOf(option): một switch bốn nhánh trả đúng giá
//       trị của nhánh. Không tắt luật, không ngoại lệ lint. progress_state và
//       progress_entry_record dùng stage_kind nên không vướng.
//   - id: update_progress-EXP-005
//     content: >
//       Routers (một lối vào cho mỗi việc trang làm, iWCA D2): loadProgressBoard
//       (list_stages → get_board → list_commissions), loadCommissionProgress(id)
//       (get_stage → get_stage_history), openStageChange(id) (list_stages →
//       get_stage), saveStageChange(target, draft, confirmed) (change_stage, hoặc
//       không lời gọi nào khi còn chờ xác nhận). Thao tác nhiều lời gọi dừng ở lời
//       gọi đầu tiên không ok (kiểm thử khẳng định lời gọi sau không chạy).
//       readDraft: to_stage rỗng → required (khóa lỗi to_stage, câu "Chọn giai đoạn
//       mới."), kể cả khi confirmed; không kiểm to_stage có trong danh mục (chỉ chọn
//       được từ list_stages; backend trả 400 nếu sai). [UI-ONLY]: ghi chú trim của JS
//       (ASCII, U+00A0, U+3000, U+FEFF…), rỗng → null. Routers không nhận giá trị
//       Configs nào, nên Main không trao rules. Không đọc error_body.details.
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Kiểm thử của update_progress đạt, đủ ma trận phủ I3.6 cho sáu lời gọi, cộng mọi
//       ca bắt buộc của plan phiên 20 việc 3.
//     how: >
//       Trong UI/: npm run check (vitest, http_client giả, không mạng); npx vitest run
//       src/logic/workflows/update_progress. Tệp tests/adapters.test.ts,
//       services.test.ts, routers.test.ts.
//     result: >
//       "Tests 181 passed (181)": adapters.test.ts 100 (bảng nhãn khớp từng dòng; Configs
//       ghi data 8.0.1, api 4.0.0; với từng lời gọi: phương thức, đường dẫn, thân {
//       stage_change }; mọi nhãn khai báo; code khác mã; thân lỗi sai hình; unreachable
//       ghi console.error; nhãn không khai báo; thân rỗng; thiếu trường; sai kiểu;
//       amount_minor 2^53 ở list_commissions; một phần tử sai của danh sách; trường
//       thừa bị bỏ; bốn stage_kind hợp lệ, bốn giá trị lạ bị từ chối; updated_at null;
//       from_stage, note null; lịch sử rỗng, bảng rỗng ok; list_stages rỗng là
//       contract_violation; mã lạ ok; URL-encode). services.test.ts 69 (10 cặp mã có
//       câu duyệt từ Configs; mọi loại lỗi của từng lời gọi của ba thao tác, lời gọi sau
//       không chạy; thứ tự gọi list_stages → get_board → list_commissions; đơn không
//       mục → nhóm đầu; nhóm theo list_stages kể cả thứ tự khác mặc định (nhóm đầu là
//       giai đoạn đầu của list_stages); nhóm rỗng bỏ; "Giai đoạn khác: <mã>" mỗi mã
//       một nhóm; mục của đơn không có bị bỏ; thứ tự trong nhóm: hạn sớm trước, không
//       hạn cuối, cùng hạn mới sửa trước (độ lệch UTC khác nhau), rồi id; hạn giao ở
//       America/Los_Angeles; updated_at null và lịch sử rỗng; giờ Asia/Ho_Chi_Minh;
//       lịch sử mới nhất trước; khép lại theo kind (delivered, cancelled đóng; on_hold,
//       completed mở; "archived" kind finished đóng, "delivered" kind active mở); lựa
//       chọn không có giai đoạn hiện tại; danh mục giả "shipped" finished, "dropped"
//       cancelled; needs_confirmation không gọi change_stage; xác nhận gửi đúng một
//       lần; giai đoạn thường gửi ngay; câu 409). routers.test.ts 12 (chưa chọn →
//       required, Services không gọi, cả khi confirmed; ghi chú trim; khoảng trắng
//       ASCII, U+00A0, U+3000, U+2003, U+FEFF → null; đúng hai khóa; Services thật →
//       "Chọn giai đoạn mới.").
//     recorded_at: 2026-09-29T17:44:00+07:00
//   - claim: >
//       Các kiểm thử bắt buộc cắn: làm hỏng từng quyết định thì kiểm thử hỏng.
//     how: >
//       Scratchpad bite.py: sửa tạm một dòng của services.ts, chạy npx vitest run
//       tests/services.test.ts, khôi phục nguyên byte; năm lần.
//     result: >
//       (a) lựa chọn giữ giai đoạn hiện tại: "3 failed | 66 passed (69)"; (b) giai đoạn
//       khép lại gửi không cần xác nhận: "1 failed"; (c) khép lại nhận theo MÃ
//       (delivered, cancelled) thay cho kind: "1 failed" (ca danh mục giả); (d) đơn
//       không mục vào giai đoạn cuối: "3 failed"; (e) lịch sử cũ nhất trước: "1
//       failed". Sau khôi phục: toàn layer "Tests 780 passed (780)".
//     recorded_at: 2026-09-29T17:45:30+07:00
//   - claim: >
//       Chạy thật (iWCA D7): Routers của update_progress, được progress_board,
//       stage_change và phần Tiến độ của commission_detail gọi, đi qua Services,
//       Adapters, http_client tới Backend.py thật, cho cả sáu lời gọi.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-29#2,
//       npm run e2e năm lần liên tiếp (17:46–17:59). Bản ghi
//       UI/evidence/walkthroughs/{progress_board,stage_change,commission_detail}/*-run.json.
//     result: >
//       Năm lần "42 passed". loadProgressBoard (list_stages + get_board +
//       list_commissions): progress_board S1 (rỗng), S2 (ba nhóm đúng D3_EXPECTED_BOARD),
//       S4 (unreachable rồi ok). loadCommissionProgress (get_stage + get_stage_history):
//       commission_detail S1 (chưa đặt), S4 (unreachable của phần rồi ok), S5 (đã giao,
//       khép lại); stage_change S2, S4, S5 (sau đổi). openStageChange (list_stages +
//       get_stage): stage_change S1, S3, S4, S5. saveStageChange: rejected_input S1
//       (không gửi); change_stage giai đoạn thường S2 (không hỏi), unreachable rồi ok
//       S4; needs_confirmation rồi Quay lại, không gửi S3; xác nhận rồi change_stage
//       tới delivered S5.
//     recorded_at: 2026-09-29T17:59:31+07:00
//
// NOTES:
//   - content: >
//       Cho Orchestrator (không chặn): đặc tả D3 viết "Đơn đã <tên giai đoạn>, không
//       đổi giai đoạn được nữa." (commission_detail và stage_change). Với bảng tên
//       của chính đặc tả, câu thành "Đơn đã Đã giao, …", "Đơn đã Đã hủy, …". Phiên
//       20 dùng mẫu 'Đơn đang ở giai đoạn "{name}", không đổi giai đoạn được nữa.'
//       ở configs.texts.closed (một chỗ). Nếu Orchestrator chốt câu khác, chỉ sửa
//       dòng đó và hai kiểm thử services, ba spec e2e có câu này.
//     written_at: 2026-09-29
// ===WCA-CHECKPOINT-END===
/**
 * Services of the interface workflow update_progress: the only place of the
 * workflow that decides, and only presentation decisions (iwca_theory.md §5).
 * Every CallResult becomes a ViewResult by the table of i3-logic.md Step I3.4;
 * an operation made of several calls stops at the first call that is not ok,
 * and its result is that call's (ui_decomposition.md D3).
 */
import { assertNever, INPUT_FORMAT_CODE } from '../../shared/results'
import type { CallResult, InputFormatCode, ResultMessages, ViewResult } from '../../shared/results'
import type { UpdateProgressAdapters } from './adapters'
import type { UpdateProgressConfigs } from './configs'
import type {
  BoardGroupView,
  BoardRowView,
  CommissionList,
  CommissionListItem,
  CommissionProgressView,
  ProgressBoard,
  ProgressBoardView,
  ProgressHistory,
  ProgressState,
  StageChange,
  StageChangeOutcomeView,
  StageChangeTarget,
  StageChangeView,
  StageKind,
  StageOption,
  StageOptions,
} from './entities'

type EndpointKey = keyof UpdateProgressConfigs['endpoints']

// An operation of several calls: the first answer that is not ok ends it.
type Step<T> = { ok: true; data: T } | { ok: false; result: ViewResult<never> }
type Failed = Exclude<CallResult<unknown>, { kind: 'ok' }>

// "{name} ({count})" with { name, count } → "Phác thảo (2)".
function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([a-z]+)\}/g, (whole, key: string) => (Object.hasOwn(values, key) ? values[key] : whole))
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export function createUpdateProgressServices(adapters: UpdateProgressAdapters, cfg: UpdateProgressConfigs, messages: ResultMessages) {
  // Presentation decision: dates and times in the machine's time zone, Vietnamese format.
  const dateTime = new Intl.DateTimeFormat(cfg.displayLocale, cfg.dateTimeFormat)
  const { texts } = cfg

  // Presentation decision: the Vietnamese name of a stage; a code missing
  // from the table (the backend's stage_catalog changed) is shown as is.
  function stageName(code: string): string {
    return Object.hasOwn(cfg.stageNames, code) ? cfg.stageNames[code] : code
  }

  // A stage is closed by its kind, never by its code (contract:
  // update_progress.description; ui_decomposition.md D3).
  function isClosed(kind: StageKind): boolean {
    return cfg.closedKinds.includes(kind)
  }

  // The kind of a stage of stage_options. Its field is named kind by the
  // contract, and R13 lets a property named kind be read only as the
  // discriminant of a switch; so its value is taken through one, a case per
  // value of stage_kind (update_progress-EXP-004).
  function kindOf(option: StageOption): StageKind {
    switch (option.kind) {
      case 'active':
        return 'active'
      case 'on_hold':
        return 'on_hold'
      case 'finished':
        return 'finished'
      case 'cancelled':
        return 'cancelled'
    }
  }

  // Presentation decision: a deadline YYYY-MM-DD shown as dd/mm/yyyy, cut
  // straight from the string. Never through new Date(...): a date string is
  // read as a UTC instant, which a negative time zone shows as the day before.
  function deadlineText(deadline: string | null): string {
    if (deadline === null) return texts.noDeadline
    const [y, m, d] = deadline.split('-')
    return `${texts.deadlinePrefix} ${d}/${m}/${y}`
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

  // A call of an operation of several calls: its data, or the operation's result.
  function step<T>(r: CallResult<T>, endpoint: EndpointKey): Step<T> {
    switch (r.kind) {
      case 'ok':
        return { ok: true, data: r.data }
      case 'declared_error':
      case 'unreachable':
      case 'contract_violation':
        return { ok: false, result: failure(r, endpoint) }
      default:
        return assertNever(r)
    }
  }

  // Presentation decision: order inside a group of the board — earliest
  // deadline first, no deadline last (YYYY-MM-DD strings compare as dates);
  // same deadline → most recently updated first (instants compared, not
  // strings: two timestamps may carry different UTC offsets); then commission_id.
  function boardOrder(a: CommissionListItem, b: CommissionListItem): number {
    if (a.deadline !== b.deadline) {
      if (a.deadline === null) return 1
      if (b.deadline === null) return -1
      return a.deadline < b.deadline ? -1 : 1
    }
    return Date.parse(b.updated_at) - Date.parse(a.updated_at) || byId(a.commission_id, b.commission_id)
  }

  function boardRow(c: CommissionListItem): BoardRowView {
    return { commissionId: c.commission_id, title: c.title, detailText: deadlineText(c.deadline) }
  }

  // Presentation decision (ui_decomposition.md D3, progress_board): every
  // commission of list_commissions in the group of its current stage; one
  // with no entry in progress_board counts as the first stage of list_stages
  // (contract: progress_entry_record). Groups in the order of list_stages,
  // empty ones left out; entries whose stage is not in list_stages go to last
  // groups "Giai đoạn khác: <code>", one per code, by code. Entries of a
  // commission missing from list_commissions are left out (no title to show).
  function boardView(stages: StageOptions, board: ProgressBoard, commissions: CommissionList): ProgressBoardView {
    const stageOf = new Map(board.map((e) => [e.commission_id, e.current_stage]))
    const first = stages[0].stage
    const byStage = new Map<string, CommissionListItem[]>()
    for (const c of commissions) {
      const stage = stageOf.get(c.commission_id) ?? first
      byStage.set(stage, [...(byStage.get(stage) ?? []), c])
    }
    const known = new Set(stages.map((s) => s.stage))
    const group = (key: string, title: string, members: CommissionListItem[]): BoardGroupView => ({
      key,
      title: fillTemplate(texts.groupTitle, { name: title, count: String(members.length) }),
      rows: [...members].sort(boardOrder).map(boardRow),
    })
    const groups: BoardGroupView[] = []
    for (const s of stages) {
      const members = byStage.get(s.stage)
      if (members !== undefined) groups.push(group(s.stage, stageName(s.stage), members))
    }
    const unknown = [...byStage.keys()].filter((code) => !known.has(code)).sort(byId)
    for (const code of unknown) {
      groups.push(group(`other:${code}`, fillTemplate(texts.otherStageGroup, { code }), byStage.get(code) ?? []))
    }
    return { groups, isEmpty: commissions.length === 0 }
  }

  function closedText(state: ProgressState): string | null {
    return isClosed(state.stage_kind) ? fillTemplate(texts.closed, { name: stageName(state.current_stage) }) : null
  }

  // Presentation decision (ui_decomposition.md D3, commission_detail): the
  // current stage with when it was set; the history newest first (the
  // contract gives it oldest first), each line "<from> → <to>" (first change:
  // "Bắt đầu: <to>"), its date and time, and its note when there is one.
  function progressView(state: ProgressState, history: ProgressHistory): CommissionProgressView {
    const historyLines = [...history].reverse().map((h) => {
      const change =
        h.from_stage === null
          ? fillTemplate(texts.historyStart, { to: stageName(h.to_stage) })
          : fillTemplate(texts.historyChange, { from: stageName(h.from_stage), to: stageName(h.to_stage) })
      return [change, dateTime.format(new Date(h.changed_at)), ...(h.note === null ? [] : [h.note])].join(texts.historySeparator)
    })
    return {
      stageText: stageName(state.current_stage),
      updatedText: state.updated_at === null ? texts.neverUpdated : fillTemplate(texts.updatedAt, { when: dateTime.format(new Date(state.updated_at)) }),
      historyLines,
      noHistoryText: texts.noHistory,
      closed: isClosed(state.stage_kind),
      closedText: closedText(state),
    }
  }

  // Presentation decision (ui_decomposition.md D3, stage_change): the stages
  // offered, in the order of list_stages, without the current one (the
  // contract refuses a change to the current stage); which of them close the
  // commission (by kind), so that moving there is confirmed first.
  function stageChangeView(stages: StageOptions, state: ProgressState): StageChangeView {
    return {
      currentStageText: stageName(state.current_stage),
      closed: isClosed(state.stage_kind),
      closedText: closedText(state),
      choices: stages.filter((s) => s.stage !== state.current_stage).map((s) => ({ value: s.stage, label: stageName(s.stage) })),
      chooseLabel: texts.chooseStage,
      target: { commissionId: state.commission_id, closingStages: stages.filter((s) => isClosed(kindOf(s))).map((s) => s.stage) },
      draft: { toStage: '', note: '' },
    }
  }

  return {
    // progress_board: list_stages, get_board, list_commissions — one operation.
    async loadProgressBoard(): Promise<ViewResult<ProgressBoardView>> {
      const stages = step(await adapters.listStages(), 'listStages')
      if (!stages.ok) return stages.result
      const board = step(await adapters.getBoard(), 'getBoard')
      if (!board.ok) return board.result
      return toView(await adapters.listCommissions(), 'listCommissions', (commissions) => boardView(stages.data, board.data, commissions))
    },

    // commission_detail, part "Tiến độ": get_stage, get_stage_history — one operation.
    async loadCommissionProgress(commissionId: string): Promise<ViewResult<CommissionProgressView>> {
      const state = step(await adapters.getStage(commissionId), 'getStage')
      if (!state.ok) return state.result
      return toView(await adapters.getStageHistory(commissionId), 'getStageHistory', (history) => progressView(state.data, history))
    },

    // stage_change: list_stages, get_stage — one operation.
    async openStageChange(commissionId: string): Promise<ViewResult<StageChangeView>> {
      const stages = step(await adapters.listStages(), 'listStages')
      if (!stages.ok) return stages.result
      return toView(await adapters.getStage(commissionId), 'getStage', (state) => stageChangeView(stages.data, state))
    },

    // stage_change, "Lưu" or "Xác nhận" (input has passed the format check
    // of Routers). Presentation decision (§7.2, principle 5): moving to a
    // closed stage cannot be undone, so it is not sent until confirmed; any
    // other stage is sent at once.
    async saveStageChange(target: StageChangeTarget, input: StageChange, confirmed: boolean): Promise<ViewResult<StageChangeOutcomeView>> {
      if (!confirmed && target.closingStages.includes(input.to_stage)) {
        return { kind: 'ok', view: { outcome: 'needs_confirmation', message: fillTemplate(texts.confirmClosing, { name: stageName(input.to_stage) }) } }
      }
      return toView(await adapters.changeStage(target.commissionId, input), 'changeStage', (state) => ({
        outcome: 'changed',
        commissionId: state.commission_id,
        message: fillTemplate(cfg.notices.changed, { name: stageName(state.current_stage) }),
      }))
    },

    // The fixed rejection function for Routers (i3-logic.md, Step I3.4):
    // Routers detects, Services chooses the words — the workflow's own message
    // for the field and reason (configs.inputMessages), else the layer's.
    rejectInput(fields: Record<string, InputFormatCode>): ViewResult<never> {
      const fieldErrors = Object.fromEntries(
        Object.entries(fields).map(([field, code]) => [field, cfg.inputMessages[field]?.[code] ?? messages.input[code]]),
      )
      return { kind: 'rejected', origin: 'input', code: INPUT_FORMAT_CODE, message: messages.inputSummary, fieldErrors }
    },
  }
}

export type UpdateProgressServices = ReturnType<typeof createUpdateProgressServices>
