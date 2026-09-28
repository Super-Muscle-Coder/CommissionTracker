# GIAI ĐOẠN I3 — TRIỂN KHAI MỘT WORKFLOW GIAO DIỆN (PHÂN KHU LOGIC)

*Giai đoạn thứ ba của iWCA, sau khi đã hoàn thành [I2](i2-scaffold.md). Lặp lại cho từng workflow giao diện trong bảng của [I1](i1-decompose.md). Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại §0 của [lý thuyết WCA](../wca-implementation/wca_theory_compressed.md) và của [lý thuyết iWCA](iwca_theory.md).*

| | |
|---|---|
| **Input** | Một dòng trong bảng workflow giao diện của I1 (tên, workflow đối ứng, điểm giao tiếp gọi tới, quyết định trình bày chính); đúng phần hợp đồng tối cao tương ứng; khung layer đã dựng ở I2. |
| **Hành động** | Viết đủ năm lớp theo thứ tự của [Giai đoạn 4 WCA](../wca-implementation/04-implement.md), với những điểm riêng của phân khu logic nêu dưới đây; viết kiểm thử theo ma trận phủ cố định; ráp nối vào Main. |
| **Output** | Một workflow giao diện hoàn chỉnh, đã ráp nối, lệnh kiểm tra đạt, sẵn sàng cho phân khu màn hình dùng. |

Giai đoạn 4 của WCA áp dụng nguyên vẹn ở đây: thứ tự Configs → Entities → Adapters và Services → Routers → ráp nối tại Main, ranh giới "làm gì" và "quyết định làm gì" giữa Adapters và Services, việc mọi phát hiện được mang về một khối checkpoint duy nhất ở đầu tệp Services. Tệp này không lặp lại những điều đó; nó chỉ ghi những gì khác đi khi bên đang viết là **bên gọi** của hợp đồng, chạy trong một layer giao diện.

## Bước I3.1 — Configs: hiện thực hóa phía bên gọi của điểm giao tiếp

Với mỗi điểm giao tiếp mà workflow gọi tới (theo bảng của I1), Configs có một mục mô tả nó, gắn nhãn `[CONTRACT]` và trỏ đúng điều khoản cùng số phiên bản hợp đồng:

- Phương thức và đường dẫn, lấy từ `address`.
- **Bảng nhãn kết quả đã khai báo**: mỗi nhãn trong `output` của điểm giao tiếp ánh xạ tới hoặc `ok` — khi hợp đồng khai báo nhãn đó bằng `ref` (hoặc `type`, với lối vào của hạ tầng cắt ngang) — hoặc đúng mã lỗi, khi hợp đồng khai báo nhãn đó bằng `code`. Phân loại theo cách khai báo, không theo giá trị số của nhãn ([§6 của lý thuyết iWCA](iwca_theory.md)).

Bảng nhãn này là nguồn duy nhất mà Adapters dùng để phân loại phản hồi ở Bước I3.3. Nó phải khớp hợp đồng từng dòng — thiếu một nhãn thì phản hồi hợp lệ bị coi là vi phạm hợp đồng; thừa một nhãn thì phản hồi vi phạm bị coi là hợp lệ.

Nếu Routers sẽ kiểm những ràng buộc ghi trong ngoặc của `type` (xem [§5 của lý thuyết iWCA](iwca_theory.md)), các ràng buộc đó cũng nằm ở đây, nhãn `[CONTRACT]`.

Giá trị `[UI-ONLY]`: câu thông báo cho **từng** mã lỗi mà các điểm giao tiếp của workflow khai báo, và mọi tham số của quyết định trình bày (ngôn ngữ hiển thị, cách sắp xếp).

⚠ Configs là dữ liệu tĩnh: không hàm, không đọc biến môi trường, không đọc lưu trữ cục bộ. Các lớp khác của workflow không tự lấy **giá trị** từ Configs — Main import rồi trao vào (ở §7 của lý thuyết iWCA, R12 giữ phần đọc môi trường, R14 giữ phần import giá trị — cả hai đều được máy kiểm). Import **kiểu** của Configs để khai báo tham số thì được: đó là mô tả hình dạng, không phải đọc cấu hình.

## Bước I3.2 — Entities: giữ nguyên tên của hợp đồng

Với mỗi hình dạng dữ liệu đi qua ranh giới — input gửi đi, output nhận về — khai báo một kiểu, ghi rõ nó hiện thực hóa `type` nào của hợp đồng. **Tên trường giữ nguyên như hợp đồng**, kể cả khi quy ước đặt tên của ngôn ngữ khác đi. Một lớp đổi tên ở ranh giới không mang lại gì ngoài một chỗ để sai.

Hai chiều của ranh giới có hai quy tắc khác nhau, bắt nguồn từ [Giai đoạn 2 WCA, Bước 2.2 và 2.3](../wca-implementation/02-contract.md):

- **Dữ liệu gửi đi** có đúng các trường hợp đồng liệt kê — không thiếu, không thừa — vì bên nhận từ chối trường thừa.
- **Dữ liệu nhận về** phải có đủ mọi trường hợp đồng cam kết, đúng kiểu. Trường thừa trong phản hồi **bị bỏ qua**, không truyền tiếp: thêm trường vào output là một thay đổi mở rộng, được phép cả trên Điều khoản đã khóa, nên giao diện phải chịu được nó mà không vỡ.

Kiểu của dữ liệu sẵn sàng hiển thị (view model) cũng nằm ở Entities. Đặt tên tự do, theo những gì phân khu màn hình cần đọc — chúng là của riêng giao diện, không phải của hợp đồng.

## Bước I3.3 — Adapters: gửi, kiểm, phân loại

Mỗi điểm giao tiếp có đúng một hàm Adapter. Hàm nhận input đã ở dạng Entities và gửi đi qua tài nguyên do Main trao, **mã hóa input đúng theo mô tả của `form` trong `clause_a_common.endpoint_forms`**: input nào nằm trên đường dẫn, input nào đi trên query, input nào nằm trong thân yêu cầu và dưới dạng gì. Nếu mô tả của `form` không nói đủ để biết điều đó, đây là một chỗ hở của hợp đồng — dừng lại và đưa về Giai đoạn 2 của WCA, không đoán theo thói quen của công nghệ.

Rồi hàm phân loại kết quả thành một `CallResult` theo **đúng thuật toán dưới đây, đúng thứ tự** — đây là phần đặc tả của giai đoạn này:

1. Tài nguyên trả về "không tới được" → `unreachable`.
2. Nhãn nhận được không có trong bảng nhãn đã khai báo của điểm giao tiếp → `contract_violation`.
3. Nhãn ánh xạ tới `ok` → kiểm thân phản hồi theo đúng khai báo của nhãn: với `ref: <tên output>`, theo hình dạng của output đó; với `ref: "list[<tên output>]"`, thân phải là một danh sách và **từng phần tử** được kiểm theo hình dạng của output; với `ref: none` (hoặc `type: none`), không kiểm thân và dữ liệu trả về là `null`. Mức kiểm tối thiểu ở dưới. Đạt → `ok`, với dữ liệu đã kiểm. Không đạt → `contract_violation`.
4. Nhãn ánh xạ tới một mã lỗi → kiểm thân phản hồi theo `error_body`, rồi kiểm `code` trong thân đúng bằng mã đã khai báo cho nhãn đó. Cả hai đạt → `declared_error`, giữ nguyên thân lỗi. Một trong hai không đạt → `contract_violation`.

**Mức kiểm tối thiểu của thân phản hồi**, không được bỏ mục nào: có đủ mọi trường đã cam kết; đúng kiểu nguyên thủy; `null` chỉ ở trường khai báo `|null`; giá trị liệt kê nằm trong danh sách; phần tử danh sách đúng kiểu; và **mọi số nguyên là số nguyên an toàn của ngôn ngữ** (ví dụ `Number.isSafeInteger` trong JavaScript) và nằm trong khoảng hợp đồng quy định. Mục cuối quan trọng hơn vẻ ngoài của nó: bộ phân tích JSON của nhiều ngôn ngữ làm tròn âm thầm số nguyên lớn, và kiểm tính an toàn ngay sau khi phân tích là chỗ duy nhất bắt được điều đó trước khi một con số sai lên màn hình. Kiểm thêm ràng buộc trong ngoặc của `type` là được phép, không bắt buộc.

Khi phân loại ra `unreachable` hoặc `contract_violation`, Adapter ghi `reason` ra kênh chẩn đoán của layer ngay tại chỗ (ví dụ `console.error` nếu dự án không có kênh nào khác), vì đây là chỗ duy nhất biết chi tiết kỹ thuật. Không nơi nào khác ghi lại.

⚠ Adapters không đổi mã lỗi, không đặt câu cho người dùng, không đoán nghĩa của phản hồi bằng cách so chuỗi thông báo, không tự thử lại một lời gọi đã thất bại. Thử lại là một quyết định — nếu cần, nó thuộc Services, với số lần thử nằm trong Configs.

⚠ Adapters không bắt mọi ngoại lệ một cách mù quáng. Bốn loại kết quả mô tả mọi điều **có thể xảy ra ở ranh giới**; một lỗi lập trình bên trong layer (đọc thuộc tính của `undefined`) không thuộc loại nào, và phải nổi lên như một lỗi thật, không bị giả làm `contract_violation`.

## Bước I3.4 — Services: chỉ quyết định trình bày

Services nhận Adapters, Configs của workflow, và `ResultMessages` cấp layer — cả ba do Main trao. Mỗi thao tác mà phân khu màn hình cần là một hàm của Services: gọi Adapters theo trình tự cần thiết, rồi chuyển mỗi `CallResult` thành một `ViewResult`:

| `CallResult` | `ViewResult` |
|---|---|
| `ok` | `ok`, với view model dựng từ dữ liệu bằng các quyết định trình bày của workflow |
| `declared_error` | `rejected`, `origin: 'system'`, `code` giữ nguyên, `message` lấy từ Configs theo mã |
| `unreachable` | `unreachable`, `message` từ `ResultMessages` |
| `contract_violation` | `contract_violation`, `message` từ `ResultMessages` |

Khi một thao tác cần nhiều lời gọi, lời gọi đầu tiên không trả `ok` sẽ dừng cả chuỗi, và kết quả của nó được chuyển thành `ViewResult` theo đúng bảng trên. Không dựng một view model "gần đúng" từ những gì đã có.

Services có thêm đúng một hàm cố định cho Routers dùng, tên cố định là `rejectInput` (để tìm được bằng một lệnh tìm kiếm trong mọi workflow): nhận danh sách mã lỗi định dạng theo từng ô nhập, trả về `rejected` với `origin: 'input'`, `code: INPUT_FORMAT_CODE`, câu tổng từ `ResultMessages.inputSummary`, và câu theo từng ô từ `ResultMessages.input`. Routers phát hiện lỗi định dạng; Services chọn câu chữ.

⚠ Mọi quyết định ở đây phải qua được phép thử của [§5 lý thuyết iWCA](iwca_theory.md): nếu phía sau đổi luật này mà không đổi hợp đồng, dòng code này có trở thành sai không? Nếu có, nó không thuộc về giao diện.

## Bước I3.5 — Routers: lối vào duy nhất của phân khu màn hình

Routers nhận Services do Main trao. Mỗi thao tác phân khu màn hình cần là một hàm của Routers. Khác với Routers của một workflow hệ thống, lối vào ở đây không ánh xạ một-một với điểm giao tiếp của hợp đồng — nó ánh xạ với **những gì trang cần làm** (theo bảng trang của I1). Một thao tác "mở trang" có thể dẫn tới hai lời gọi; hai nút khác nhau có thể dẫn tới cùng một lời gọi với hai input khác nhau.

Routers nhận **dữ liệu thô** từ trang — những gì người dùng gõ vào ô nhập, thường là chuỗi — kiểm và chuyển đổi định dạng theo [§5 của lý thuyết iWCA](iwca_theory.md): đủ trường, đọc được thành đúng kiểu của hợp đồng, và (nếu workflow chọn) đúng ràng buộc trong ngoặc của `type`. Có lỗi thì gọi hàm từ chối của Services với mã lỗi theo từng ô, không gọi đi. Không lỗi thì chuyển dữ liệu đã chuyển đổi, ở dạng Entities, cho Services.

Routers re-export mọi kiểu mà phân khu màn hình cần — `ViewResult`, view model, kiểu của dữ liệu thô mà mỗi hàm nhận, và kiểu của chính tập hợp Routers — để phân khu màn hình chỉ phải nhìn vào đúng tệp này (R8).

## Bước I3.6 — Kiểm thử theo ma trận phủ cố định

Kiểm thử của workflow nằm trong thư mục `tests/` của nó, dùng tài nguyên HTTP client giả. Ma trận phủ dưới đây là **tối thiểu bắt buộc**, không phải gợi ý:

**Adapters — với mỗi điểm giao tiếp:**

- Một ca cho **mỗi** nhãn trong bảng nhãn đã khai báo, với thân phản hồi hợp lệ → đúng `ok` hoặc `declared_error`.
- Một ca "không tới được" → `unreachable`.
- Một ca nhãn không khai báo → `contract_violation`.
- Một ca thân phản hồi thiếu trường cam kết hoặc sai kiểu → `contract_violation`.
- Một ca nhãn lỗi đã khai báo nhưng `code` khác mã đã khai báo → `contract_violation`.
- Nếu output có số nguyên: một ca số nguyên ngoài khoảng an toàn → `contract_violation`.
- Một ca phản hồi có trường thừa → vẫn `ok`, và dữ liệu trả về không chứa trường thừa.
- Nếu một nhãn khai báo `"list[…]"`: một ca danh sách có đúng một phần tử sai hình dạng → `contract_violation`.

**Services:**

- Mỗi loại `CallResult` chuyển đúng sang `ViewResult` theo bảng ở Bước I3.4.
- **Mỗi mã lỗi** mà các điểm giao tiếp của workflow khai báo đều có câu thông báo trong Configs — kiểm bằng cách duyệt bảng nhãn trong Configs, không liệt kê tay, để một mã được thêm vào hợp đồng sau này mà quên thêm câu sẽ làm kiểm thử thất bại.
- Mỗi quyết định trình bày chính (theo bảng của I1) có ít nhất một ca.

**Routers:**

- Với mỗi ô nhập, mỗi loại lỗi định dạng áp dụng được cho kiểu của nó → `rejected`, `origin: 'input'`, và Services không được gọi.
- Một ca dữ liệu thô hợp lệ → Services được gọi với dữ liệu đã chuyển đổi đúng.

## Bước I3.7 — Ráp nối tại Main và cập nhật checkpoint

Thêm workflow vào bước 4 của Main (xem [I2](i2-scaffold.md), Bước I2.6): tạo Adapters với tài nguyên và Configs, tiêm vào Services cùng `ResultMessages`, tạo Routers. Thêm Routers vào giá trị ngữ cảnh, và thêm kiểu của nó vào kiểu ngữ cảnh ở `screens/logic_context`. Chạy lệnh kiểm tra.

Viết hoặc cập nhật khối checkpoint ở đầu tệp Services, đúng [Giao thức 07](../wca-implementation/07-checkpoint-protocol.md) với phần mở rộng ở [§8 của lý thuyết iWCA](iwca_theory.md) (`clause: external`). Mọi phát hiện ở bất kỳ lớp nào đều về đây. Phát hiện thuộc về cả layer — ví dụ một quy ước chung về cách kiểm số nguyên — ghi ở checkpoint `main`.

**Checklist:**

- [ ] Mỗi điểm giao tiếp workflow gọi tới có một mục `[CONTRACT]` trong Configs, trỏ đúng điều khoản và phiên bản, với bảng nhãn kết quả khớp hợp đồng từng dòng.
- [ ] Configs chỉ có dữ liệu tĩnh; có câu thông báo cho **mọi** mã lỗi mà các điểm giao tiếp của workflow khai báo.
- [ ] Entities giữ nguyên tên trường của hợp đồng; dữ liệu gửi đi có đúng các trường hợp đồng liệt kê.
- [ ] **Adapters phân loại theo đúng bốn bước, đúng thứ tự; kiểm thân phản hồi ở đủ mức tối thiểu, kể cả tính an toàn của số nguyên; trường thừa bị bỏ qua.**
- [ ] Adapters không đổi mã lỗi, không đặt câu chữ, không so chuỗi thông báo, không tự thử lại, không nuốt lỗi lập trình.
- [ ] Services chỉ đưa ra quyết định trình bày — mọi quyết định đã qua phép thử của §5.
- [ ] Routers là lối vào duy nhất; chỉ kiểm và chuyển đổi định dạng; re-export đủ kiểu cho phân khu màn hình.
- [ ] **Kiểm thử phủ đủ ma trận ở Bước I3.6; kiểm thử "mọi mã lỗi có câu thông báo" duyệt từ Configs, không liệt kê tay.**
- [ ] Workflow đã được ráp nối tại Main và có mặt trong ngữ cảnh; lệnh kiểm tra đạt.
- [ ] Khối checkpoint ở đầu tệp Services, đúng khuôn, `clause: external`.

⚠ Quy tắc quay lui: nếu trong lúc viết phát hiện hợp đồng thiếu một điều (một nhãn kết quả hiển nhiên sẽ xảy ra mà không được khai báo, một quy ước truyền input không được ghi), dừng lại và đưa về Giai đoạn 2 của WCA — không tự "chịu" một nhãn không khai báo trong bảng nhãn. Nếu phát hiện workflow cần gọi một điểm giao tiếp chưa có trong bảng của I1, quay lại I1 trước. Nếu một vi phạm ma trận phụ thuộc lọt qua lệnh kiểm tra, quay lại I2.

---

## Minh họa — workflow giao diện `book_appointment`

⚠ Lưu ý trước khi đọc phần này: đây là một workflow rất nhỏ — một điểm giao tiếp, hai nhãn kết quả. Một workflow thật thường có nhiều điểm giao tiếp và Services phong phú hơn. Cách kiểm thân phản hồi bằng tay dưới đây cũng chỉ là một lựa chọn; một thư viện khai báo lược đồ làm được cùng việc, miễn đạt đủ mức kiểm tối thiểu.

Hợp đồng liên quan (từ phần minh họa của Giai đoạn 2 WCA): `create_appointment` — `POST /appointments`, `input: [user_id, scheduled_at]`, `201 → appointment` (`appointment_record`: `appointment_id: string, user_id: string, scheduled_at: timestamp`), `400 → ERR_VALIDATION`.

Ngay ở bước đầu đã có một phát hiện: `endpoint_forms.http` của hợp đồng mẫu chỉ ghi "Gọi qua mạng. address có dạng '<METHOD> <path>'", **không** nói input được truyền thế nào — trong thân yêu cầu dạng JSON, hay trên query. Bên gọi không được đoán. Đây là một chỗ hở của hợp đồng, được đưa về Giai đoạn 2 của WCA; hợp đồng được bổ sung quy ước "input không nằm trên đường dẫn thì nằm trong thân JSON với khóa là tên input", và workflow giao diện viết theo quy ước đó.

**Bước I3.1 — Configs:**

```ts
// src/logic/workflows/book_appointment/configs.ts
export const BOOK_APPOINTMENT_CONFIGS = {
  // [CONTRACT] api_contract.yaml v1.1.0 — clause_b_backend.book_appointment.endpoints.create_appointment
  endpoints: {
    createAppointment: {
      method: 'POST',
      path: '/appointments',
      labels: { '201': 'ok', '400': 'ERR_VALIDATION' } as Record<string, string>,
    },
  },
  // [UI-ONLY] câu cho từng mã lỗi mà các điểm giao tiếp trên khai báo
  errorMessages: {
    ERR_VALIDATION: 'Thông tin lịch hẹn chưa hợp lệ. Vui lòng kiểm tra lại.',
  } as Record<string, string>,
  // [UI-ONLY] ngôn ngữ hiển thị thời điểm hẹn
  displayLocale: 'vi-VN',
} as const

export type BookAppointmentConfigs = typeof BOOK_APPOINTMENT_CONFIGS
```

**Bước I3.2 — Entities:**

```ts
// src/logic/workflows/book_appointment/entities.ts

// Hiện thực hóa input_expected [user_id, scheduled_at] — đúng tên, đúng số trường.
export type CreateAppointmentInput = {
  user_id: string
  scheduled_at: string // timestamp — ISO 8601 có múi giờ
}

// Hiện thực hóa appointment_record — đúng tên, đủ trường cam kết.
export type AppointmentRecord = {
  appointment_id: string
  user_id: string
  scheduled_at: string
}

// View model — của riêng giao diện.
export type BookedAppointmentView = {
  appointmentId: string
  whenText: string
}
```

**Bước I3.3 — Adapters:**

```ts
// src/logic/workflows/book_appointment/adapters.ts
import type { HttpClient } from '../../shared/resources'
import type { CallResult, ErrorBody } from '../../shared/results'
import type { BookAppointmentConfigs } from './configs'
import type { AppointmentRecord, CreateAppointmentInput } from './entities'

type Read<T> = { ok: true; value: T } | { ok: false; reason: string }

function readAppointmentRecord(x: unknown): Read<AppointmentRecord> {
  if (typeof x !== 'object' || x === null) return { ok: false, reason: 'appointment: not an object' }
  const o = x as Record<string, unknown>
  for (const k of ['appointment_id', 'user_id', 'scheduled_at'] as const) {
    if (typeof o[k] !== 'string') return { ok: false, reason: `appointment.${k}: expected string` }
  }
  // Chỉ lấy đúng các trường đã cam kết — trường thừa bị bỏ qua.
  return { ok: true, value: { appointment_id: o.appointment_id as string, user_id: o.user_id as string, scheduled_at: o.scheduled_at as string } }
}

function readErrorBody(x: unknown): Read<ErrorBody> {
  if (typeof x !== 'object' || x === null) return { ok: false, reason: 'error_body: not an object' }
  const o = x as Record<string, unknown>
  if (typeof o.code !== 'string') return { ok: false, reason: 'error_body.code: expected string' }
  if (typeof o.message !== 'string') return { ok: false, reason: 'error_body.message: expected string' }
  if (o.details !== null && (typeof o.details !== 'object' || Array.isArray(o.details))) {
    return { ok: false, reason: 'error_body.details: expected object or null' }
  }
  return { ok: true, value: { code: o.code, message: o.message, details: o.details as Record<string, unknown> | null } }
}

export function createBookAppointmentAdapters(http: HttpClient, cfg: BookAppointmentConfigs) {
  function violation<T>(reason: string): CallResult<T> {
    console.error(`[book_appointment] contract violation: ${reason}`)
    return { kind: 'contract_violation', reason }
  }

  return {
    async createAppointment(input: CreateAppointmentInput): Promise<CallResult<AppointmentRecord>> {
      const ep = cfg.endpoints.createAppointment
      const t = await http.send(ep.method, ep.path, { query: null, body: input })

      // 1. Không tới được
      if (t.kind === 'unreachable') {
        console.error(`[book_appointment] unreachable: ${t.reason}`)
        return { kind: 'unreachable', reason: t.reason }
      }
      // 2. Nhãn không khai báo
      const declared = ep.labels[String(t.label)]
      if (declared === undefined) return violation(`label ${t.label} not declared for create_appointment`)
      // 3. Nhãn trả dữ liệu
      if (declared === 'ok') {
        const rec = readAppointmentRecord(t.body)
        return rec.ok ? { kind: 'ok', label: t.label, data: rec.value } : violation(rec.reason)
      }
      // 4. Nhãn lỗi đã khai báo
      const err = readErrorBody(t.body)
      if (!err.ok) return violation(err.reason)
      if (err.value.code !== declared) return violation(`code ${err.value.code} does not match label ${t.label}`)
      return { kind: 'declared_error', label: t.label, error: err.value }
    },
  }
}

export type BookAppointmentAdapters = ReturnType<typeof createBookAppointmentAdapters>
```

**Bước I3.4 — Services:**

```ts
// src/logic/workflows/book_appointment/services.ts
// ===WCA-CHECKPOINT-START===
// workflow: book_appointment
// clause: external
// component: services
// last_updated_by: coding-agent@2026-09-26#1
// last_updated_at: 2026-09-26T15:00:00+07:00
//
// EXPERIENCES: []
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE: []
//
// NOTES: []
// ===WCA-CHECKPOINT-END===
import { assertNever, INPUT_FORMAT_CODE } from '../../shared/results'
import type { InputFormatCode, ResultMessages, ViewResult } from '../../shared/results'
import type { BookAppointmentAdapters } from './adapters'
import type { BookAppointmentConfigs } from './configs'
import type { BookedAppointmentView, CreateAppointmentInput } from './entities'

export function createBookAppointmentServices(
  adapters: BookAppointmentAdapters,
  cfg: BookAppointmentConfigs,
  messages: ResultMessages,
) {
  // Quyết định trình bày: hiển thị thời điểm hẹn theo giờ và ngôn ngữ địa phương.
  const when = new Intl.DateTimeFormat(cfg.displayLocale, { dateStyle: 'full', timeStyle: 'short' })

  return {
    async book(input: CreateAppointmentInput): Promise<ViewResult<BookedAppointmentView>> {
      const r = await adapters.createAppointment(input)
      switch (r.kind) {
        case 'ok':
          return { kind: 'ok', view: { appointmentId: r.data.appointment_id, whenText: when.format(new Date(r.data.scheduled_at)) } }
        case 'declared_error':
          return { kind: 'rejected', origin: 'system', code: r.error.code, message: cfg.errorMessages[r.error.code], fieldErrors: {} }
        case 'unreachable':
          return { kind: 'unreachable', message: messages.unreachable }
        case 'contract_violation':
          return { kind: 'contract_violation', message: messages.contractViolation }
        default:
          return assertNever(r)
      }
    },

    // Hàm từ chối cố định cho Routers: Routers phát hiện, Services chọn câu chữ.
    rejectInput(fields: Record<string, InputFormatCode>): ViewResult<never> {
      const fieldErrors = Object.fromEntries(Object.entries(fields).map(([f, c]) => [f, messages.input[c]]))
      return { kind: 'rejected', origin: 'input', code: INPUT_FORMAT_CODE, message: messages.inputSummary, fieldErrors }
    },
  }
}

export type BookAppointmentServices = ReturnType<typeof createBookAppointmentServices>
```

**Bước I3.5 — Routers:**

```ts
// src/logic/workflows/book_appointment/routers.ts
import type { InputFormatCode, ViewResult } from '../../shared/results'
import type { BookedAppointmentView } from './entities'
import type { BookAppointmentServices } from './services'

// Dữ liệu thô từ trang: đúng những gì người dùng gõ.
export type BookAppointmentDraft = {
  userId: string
  scheduledAtLocal: string // giá trị của ô chọn ngày giờ địa phương, ví dụ "2026-10-01T09:30"
}

// Chuyển đổi định dạng ở ranh giới: giờ địa phương → timestamp ISO 8601 có múi giờ.
function toTimestamp(local: string): string | null {
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  const p = (n: number) => String(n).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00` +
    `${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`
}

export function createBookAppointmentRouters(services: BookAppointmentServices) {
  return {
    async book(draft: BookAppointmentDraft): Promise<ViewResult<BookedAppointmentView>> {
      const errors: Record<string, InputFormatCode> = {}
      const userId = draft.userId.trim()
      if (userId === '') errors.userId = 'required'
      const scheduledAt = draft.scheduledAtLocal === '' ? null : toTimestamp(draft.scheduledAtLocal)
      if (draft.scheduledAtLocal === '') errors.scheduledAtLocal = 'required'
      else if (scheduledAt === null) errors.scheduledAtLocal = 'not_timestamp'

      if (Object.keys(errors).length > 0) return services.rejectInput(errors)
      return services.book({ user_id: userId, scheduled_at: scheduledAt as string })
    },
  }
}

// Mọi kiểu phân khu màn hình cần — chỉ lấy từ đây (R8).
export type BookAppointmentRouters = ReturnType<typeof createBookAppointmentRouters>
export type { ViewResult } from '../../shared/results'
export type { BookedAppointmentView } from './entities'
```

Routers không kiểm "thời điểm hẹn phải ở tương lai". Điều đó không viết trong `type` của hợp đồng — nó là một quyết định nghiệp vụ của phía sau, được báo lại qua `ERR_VALIDATION` nếu phía sau quyết định như vậy.

**Bước I3.6 — trích một ca kiểm thử của Adapters:**

```ts
// src/logic/workflows/book_appointment/tests/adapters.test.ts (trích)
import { describe, expect, it } from 'vitest'
import { BOOK_APPOINTMENT_CONFIGS } from '../configs'
import { createBookAppointmentAdapters } from '../adapters'
import type { HttpClient, Transport } from '../../../shared/resources'

const fakeHttp = (t: Transport): HttpClient => ({ send: async () => t })
const input = { user_id: 'u-1', scheduled_at: '2026-10-01T09:30:00+07:00' }

describe('createAppointment', () => {
  it('undeclared label is a contract violation', async () => {
    const a = createBookAppointmentAdapters(fakeHttp({ kind: 'response', label: 409, body: null }), BOOK_APPOINTMENT_CONFIGS)
    expect((await a.createAppointment(input)).kind).toBe('contract_violation')
  })

  it('extra fields in a 201 body are dropped, not rejected', async () => {
    const body = { appointment_id: 'a-1', user_id: 'u-1', scheduled_at: input.scheduled_at, created_by: 'x' }
    const a = createBookAppointmentAdapters(fakeHttp({ kind: 'response', label: 201, body }), BOOK_APPOINTMENT_CONFIGS)
    const r = await a.createAppointment(input)
    expect(r).toEqual({ kind: 'ok', label: 201, data: { appointment_id: 'a-1', user_id: 'u-1', scheduled_at: input.scheduled_at } })
  })
  // … đủ ma trận phủ của Bước I3.6
})
```

**Bước I3.7:** Thêm `bookAppointment` vào Main và vào kiểu ngữ cảnh. `npm run check` đạt. Checkpoint ở đầu `services.ts` ghi một mục EXPERIENCES về chỗ hở "quy ước truyền input" đã được đưa về hợp đồng, để người làm workflow giao diện kế tiếp biết hợp đồng từ phiên bản nào mới có quy ước đó.
