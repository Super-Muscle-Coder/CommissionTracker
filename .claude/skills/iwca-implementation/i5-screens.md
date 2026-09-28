# GIAI ĐOẠN I5 — TRIỂN KHAI PHÂN KHU MÀN HÌNH

*Giai đoạn thứ năm của iWCA, sau khi workflow giao diện của trang đã qua [I3](i3-logic.md) và kit đã đủ ở [I4](i4-kit.md). Lặp lại cho từng trang trong bảng của [I1](i1-decompose.md). Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại §0 của [lý thuyết WCA](../wca-implementation/wca_theory_compressed.md) và của [lý thuyết iWCA](iwca_theory.md).*

| | |
|---|---|
| **Input** | Một dòng trong bảng trang của I1; Routers của các workflow giao diện mà trang dùng (cùng kiểu chúng re-export); phân khu kit đã đủ. |
| **Hành động** | Viết hook màn hình, viết trang, đăng ký trang vào điều hướng, viết kiểm thử dựng trang và kịch bản bấm thử. |
| **Output** | Một trang người dùng điều hướng tới được, hiển thị đúng mọi loại kết quả, lệnh kiểm tra đạt, sẵn sàng cho [I6](i6-self-check.md). |

Nhớ lại vai trò của phân khu màn hình ([§1 và §4 của lý thuyết iWCA](iwca_theory.md)): nó là hạ tầng cắt ngang của layer giao diện. Nó quyết định **khi nào** gọi, **giữ** kết quả, và **hiển thị** kết quả — không quyết định **cái gì** là đúng. Mọi bước dưới đây là hệ quả của câu đó.

## Bước I5.1 — Hook màn hình: gọi, giữ, và chuyển

Mỗi trang có đúng một hook màn hình, đặt cạnh trang. Hook lấy Routers từ ngữ cảnh do Main cung cấp, giữ trạng thái giao diện của trang, và đưa cho trang những gì nó cần để dựng và để phản ứng với người dùng.

**Hook được làm, và chỉ làm:**

- Giữ **bản nháp** của form ở dạng thô — đúng kiểu dữ liệu thô mà Routers nhận, không chuyển đổi gì.
- Giữ **kết quả gần nhất** của mỗi thao tác, nguyên dạng `ViewResult`, và giữ cờ **đang xử lý**.
- Quyết định **khi nào** gọi Routers: khi trang mở, khi người dùng bấm, sau một khoảng thời gian, khi một thao tác khác vừa thành công (ví dụ tải lại danh sách sau khi thêm mới).
- Xử lý những việc thuần kỹ thuật của thời điểm: không gửi lần hai khi lần một chưa xong, bỏ qua kết quả của một lời gọi đã bị một lời gọi mới hơn thay thế, không cập nhật trạng thái sau khi trang đã đóng.

**Hook không được làm:** tính toán trên dữ liệu, định dạng một giá trị để hiển thị, chọn câu chữ cho một kết quả, ghép dữ liệu từ hai Routers thành một thứ mới, kiểm một điều kiện nào đó trên dữ liệu người dùng nhập, hay gọi bất cứ thứ gì ngoài Routers.

⚠ Hook là chỗ dễ trở thành "Services thứ hai" nhất trong cả layer, vì nó là mã logic duy nhất nằm sát giao diện và được phép dùng thư viện giao diện. Phép thử: xóa hook đi và viết lại nó chỉ với ba động từ "gọi", "giữ", "chuyển". Nếu có dòng nào không viết lại được bằng ba động từ đó, dòng đó đang nằm sai chỗ — nó thuộc Services (I3) hoặc kit (I4).

## Bước I5.2 — Trang: dựng bằng kit, hiển thị mọi loại kết quả

Trang đọc từ hook và dựng giao diện hoàn toàn bằng component của kit, lấy qua lối công khai (R9). Trang không có style (R10): bố trí bằng component bố cục của kit, khoảng cách bằng tên trong thang. Chữ cố định của giao diện — tiêu đề, nhãn ô nhập, chữ trên nút — nằm ở đây.

Với mỗi `ViewResult` mà trang giữ, trang phân nhánh **đầy đủ** trên `kind`, kết thúc bằng `assertNever` của phân khu màn hình (R13). Cách hiển thị từng loại là quyết định của trang, nhưng có bốn yêu cầu tối thiểu không được bỏ:

| `kind` | Yêu cầu tối thiểu |
|---|---|
| `ok` | Hiển thị `view`, hoặc một xác nhận nhìn thấy được với thao tác không trả dữ liệu. |
| `rejected` | Hiển thị `message`. Với mỗi khóa trong `fieldErrors` ứng với một ô nhập trên trang, hiển thị câu lỗi ngay tại ô đó. Giữ nguyên bản nháp để người dùng sửa, không xóa những gì họ đã nhập. |
| `unreachable` | Hiển thị `message`, và cho người dùng một cách thực hiện lại đúng thao tác vừa thất bại mà không phải nhập lại. |
| `contract_violation` | Hiển thị `message`. Không bao giờ hiển thị như thể thao tác đã thành công, và không hiển thị chi tiết kỹ thuật. |

Trạng thái ban đầu — khi chưa có kết quả nào — được phép không hiển thị gì. Mọi trạng thái khác phải hiển thị một thứ nhìn thấy được: không có loại kết quả nào được phép "lặng lẽ không làm gì".

⚠ Trang chỉ đọc `view` trong nhánh `ok`. Kiểu dữ liệu đã ngăn việc đọc nó ở nhánh khác; nếu thấy mình đang tìm cách ép kiểu để làm vậy, đó là dấu hiệu trang đang cố hiển thị một kết quả "gần đúng" — điều mà Services đã cố ý không tạo ra.

## Bước I5.3 — Điều hướng và layout

Đăng ký trang vào bảng điều hướng `screens/navigation`: khóa của trang, đường dẫn (nếu có), layout nó nằm trong, và component trang. **Một trang không có trong bảng điều hướng là một trang không tồn tại** — đây là bước đầu tiên của chuỗi chẩn đoán ở [§9 lý thuyết iWCA](iwca_theory.md), tương ứng bước "đăng ký tại Main" của WCA.

Đối chiếu bảng điều hướng với bảng trang của I1 sau mỗi lần thêm: mọi trang trong bảng điều hướng đều có trong bảng của I1, và ngược lại với những trang đã làm xong. Một trang xuất hiện trong điều hướng mà không có trong I1 là một trang không ai quyết định làm — kể cả khi nó "chỉ để thử", và kể cả khi Routers cho nó đã sẵn có.

Layout đi theo đúng quy tắc của trang: dựng bằng kit, không style, không gọi Routers trừ khi layout thật sự hiển thị dữ liệu (ví dụ một con số trên thanh điều hướng) — khi đó layout có hook của nó, với đúng luật của hook màn hình.

## Bước I5.4 — Kiểm thử dựng trang và kịch bản bấm thử

**Kiểm thử dựng trang** nằm trong `tests/` của trang, dựng trang với một tập hợp Routers giả trong ngữ cảnh. Ma trận phủ tối thiểu:

- Với mỗi thao tác của trang, một ca cho **mỗi** loại `ViewResult` mà thao tác có thể trả về — `ok`, `rejected` với `origin: 'input'`, `rejected` với `origin: 'system'`, `unreachable`, `contract_violation` — kiểm rằng thứ nhìn thấy được đúng yêu cầu tối thiểu ở Bước I5.2.
- Một ca `rejected` có `fieldErrors`: câu lỗi hiện ở đúng ô, bản nháp còn nguyên.
- Một ca `unreachable`: thực hiện lại thao tác gọi Routers lần nữa với cùng bản nháp.

Loại `contract_violation` gần như không thể gây ra khi bấm thử bằng tay trên một hệ thống đúng hợp đồng. Vì vậy kiểm thử dựng trang là nơi **bắt buộc** chứng minh trang hiển thị đúng loại này.

**Kịch bản bấm thử** của trang được viết ở bước này, trong `walkthrough.yaml` cạnh trang, đúng định dạng ở [I6](i6-self-check.md), Bước I6.3. Viết nó ngay khi viết trang — lúc người viết còn nhớ rõ trang có những thao tác nào và mỗi thao tác có thể dẫn tới đâu — không để tới lúc tự kiểm.

## Bước I5.5 — Cập nhật checkpoint

Cập nhật khối checkpoint `screens` ở đầu `screens/navigation`. Nơi của những điều như: một trang phải tải lại danh sách sau thao tác nào, một cách xử lý thời điểm (bỏ qua kết quả cũ) đã được chọn vì lý do gì, một trang nào cố ý không có trong điều hướng của đợt phát hành này.

**Checklist:**

- [ ] Mỗi trang có đúng một hook; hook chỉ gọi, giữ, và chuyển — đã qua phép thử ba động từ.
- [ ] Hook giữ bản nháp ở dạng thô và kết quả ở dạng `ViewResult` nguyên vẹn; không gửi lần hai khi lần một chưa xong.
- [ ] Trang dựng hoàn toàn bằng kit qua lối công khai; không style, không `className`, không prop `style`.
- [ ] **Mọi `ViewResult` được phân nhánh đầy đủ, kết thúc bằng `assertNever` của phân khu màn hình; mỗi loại đáp ứng yêu cầu tối thiểu ở Bước I5.2.**
- [ ] `rejected` hiển thị câu lỗi tại đúng ô và giữ nguyên bản nháp; `unreachable` cho thực hiện lại thao tác mà không nhập lại.
- [ ] Trang đã có trong bảng điều hướng; bảng điều hướng khớp bảng trang của I1.
- [ ] **Kiểm thử dựng trang phủ mọi loại kết quả của mọi thao tác, kể cả `contract_violation`.**
- [ ] Kịch bản bấm thử đã được viết cạnh trang, đúng định dạng của I6.
- [ ] Khối checkpoint `screens` đã cập nhật; lệnh kiểm tra đạt.

⚠ Quy tắc quay lui: nếu trang cần hiển thị một thứ mà view model không có sẵn, không tính nó trong hook hay trang — quay lại I3, để Services đưa nó vào view model. Nếu trang cần một cách hiển thị mà kit không có, quay lại I4. Nếu trang cần một thao tác mà Routers không có, quay lại I3; nếu thao tác đó cần một điểm giao tiếp chưa có trong bảng của I1, quay lại I1.

---

## Minh họa — trang `book_appointment_page`

⚠ Lưu ý trước khi đọc phần này: trang dưới đây có đúng một thao tác. Một trang thật thường vừa tải dữ liệu khi mở vừa có vài thao tác ghi, mỗi thao tác một `ViewResult` riêng trong hook. Cách tách phần hiển thị kết quả thành một component nhỏ trong cùng tệp trang chỉ là một lựa chọn trình bày code.

**Ngữ cảnh** (dựng ở I2, thêm Routers của `book_appointment` ở I3):

```ts
// src/screens/logic_context.ts
import { createContext, useContext } from 'react'
import type { BookAppointmentRouters } from '../logic/workflows/book_appointment/routers'

export type LogicRouters = {
  bookAppointment: BookAppointmentRouters
}

export const LogicContext = createContext<LogicRouters | null>(null)

export function useLogic(): LogicRouters {
  const routers = useContext(LogicContext)
  if (routers === null) throw new Error('LogicContext is missing: the page is rendered outside Main')
  return routers
}
```

**Bước I5.1 — hook:**

```ts
// src/screens/pages/book_appointment_page/use_book_appointment_page.ts
import { useState } from 'react'
import type { BookAppointmentDraft, BookedAppointmentView, ViewResult } from '../../../logic/workflows/book_appointment/routers'
import { useLogic } from '../../logic_context'

export function useBookAppointmentPage() {
  const { bookAppointment } = useLogic()
  const [draft, setDraft] = useState<BookAppointmentDraft>({ userId: '', scheduledAtLocal: '' })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ViewResult<BookedAppointmentView> | null>(null)

  // giữ
  function setField(key: keyof BookAppointmentDraft, value: string) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  // gọi — không gửi lần hai khi lần một chưa xong
  async function submit() {
    if (busy) return
    setBusy(true)
    setResult(await bookAppointment.book(draft))
    setBusy(false)
  }

  // chuyển
  return { draft, setField, submit, busy, result }
}
```

Hook không kiểm ô nào có rỗng không, không chuyển giờ địa phương sang timestamp, không chọn câu thông báo. Cả ba việc đó đã có chủ ở Routers và Services.

**Bước I5.2 — trang:**

```tsx
// src/screens/pages/book_appointment_page/BookAppointmentPage.tsx
import { Button, Field, Notice, PageFrame, Stack } from '../../../kit'
import type { BookedAppointmentView, ViewResult } from '../../../logic/workflows/book_appointment/routers'
import { assertNever } from '../../assert_never'
import { useBookAppointmentPage } from './use_book_appointment_page'

export function BookAppointmentPage() {
  const { draft, setField, submit, busy, result } = useBookAppointmentPage()
  const fieldErrors = result !== null && result.kind === 'rejected' ? result.fieldErrors : {}

  return (
    <PageFrame title="Đặt lịch hẹn">
      <Stack gap="md">
        <Field id="userId" label="Mã người dùng" type="text" value={draft.userId}
          onChange={(v) => setField('userId', v)} error={fieldErrors.userId ?? null} disabled={busy} />
        <Field id="scheduledAtLocal" label="Thời điểm hẹn" type="datetime" value={draft.scheduledAtLocal}
          onChange={(v) => setField('scheduledAtLocal', v)} error={fieldErrors.scheduledAtLocal ?? null} disabled={busy} />
        <Button label="Đặt lịch" busyLabel="Đang gửi…" busy={busy} onClick={submit} />
        {result !== null && <BookResult result={result} onRetry={submit} />}
      </Stack>
    </PageFrame>
  )
}

function BookResult({ result, onRetry }: { result: ViewResult<BookedAppointmentView>; onRetry: () => void }) {
  switch (result.kind) {
    case 'ok':
      return <Notice tone="success" title="Đã đặt lịch" text={result.view.whenText} action={null} />
    case 'rejected':
      return <Notice tone="danger" title="Chưa đặt được lịch" text={result.message} action={null} />
    case 'unreachable':
      return <Notice tone="danger" title="Không kết nối được" text={result.message} action={{ label: 'Thử lại', onClick: onRetry }} />
    case 'contract_violation':
      return <Notice tone="danger" title="Có lỗi không mong đợi" text={result.message} action={null} />
    default:
      return assertNever(result)
  }
}
```

Nếu sau này `ViewResult` có thêm một loại, `assertNever(result)` không còn biên dịch được và lệnh kiểm tra thất bại tại đúng dòng này — trang không thể lặng lẽ bỏ qua loại mới.

**Bước I5.3:** Thêm vào `screens/navigation.ts` một mục `book_appointment_page`, đường dẫn `/book`, layout `main_layout`. Đối chiếu với bảng trang của I1 — khớp.

**Bước I5.4:** Kiểm thử dựng trang với Routers giả phủ năm trường hợp: `ok`, `rejected` do định dạng (ô "Thời điểm hẹn" để trống — câu lỗi hiện tại ô, mã người dùng đã nhập còn nguyên), `rejected` do hệ thống (`ERR_VALIDATION`), `unreachable` (bấm "Thử lại" gọi `book` lần hai với cùng bản nháp), và `contract_violation` (thông báo lỗi hiện ra, không có chữ "Đã đặt lịch"). Kịch bản bấm thử được viết vào `walkthrough.yaml` — xem phần minh họa của I6.

**Bước I5.5:** Khối checkpoint `screens` ghi một mục NOTES: nhu cầu "xem lịch hẹn sắp tới" đã được đưa về hợp đồng ở I1, nên bảng điều hướng cố ý chưa có trang danh sách.
