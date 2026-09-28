// ===WCA-CHECKPOINT-START===
// workflow: manage_client
// clause: external
// component: services
// last_updated_by: coding-agent@2026-09-28#2
// last_updated_at: 2026-09-28T12:30:00+07:00
//
// EXPERIENCES:
//   - id: manage_client-EXP-001
//     content: >
//       Năm điểm giao tiếp (từ phiên 16), bảng nhãn ở configs.ts, [CONTRACT]
//       api_contract.yaml 4.0.0, chép từng dòng, không nhãn nào khác:
//       list_clients GET /clients { 200 ok, 500 ERR_STORAGE_IO };
//       get_client GET /clients/{client_id} { 200 ok, 404 ERR_NOT_FOUND, 500
//       ERR_STORAGE_IO }; create_client POST /clients { 201 ok, 400
//       ERR_VALIDATION, 500 ERR_STORAGE_IO }; edit_client PUT
//       /clients/{client_id} { 200 ok, 400 ERR_VALIDATION, 404 ERR_NOT_FOUND,
//       500 ERR_STORAGE_IO }; set_client_archived PUT
//       /clients/{client_id}/archived { 200 ok, 400 ERR_VALIDATION, 404
//       ERR_NOT_FOUND, 500 ERR_STORAGE_IO }. Nhãn ok của bốn lời gọi mới đều
//       ref client_detail. Adapters có một hàm call() chung phân loại đúng bốn
//       bước của I3.3 bằng switch trên Transport.kind (R13): unreachable → nhãn
//       không khai báo (Object.hasOwn) → nhãn 'ok' kiểm output bằng Zod → nhãn
//       mã lỗi kiểm error_body rồi so code. {client_id} được điền bằng
//       encodeURIComponent. formats.id và formats.timestamp nằm trong Configs,
//       [CONTRACT] data_schema.yaml 7.0.0 (từ phiên 17; nội dung hai định dạng
//       này không đổi từ 6.2.0).
//   - id: manage_client-EXP-002
//     content: >
//       Kiểm thân bằng Zod 4: z.object mặc định bỏ trường thừa (đúng I3.2), cả
//       trong phần tử contacts; issue.path chỉ đúng phần tử và trường (reason
//       dạng "get_client label 200 client_detail: contacts.1.value: ...").
//       http_client trả body null (thân rỗng hoặc không phải JSON) thì readWith
//       báo "body is empty or not JSON". error_body: code, message là chuỗi,
//       details là object|null và KHÔNG kiểm sâu hơn (hợp đồng không khai hình
//       dạng bên trong). client_list và client_detail không có số nguyên nào nên
//       không có phép kiểm số nguyên an toàn; workflow có số nguyên thì phải thêm.
//   - id: manage_client-EXP-003
//     content: >
//       Quyết định trình bày ở Services, mỗi quyết định đã qua phép thử §5:
//       (1) sắp tên theo Intl.Collator('vi') (backend trả thứ tự casefold: "Ánh",
//       "Đức" sau "Zoe"), tên trùng xếp theo client_id; (2) tách nhóm đang hoạt
//       động / đã lưu trữ; (3) isEmpty khi không có khách nào (trang hiện trạng
//       thái rỗng có nút thêm); (4) ngày giờ theo giờ của máy,
//       Intl.DateTimeFormat('vi-VN', ngày/tháng/năm giờ:phút), ví dụ "10:53
//       28/09/2026"; (5) liên hệ hiện "kênh: giá trị" theo thứ tự đã lưu; (6)
//       trạng thái "Đang hoạt động" hoặc "Đã lưu trữ"; (7) câu cho mỗi mã lỗi và
//       câu xác nhận sau mỗi thao tác ghi, trong đó câu lưu trữ nói rõ hậu quả
//       (không tạo được đơn mới cho khách đã lưu trữ, data_schema 6.2.0
//       manage_commission.description); (8) chuyển client_detail đã lưu thành
//       bản nháp của form (note null thành chuỗi rỗng). Mọi CallResult đi qua
//       một hàm toView() duy nhất theo bảng I3.4.
//   - id: manage_client-EXP-004
//     content: >
//       Kiểm thử của workflow nằm trong thư mục workflow, nên R2 cấm nó import
//       cấu hình cấp layer (src/configs/). Kiểm thử Services tự khai báo một
//       ResultMessages giả, như cách Main trao vào. Ngoại lệ của tệp kiểm thử là
//       R14, TEST_IMPORTS và (từ phiên 16) R13, không phải R2.
//   - id: manage_client-EXP-005
//     content: >
//       (Từ NOTE phiên 12, nay đã có kiểm thử chứng minh.) Theo
//       endpoint_forms.http, thân JSON có khóa là TÊN INPUT: create_client và
//       edit_client gửi { "client_input": { display_name, contacts, note } },
//       set_client_archived gửi { "is_archived": true|false }; client_id nằm trên
//       đường dẫn. Gửi client_input trần thì backend trả 400 ERR_VALIDATION
//       (đo ở phiên 12). Chứng minh: kiểm thử "sends the declared method and
//       path, the body keyed by input name" của từng endpoint, và kịch bản bấm
//       thử client_form S1, S3, S5 cùng client_detail S2, S3, S4 trên backend thật.
//   - id: manage_client-EXP-006
//     content: >
//       Kiểm dữ liệu form (ui_decomposition.md §5, client_form). Routers PHÁT HIỆN
//       và chuyển đổi (iWCA I3.5), Services.rejectInput CHỌN CÂU (I3.4); plan
//       phiên 16 viết "Services kiểm dữ liệu form", đã làm theo iWCA, kết quả như
//       nhau. Từ phiên 17 (Data Schema 7.0.0, CT-2) luật chia hai loại, ghi ngay
//       trong readDraft của routers.ts. SAO TỪ HỢP ĐỒNG (client_input,
//       formats.not_blank): tên not blank, thiếu thì 'required'; tên dài hơn
//       limits.displayNameMaxLength (120) ký tự, đếm theo code point
//       ([...s].length, như len() của Python ở backend), thành
//       'violates_type_constraint'; channel và value not blank, thiếu thì
//       'required' trên đúng ô đó. [UI-ONLY]: bỏ khoảng trắng hai đầu mọi ô
//       trước khi kiểm và gửi (hợp đồng lưu nguyên giá trị; giao diện chọn gửi
//       bản đã bỏ khoảng trắng); hàng liên hệ trống cả hai ô bị bỏ, không báo
//       lỗi; ghi chú rỗng thành null. Hành vi không đổi so với phiên 16, chỉ đổi
//       căn cứ: luật trống nay là bản sao của hợp đồng, qua phép thử §5.
//       trim() của JS bỏ cả khoảng trắng Unicode (U+00A0, U+3000, tab); nếu
//       backend coi khác ở một ký tự điều khiển hiếm, nó trả 400 và trang hiện
//       câu 400 chung (có kiểm thử dựng trang). Khóa lỗi:
//       displayName, contacts.<chỉ số hàng trong bản nháp>.channel|value. Câu
//       riêng của workflow ở configs.inputMessages theo khóa bỏ chỉ số
//       (contacts.value); không có thì lấy ResultMessages.input. Không đọc
//       error_body.details: 400 của backend hiện một câu chung ở đầu form. Không
//       giới hạn số liên hệ, không cấm tên trùng (hợp đồng không có hai luật đó).
//   - id: manage_client-EXP-007
//     content: >
//       Routers (một thao tác cho mỗi việc trang làm, iWCA D2): loadClientList;
//       loadClientDetail(clientId); openClientForm(target), với mode create trả
//       bản nháp rỗng và gợi ý kênh, KHÔNG gọi backend, còn mode edit gọi
//       get_client (đây là "tải chi tiết" của trang form); saveClient(target,
//       draft); setClientArchived(clientId, archived). Routers nhận Services và
//       MANAGE_CLIENT_CONFIGS.limits do Main trao (R14). ClientFormTarget là
//       { mode: 'create' } hoặc { mode: 'edit', clientId }.
//   - id: manage_client-EXP-008
//     content: >
//       Nguồn của từng giá trị trong configs.ts. [CONTRACT]: contract (api
//       4.0.0, data 7.0.0 từ phiên 17); endpoints (api_contract.yaml 4.0.0
//       clause_b_backend.manage_client.endpoints: address, output từng dòng;
//       không đổi ở 7.0.0); formats.id, formats.timestamp (data_schema 7.0.0
//       clause_a_common.formats); limits.displayNameMaxLength = 120 (data_schema
//       7.0.0 manage_client.input_expected.client_input, chú thích trích nguyên
//       kiểu mới: display_name string (1..120 characters, not blank), channel và
//       value string (1.. characters, not blank), cùng câu của
//       formats.not_blank; not blank không cần giá trị nào trong Configs).
//       [UI-ONLY]: errorMessages (ERR_STORAGE_IO,
//       ERR_VALIDATION, ERR_NOT_FOUND, đủ mọi mã của năm bảng nhãn; kiểm thử
//       duyệt từ bảng nhãn), inputMessages, statusText, notices,
//       channelSuggestions (email, facebook, instagram, discord, zalo, x theo
//       ui_decomposition §5), collationLocale 'vi', displayLocale 'vi-VN',
//       dateTimeFormat, contactSeparator.
//   - id: manage_client-EXP-009
//     content: >
//       (Đóng NOTE phiên 16 cho Orchestrator về luật "hàng liên hệ trống một ô".)
//       Hợp đồng Data Schema 7.0.0 (CT-2, duyệt 2026-09-28) đã giải quyết: tên,
//       channel, value đều not blank (formats.not_blank), nên luật này không còn
//       là quyết định nghiệp vụ nằm ở giao diện mà là bản sao của type (được phép
//       theo iwca_theory §5, đặt cạnh chú thích [CONTRACT] trỏ đúng điều khoản).
//       Phần [UI-ONLY] còn lại (bỏ khoảng trắng, bỏ hàng trống cả hai ô, ghi chú
//       rỗng thành null) là quyết định trình bày, ghi ở ui_decomposition §5.
//       manage_client của hợp đồng đang đang_triển_khai: việc của backend (BE-5),
//       API Contract không đổi, nhãn và mã lỗi giữ nguyên.
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Kiểm thử của manage_client đạt, đủ ma trận phủ của I3.6 cho năm điểm
//       giao tiếp, mọi luật kiểm dữ liệu form, và thân yêu cầu đúng dạng.
//     how: >
//       Trong UI/: npm run check (vitest, http_client giả, không có mạng).
//       Tệp src/logic/workflows/manage_client/tests/adapters.test.ts,
//       adapters_client_detail.test.ts, services.test.ts, routers.test.ts.
//     result: >
//       adapters.test.ts 23 đạt (list_clients, như phiên 12).
//       adapters_client_detail.test.ts 73 đạt: với từng get_client,
//       create_client, edit_client, set_client_archived có phương thức, đường
//       dẫn, thân { client_input } hoặc { is_archived }; mọi nhãn khai báo
//       (200/201 ok, 400, 404, 500 declared_error); details là object vẫn
//       declared_error; unreachable; nhãn không khai báo; thân null; thiếu
//       created_at; note sai kiểu; is_archived null; đúng một liên hệ sai
//       ("contacts.1.value"); client_id viết hoa; created_at thiếu độ lệch; code
//       khác mã khai báo; details là chuỗi; thân lỗi null; trường thừa bị bỏ;
//       cộng một ca {client_id} được mã hóa URL. services.test.ts 38 đạt (mọi
//       CallResult sang ViewResult của cả năm thao tác; mọi mã lỗi duyệt từ
//       Configs đều có câu; thứ tự tiếng Việt, nhóm, isEmpty, ngày giờ, liên hệ,
//       trạng thái, câu xác nhận, rejectInput theo từng ô). routers.test.ts 17
//       đạt (tên rỗng, toàn dấu cách, đúng 120 ký tự có dấu tiếng Việt thì gửi,
//       121 thì từ chối, 119 chữ cộng một emoji (121 đơn vị UTF-16) thì gửi;
//       hàng trống bị bỏ; hàng thiếu một ô báo lỗi đúng hàng; 50 liên hệ; ghi
//       chú rỗng thành null; Services không được gọi khi có lỗi). Toàn layer:
//       "Test Files 10 passed (10)", "Tests 225 passed (225)".
//     recorded_at: 2026-09-28T10:56:10+07:00
//   - claim: >
//       Chạy thật (iWCA D7): Routers của manage_client, được ba trang gọi, đi qua
//       Services, Adapters, http_client tới Backend.py thật, cho cả năm điểm giao
//       tiếp.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-28#1
//       npm run e2e. Bản ghi và ảnh ở UI/evidence/walkthroughs/client_list/,
//       client_detail/, client_form/.
//     result: >
//       "17 passed (59.7s)". list_clients: client_list S1, S3 (unreachable rồi
//       ok). get_client: client_list S5, client_detail S1, S6 (form edit mở với
//       dữ liệu đã lưu), client_form S3. create_client: client_form S1, S5
//       (unreachable rồi ok). edit_client: client_form S3. set_client_archived:
//       client_detail S2 (true), S3 (false), S4 (unreachable rồi ok).
//       rejected_input không gửi gì: client_form S2, S4 (danh sách và tên không đổi).
//     recorded_at: 2026-09-28T10:54:37+07:00
//
//   - claim: >
//       CT-2 phía giao diện (phiên 17): Routers từ chối tên chỉ gồm khoảng trắng
//       Unicode và channel, value chỉ gồm khoảng trắng, không gọi Services; giữ
//       mọi ca cũ.
//     how: >
//       Trong UI/: npx vitest run src/logic/workflows/manage_client/tests/routers.test.ts,
//       rồi npm run check.
//     result: >
//       routers.test.ts 23 đạt (17 cũ + 6 mới: tên chỉ gồm U+00A0; U+3000; tab và
//       xuống dòng; trộn U+00A0, U+2003, U+3000, U+FEFF → 'required' và Services
//       không được gọi; tên có U+00A0 ở giữa gửi đi đã bỏ khoảng trắng hai đầu;
//       channel U+00A0 và value U+3000+tab → 'required' đúng hai ô). Routers
//       không phải sửa (hành vi đã đúng hợp đồng mới). npm run check: "Tests 241
//       passed (241)".
//     recorded_at: 2026-09-28T12:08:43+07:00
//   - claim: >
//       Chạy thật (iWCA D7) với mã cuối phiên 17: năm điểm giao tiếp tới Backend.py
//       thật, qua ba kịch bản, 5 lần e2e liên tiếp đều đạt.
//     how: >
//       Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-28#2, npm run e2e
//       năm lần liên tiếp (12:18–12:24). Bản ghi UI/evidence/walkthroughs/*/*-run.json.
//     result: >
//       Năm lần "17 passed". list_clients: client_list S1, S3. get_client:
//       client_list S5, client_detail S1, S6, client_form S3. create_client:
//       client_form S1, S5 (unreachable rồi ok). edit_client: client_form S3.
//       set_client_archived: client_detail S2, S3, S4. rejected_input không gửi
//       gì: client_form S2 (tên ba dấu cách), S4.
//     recorded_at: 2026-09-28T12:24:05+07:00
//
// NOTES: []
// ===WCA-CHECKPOINT-END===
/**
 * Services of the interface workflow manage_client: the only place of the
 * workflow that decides, and only presentation decisions (iwca_theory.md §5).
 * Every CallResult becomes a ViewResult by the table of i3-logic.md Step I3.4.
 */
import { assertNever, INPUT_FORMAT_CODE } from '../../shared/results'
import type { CallResult, InputFormatCode, ResultMessages, ViewResult } from '../../shared/results'
import type { ManageClientAdapters } from './adapters'
import type { ManageClientConfigs } from './configs'
import type {
  ArchivedClientView,
  ClientDetail,
  ClientDetailView,
  ClientFormTarget,
  ClientFormView,
  ClientInput,
  ClientList,
  ClientListView,
  ClientRowView,
  SavedClientView,
} from './entities'

export function createManageClientServices(
  adapters: ManageClientAdapters,
  cfg: ManageClientConfigs,
  messages: ResultMessages,
) {
  // Presentation decision: Vietnamese alphabetical order ("Ánh" right after
  // "An", "Đ" after "D"), not the backend's casefold order. Ties (same name)
  // keep a stable order by id, so the list does not reshuffle on reload.
  const collator = new Intl.Collator(cfg.collationLocale)
  const byName = (a: ClientRowView, b: ClientRowView) =>
    collator.compare(a.name, b.name) || (a.clientId < b.clientId ? -1 : a.clientId > b.clientId ? 1 : 0)

  // Presentation decision: dates and times in the machine's time zone, Vietnamese format.
  const dateTime = new Intl.DateTimeFormat(cfg.displayLocale, cfg.dateTimeFormat)

  // Presentation decision: active and archived clients are shown as two groups.
  function listView(list: ClientList): ClientListView {
    const row = (c: ClientList[number]): ClientRowView => ({ clientId: c.client_id, name: c.display_name })
    return {
      active: list.filter((c) => !c.is_archived).map(row).sort(byName),
      archived: list.filter((c) => c.is_archived).map(row).sort(byName),
      isEmpty: list.length === 0,
    }
  }

  function detailView(c: ClientDetail): ClientDetailView {
    return {
      clientId: c.client_id,
      name: c.display_name,
      isArchived: c.is_archived,
      statusText: c.is_archived ? cfg.statusText.archived : cfg.statusText.active,
      contactLines: c.contacts.map((x) => `${x.channel}${cfg.contactSeparator}${x.value}`),
      note: c.note,
      createdText: dateTime.format(new Date(c.created_at)),
      updatedText: dateTime.format(new Date(c.updated_at)),
    }
  }

  // A stored client back into the raw form draft it can be edited from.
  function formView(c: ClientDetail | null): ClientFormView {
    return {
      draft: {
        displayName: c === null ? '' : c.display_name,
        contacts: c === null ? [] : c.contacts.map((x) => ({ channel: x.channel, value: x.value })),
        note: c === null || c.note === null ? '' : c.note,
      },
      channelSuggestions: cfg.channelSuggestions,
    }
  }

  // Every CallResult to a ViewResult (i3-logic.md Step I3.4); ok builds the view.
  function toView<T, V>(r: CallResult<T>, ok: (data: T) => V): ViewResult<V> {
    switch (r.kind) {
      case 'ok':
        return { kind: 'ok', view: ok(r.data) }
      case 'declared_error':
        // Presentation decision: the message for each declared error code.
        return { kind: 'rejected', origin: 'system', code: r.error.code, message: cfg.errorMessages[r.error.code], fieldErrors: {} }
      case 'unreachable':
        return { kind: 'unreachable', message: messages.unreachable }
      case 'contract_violation':
        return { kind: 'contract_violation', message: messages.contractViolation }
      default:
        return assertNever(r)
    }
  }

  return {
    async loadClientList(): Promise<ViewResult<ClientListView>> {
      return toView(await adapters.listClients(), listView)
    },

    async loadClientDetail(clientId: string): Promise<ViewResult<ClientDetailView>> {
      return toView(await adapters.getClient(clientId), detailView)
    },

    // The form of a new client opens empty, without any call; the form of an
    // existing client opens with what is stored (get_client).
    async openClientForm(target: ClientFormTarget): Promise<ViewResult<ClientFormView>> {
      switch (target.mode) {
        case 'create':
          return { kind: 'ok', view: formView(null) }
        case 'edit':
          return toView(await adapters.getClient(target.clientId), formView)
        default:
          return assertNever(target)
      }
    },

    // input has passed the format check of Routers.
    async saveClient(target: ClientFormTarget, input: ClientInput): Promise<ViewResult<SavedClientView>> {
      switch (target.mode) {
        case 'create':
          return toView(await adapters.createClient(input), (c) => ({ clientId: c.client_id, message: cfg.notices.created }))
        case 'edit':
          return toView(await adapters.editClient(target.clientId, input), (c) => ({ clientId: c.client_id, message: cfg.notices.edited }))
        default:
          return assertNever(target)
      }
    },

    async setClientArchived(clientId: string, archived: boolean): Promise<ViewResult<ArchivedClientView>> {
      return toView(await adapters.setClientArchived(clientId, archived), (c) => ({
        detail: detailView(c),
        // Presentation decision: say what archiving changes (see configs.notices).
        message: c.is_archived ? cfg.notices.archived : cfg.notices.unarchived,
      }))
    },

    // The fixed rejection function for Routers (i3-logic.md, Step I3.4):
    // Routers detects, Services chooses the words. A field of this workflow
    // may have its own message (configs.inputMessages, by field without the
    // row index); otherwise the layer's message for that reason.
    rejectInput(fields: Record<string, InputFormatCode>): ViewResult<never> {
      const fieldErrors = Object.fromEntries(
        Object.entries(fields).map(([field, code]) => {
          const own = cfg.inputMessages[field.replace(/\.\d+\./g, '.')]
          return [field, own?.[code] ?? messages.input[code]]
        }),
      )
      return { kind: 'rejected', origin: 'input', code: INPUT_FORMAT_CODE, message: messages.inputSummary, fieldErrors }
    },
  }
}

export type ManageClientServices = ReturnType<typeof createManageClientServices>
