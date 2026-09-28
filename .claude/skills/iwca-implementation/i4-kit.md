# GIAI ĐOẠN I4 — TRIỂN KHAI PHÂN KHU KIT

*Giai đoạn thứ tư của iWCA, sau khi workflow giao diện mà trang cần đã qua [I3](i3-logic.md). Lặp lại mỗi khi một trang cần một token hay component chưa có. Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại §0 của [lý thuyết WCA](../wca-implementation/wca_theory_compressed.md) và của [lý thuyết iWCA](iwca_theory.md).*

| | |
|---|---|
| **Input** | Trang sắp làm (từ bảng trang của I1), cùng kiểu view model và dữ liệu thô mà Routers của nó re-export; phân khu kit hiện có. |
| **Hành động** | Xác định trang cần những gì để hiển thị; dùng lại những gì kit đã có; chỉ thêm token và component còn thiếu, theo đúng quy tắc đặt tên và ranh giới dưới đây. |
| **Output** | Phân khu kit đủ để dựng trang, lệnh kiểm tra đạt, lối công khai đã cập nhật. |

Phân khu kit được viết **sau** phân khu logic và **trước** phân khu màn hình, vì hai lý do. Nó không cần biết logic, nên không phụ thuộc thứ tự với I3 — nhưng chỉ khi view model đã chốt mới biết chắc trang cần hiển thị những gì. Và phân khu màn hình là nơi lắp kit vào, nên kit phải có trước.

## Bước I4.1 — Bắt đầu từ nhu cầu của trang, không từ một bộ thiết kế đầy đủ

Có một cám dỗ quen thuộc khi dựng phân khu kit: xây trước một hệ thống thiết kế hoàn chỉnh — hàng chục component, mỗi component năm biến thể — rồi mới làm trang. Cám dỗ đó tốn công ở chỗ không ai cần, và thường phải sửa khi trang thật xuất hiện với những nhu cầu không ai đoán trước.

Tư duy ở bước này: nhìn vào trang sắp làm và view model của nó, tự hỏi trang cần hiển thị những gì và người dùng cần thao tác gì. Với mỗi thứ, hỏi theo thứ tự: kit **đã có** component làm được việc này chưa? Nếu có nhưng thiếu một trạng thái hay một prop, mở rộng nó có làm nó mất đi một mục đích rõ ràng không? Chỉ khi cả hai câu trả lời đều là không, mới tạo component mới.

Mỗi component tồn tại vì ít nhất một trang dùng nó. Một component không trang nào dùng là một component chưa nên tồn tại.

## Bước I4.2 — Token: nguồn duy nhất của mọi giá trị trình bày

Token có **hai cấp**, và quy tắc giữa hai cấp là luật, không phải khuyến nghị:

- **Token nền** — bảng giá trị thô: dải màu, thang khoảng cách, thang cỡ chữ. Chỉ được tham chiếu **bên trong tệp token**.
- **Token vai trò** — tên theo vai trò trình bày, trỏ vào token nền: màu chữ chính, màu nền của vùng báo lỗi, khoảng cách giữa các ô trong một form. **Component chỉ được dùng token vai trò.**

Hai cấp này là thứ cho phép đổi hình thức cả ứng dụng — một bảng màu mới, một chế độ tối — bằng cách sửa đúng một tệp. Một component dùng thẳng token nền đã tự buộc mình vào một giá trị, và sẽ không đổi theo khi vai trò đổi.

**Quy tắc đặt tên**, cố định cho cả layer:

| Loại | Dạng tên | Ví dụ |
|---|---|---|
| Token nền | `--base-<nhóm>-<mức>` | `--base-gray-700`, `--base-space-4` |
| Token vai trò | `--<nhóm>-<vai trò>[-<biến thể>]` | `--color-text`, `--color-text-muted`, `--color-surface-danger`, `--space-field-gap` |
| Thang có tên | `--<nhóm>-<cỡ>`, cỡ thuộc đúng tập `xs`, `sm`, `md`, `lg`, `xl` | `--space-md`, `--font-size-lg` |

Nhóm dùng các tên: `color`, `space`, `font-size`, `font-weight`, `line-height`, `radius`, `border-width`, `shadow`, `duration`. Một dự án cần nhóm khác thì thêm vào bảng này trong tài liệu nền của nó, không tự đặt tùy ý trong tệp token.

Khi một component cần một giá trị mà chưa token vai trò nào diễn đạt được, thêm một token vai trò — không viết giá trị thô vào style của component "cho nhanh". R7 sẽ bắt điều đó, nhưng lý do thật sự để không làm không phải vì máy bắt: một giá trị không có tên là một giá trị không ai biết vì sao nó như vậy.

## Bước I4.3 — Component kit: câm, và đủ trạng thái

Component kit tuân theo các quy tắc sau. Quy tắc đầu được máy giữ (R6); các quy tắc còn lại được kiểm khi tự kiểm ở I6.

1. **Không biết nghiệp vụ.** Props chỉ là kiểu nguyên thủy, callback, nội dung hiển thị do component khác dựng, hoặc kiểu do chính kit khai báo. Không bao giờ là một view model hay kiểu của phân khu logic. Một component nhận `client: ClientView` đã biết khách hàng là gì; component nhận `title: string` và `subtitle: string` thì không.
2. **Không có chữ cố định.** Mọi chữ người dùng thấy hoặc nghe — kể cả nhãn cho trình đọc màn hình — đi vào qua props. Kit không biết ứng dụng nói tiếng gì.
3. **Không gọi ra ngoài, không giữ trạng thái dữ liệu.** Component được giữ trạng thái trình bày của chính nó (một danh sách thả xuống đang mở hay đóng), không giữ hay tải dữ liệu.
4. **Callback đặt tên `on<Sự kiện>`**, nhận giá trị đã hiểu được (`onChange(value: string)`, không phải sự kiện thô của thư viện giao diện), để phân khu màn hình không phải biết chi tiết của thư viện.
5. **Đủ trạng thái** áp dụng cho loại component đó: bình thường, vô hiệu, đang xử lý, có lỗi. Một ô nhập không có trạng thái lỗi thì trang không có chỗ hiển thị `fieldErrors`; một nút không có trạng thái đang xử lý thì người dùng bấm hai lần.
6. **Tiếp cận tối thiểu**, vì nó rẻ khi làm từ đầu và đắt khi làm sau: mỗi ô nhập gắn với nhãn của nó; có dấu hiệu nhìn thấy được khi nhận focus (từ một token); dùng phần tử gốc của nền tảng khi có (một nút là một `button`, không phải một phần tử bất kỳ được gắn sự kiện bấm); trạng thái lỗi không chỉ thể hiện bằng màu.
7. **Style riêng của component** nằm cạnh nó, chỉ dùng token vai trò.

## Bước I4.4 — Component bố cục: điều kiện để phân khu màn hình không có style

R10 cấm phân khu màn hình có style. Điều đó chỉ khả thi khi kit cung cấp đủ component bố cục — xếp chồng theo chiều dọc, xếp hàng theo chiều ngang, khung trang, và (khi cần) lưới. Đây là loại component duy nhất mà phân khu màn hình dùng để **sắp xếp** mọi thứ khác.

Props bố cục nhận **tên trong thang**, không nhận giá trị: `gap="md"`, không phải `gap={16}` hay `gap="16px"`. Kiểu của prop là đúng tập tên của thang (`'xs' | 'sm' | 'md' | 'lg' | 'xl'`), để một giá trị ngoài thang là lỗi biên dịch. Nhờ vậy, khi trang cần "thêm một chút khoảng cách", câu hỏi buộc phải là "khoảng cách nào trong thang" — và nếu không có cỡ nào vừa, đó là tín hiệu thang cần xem lại, ở kit, không phải ở trang.

## Bước I4.5 — Lối công khai và checkpoint

Mọi thứ phân khu màn hình được dùng phải được xuất ra từ `kit/index` — component và kiểu props của chúng — và chỉ những thứ đó. Thứ không xuất ra là chi tiết bên trong của kit, được đổi tự do.

Cập nhật khối checkpoint `kit` ở đầu `kit/index`. Nơi của những điều như: vì sao một token vai trò tồn tại, một component có ràng buộc tiếp cận nào không hiển nhiên, một trạng thái nào đã từng bị thiếu.

**Checklist:**

- [ ] Mỗi component mới tồn tại vì một trang cụ thể cần nó; đã cân nhắc dùng lại hoặc mở rộng component có sẵn trước khi tạo mới.
- [ ] Token đúng hai cấp; component chỉ dùng token vai trò; token nền chỉ được tham chiếu trong tệp token.
- [ ] Tên token đúng quy tắc đặt tên; thang có tên dùng đúng tập `xs`–`xl`.
- [ ] **Không component nào nhận kiểu dữ liệu của phân khu logic, chứa chữ cố định, gọi ra ngoài, hay giữ trạng thái dữ liệu.**
- [ ] Callback đặt tên `on<Sự kiện>` và nhận giá trị đã hiểu được.
- [ ] Mỗi component có đủ trạng thái áp dụng cho loại của nó; đáp ứng mức tiếp cận tối thiểu.
- [ ] Component bố cục nhận tên trong thang, kiểu prop giới hạn đúng tập tên.
- [ ] Lối công khai xuất đúng và đủ; khối checkpoint `kit` đã cập nhật; lệnh kiểm tra đạt.

⚠ Quy tắc quay lui: nếu ở I5 phát hiện trang cần một cách bố trí mà kit không diễn đạt được, không thêm style vào trang — quay lại I4, thêm component bố cục hoặc mở rộng thang. Nếu một component bắt đầu cần biết dữ liệu là gì để hiển thị đúng, đó là dấu hiệu một quyết định trình bày đang trượt vào kit: quyết định đó thuộc Services của workflow giao diện (I3), và view model cần mang sẵn kết quả của nó.

---

## Minh họa — kit cho trang đặt lịch hẹn

⚠ Lưu ý trước khi đọc phần này: bảng màu và thang dưới đây chỉ đủ cho một trang. Chúng minh họa cấu trúc hai cấp và cách component dùng token, không phải một bộ token nên chép sang dự án khác.

**Bước I4.1:** Trang `book_appointment_page` cần: một khung trang có tiêu đề, xếp các ô theo chiều dọc, một ô nhập chữ (mã người dùng), một ô chọn ngày giờ, một nút gửi có trạng thái đang xử lý, và một vùng thông báo kết quả (thành công, bị từ chối, không kết nối được). Kit hiện có (từ I2): component bố cục cơ bản và `FatalMessage`. Cần thêm: `TextField`, `DateTimeField`, `Button`, `Notice`.

Cân nhắc: `TextField` và `DateTimeField` có nên là một component với một prop kiểu không? Hai ô có chung nhãn, chung trạng thái lỗi, chỉ khác phần tử nhập bên trong. Gộp thành `Field` với `type: 'text' | 'datetime'` giữ được một mục đích rõ ràng — nhập một giá trị có nhãn — nên gộp.

**Bước I4.2 — token (trích):**

```css
/* src/kit/tokens/tokens.css — nơi duy nhất có giá trị thô */
:root {
  /* Token nền */
  --base-gray-900: #1f2328;
  --base-gray-500: #6e7781;
  --base-red-700: #b42318;
  --base-red-50: #fef3f2;
  --base-green-700: #067647;
  --base-space-2: 8px;
  --base-space-4: 16px;
  --base-space-6: 24px;
  --base-border-2: 2px;

  /* Token vai trò */
  --color-text: var(--base-gray-900);
  --color-text-muted: var(--base-gray-500);
  --color-text-danger: var(--base-red-700);
  --color-surface-danger: var(--base-red-50);
  --color-text-success: var(--base-green-700);
  --color-focus-ring: var(--base-gray-900);
  --space-sm: var(--base-space-2);
  --space-md: var(--base-space-4);
  --space-lg: var(--base-space-6);
  --border-width-focus: var(--base-border-2);
}
```

**Bước I4.3 — một component:**

```tsx
// src/kit/components/Field/Field.tsx
import styles from './Field.module.css'

export type FieldProps = {
  id: string
  label: string
  type: 'text' | 'datetime'
  value: string
  onChange: (value: string) => void
  error: string | null     // câu lỗi đã sẵn sàng; null khi không có lỗi
  disabled: boolean
}

export function Field({ id, label, type, value, onChange, error, disabled }: FieldProps) {
  const errorId = `${id}-error`
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input
        id={id}
        className={error === null ? styles.input : styles.inputError}
        type={type === 'datetime' ? 'datetime-local' : 'text'}
        value={value}
        disabled={disabled}
        aria-invalid={error !== null}
        aria-describedby={error === null ? undefined : errorId}
        onChange={(e) => onChange(e.target.value)}
      />
      {error !== null && <p id={errorId} className={styles.error}>{error}</p>}
    </div>
  )
}
```

```css
/* src/kit/components/Field/Field.module.css — chỉ token vai trò */
.field { display: flex; flex-direction: column; gap: var(--space-sm); }
.label { color: var(--color-text); }
.input { color: var(--color-text); }
.input:focus-visible,
.inputError:focus-visible { outline: var(--border-width-focus) solid var(--color-focus-ring); }
.inputError { color: var(--color-text); border-color: var(--color-text-danger); }
.error { color: var(--color-text-danger); }
```

Trạng thái lỗi không chỉ là màu: có câu lỗi hiển thị thành chữ, được gắn với ô qua `aria-describedby`. Component không biết câu lỗi đến từ đâu — từ `fieldErrors` của một `ViewResult` hay từ bất cứ đâu khác.

**Bước I4.4:** Kit đã có `Stack` với `gap: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` và `PageFrame` với `title: string` từ I2 — đủ cho trang này, không cần thêm.

**Bước I4.5:** `kit/index.ts` xuất thêm `Field`, `Button`, `Notice` cùng kiểu props. Khối checkpoint `kit` ghi một mục EXPERIENCES: gộp ô nhập chữ và ô ngày giờ thành `Field` vì chung một mục đích, để lần sau có loại ô nhập mới thì mở rộng `type` trước khi tạo component riêng.
