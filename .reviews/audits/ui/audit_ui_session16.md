# AUDIT — PHIÊN 16 (LAYER GIAO DIỆN, CHẶNG D1)

*Orchestrator, 2026-09-28. Đối chiếu với `.plan/ui_plan.md` (plan phiên 16), `.design/ui_decomposition.md` (I1 cho D1, §5 và §7), `api_contract.yaml` 4.0.0, `data_schema.yaml` 6.2.0, và các checkpoint `manage_client`, `kit`, `screens`, `main` trong `UI/`.*

## 1. Kết luận

Phần lớn đạt: logic đúng hợp đồng, UI-1 và UI-3 được xác nhận độc lập, token tối đạt tương phản chữ.

**Chưa chuyển được ba trang sang `hoàn_tất`**, vì mục EVIDENCE `e2e 17/17` **không tái lập ổn định** trên máy thứ hai. Bộ kiểm thử có một điều kiện chạy đua; nguyên nhân gốc nằm ở một hook, chưa phải ở hành vi người dùng thấy (mục 3, UI-4). Việc sửa nhỏ, đã chứng minh được bằng thực nghiệm.

Agent tự nêu thêm một chỗ hở ở đặc tả do chính Orchestrator viết (mục 4, UI-5), và nêu đúng. Việc này cần Project Owner quyết.

## 2. Những gì đã tự chạy lại

Môi trường: Linux, Node 24.14.1, `npm ci` từ đúng `package-lock.json`, không đổi so với phiên 12. Mã `UI/` lấy thẳng từ đĩa (104 tệp). Desktop lấy ở trạng thái phiên 14 và build lại; Backend lấy ở trạng thái phiên 15; Xvfb.

| Hạng mục | Báo cáo agent | Orchestrator chạy lại | Kết quả |
|---|---|---|---|
| `npm run check` | 225 kiểm thử, 18 cặp tương phản, 71 tệp | 225/225, 10 tệp kiểm thử, 18 cặp, 71 tệp, không vi phạm | khớp |
| Tương phản chữ | thấp nhất 5.60:1 | Tính lại bằng công thức WCAG riêng: 13.65, 5.79, 5.60, 6.69, 7.09 cho 5 cặp mẫu | khớp |
| R13 (UI-1) | bắt 9 dạng | Mẫu vi phạm riêng (xem 2.1) | đạt, có giới hạn đã khai |
| UI-2 | `unknown` khi thiếu biến | Chạy với `CT_WALKTHROUGH_RUNNER=orchestrator-audit@2026-09-28`, bản ghi mang đúng tên | đạt |
| UI-3 | không sót thư mục tạm khi hỏng | 8 lần chạy e2e, 5 lần có bước hỏng: không thư mục `ct-ui-*` mới, không tiến trình sót | đạt (xác nhận độc lập) |
| `npm run e2e` | 17/17 | **5 lần: 1 lần đạt 17/17, 4 lần hỏng** | **không tái lập ổn định** |
| Hợp đồng không bị sửa | — | mtime của `.contracts/*` và `.design/ui_decomposition.md` không đổi từ trước phiên | đạt |
| Endpoint bị loại | chỉ `/clients…` | Tìm `watermark`, `/backup`, `/restore`, `/commissions`, `/payments` trong `src/` và `tests/`: không có | đạt |
| Bảng nhãn | chép từ hợp đồng | So từng endpoint của `manage_client` trong API 4.0.0 | khớp |

### 2.1 R13 — mẫu vi phạm của Orchestrator

Tệp tạm trong phân khu logic, đã xóa sau khi chạy:

- `switch (r.kind)` thiếu case nhưng có `default` → `switch-exhaustiveness-check` bắt, vì `considerDefaultExhaustiveForUnions: false`.
- `switch (true) { case r.kind === 'ok' … }` → R13 bắt.
- `(r as { kind: string }).kind` → R13 bắt.
- `switch (r.kind as string)` → R13 bắt, vì biểu thức của `switch` lúc này là phép ép kiểu.
- `switch` đủ case, kết thúc bằng `assertNever` → không báo, đúng.
- **Lọt:** `Object.values(r)[0]`, và một hàm generic `pick(r, 'kind')`. Cả hai thuộc giới hạn phân tích tĩnh mà agent đã khai: đọc qua `any` hoặc qua khóa tính lúc chạy. Không ai viết như vậy vô tình, nên chấp nhận ở V1 và không mở mục mới.

## 3. UI-4 — e2e không tất định (chặn việc chuyển trang sang `hoàn_tất`)

**Hiện tượng:** trên Linux, bước S2 của `client_form` hỏng 3 trong 5 lần và S5 hỏng 1 lần. Danh sách đọc được rỗng, trong khi ảnh chụp trang ngay sau đó có đủ tám khách.

**Nguyên nhân:**
1. `use_client_list` khởi tạo `loading = false`. Khung hình đầu tiên của trang "Khách hàng" vì vậy có nút "Tải lại" đã bật trong khi danh sách chưa tải. Tải bắt đầu ở `useEffect`, sau lần vẽ đầu.
2. Các spec dùng "nút Tải lại bật" làm tín hiệu "đã tải xong" (`client_form_walkthrough.spec.ts` dòng 87 và 152; `walkthrough_harness.ts`). Trên máy nhanh, tín hiệu này đến trước dữ liệu.
3. Nặng hơn: ở S2, `before` được đọc ngay sau `goToList`, mà hàm này chỉ chờ tiêu đề. Nếu `before` đọc ra `[]` và danh sách sau đó cũng `[]`, phép kiểm "không tạo thêm khách" **đạt mà không kiểm gì**.

**Chứng minh:** trên bản sao của Orchestrator, chỉ đổi `useState(false)` thành `useState(true)` cho `loading` trong `use_client_list`. Kết quả: e2e đạt 17/17 cả **3/3 lần**, và 50 kiểm thử dựng trang vẫn đạt. Bản sửa này chỉ để kiểm chứng; đã hoàn nguyên, không đụng mã dự án.

**Vì sao máy Windows của agent không gặp:** máy chậm hơn nên dữ liệu kịp về trước khi kiểm thử đọc. Đây đúng là dạng lỗi mà luật "kiểm chứng trên máy khác" sinh ra để bắt.

**Việc sửa (phiên 17):**
- Hook nào tải ngay khi mở trang thì khởi tạo cờ tải là `true`: `use_client_list.loading`, `use_client_detail.loading`, `use_client_form.opening`. Như vậy khung hình đầu đã là trạng thái đang tải, nút không bật sớm.
- Spec chờ **nội dung đã tải** (danh sách có tên, hoặc trạng thái rỗng, hoặc thông báo lỗi), không chờ trạng thái nút. Ở S2, khẳng định `before` khác rỗng trước khi so.
- Thêm kiểm thử dựng trang: lần vẽ đầu của cả ba trang hiện chỉ báo đang tải, và nút tải lại chưa bật.
- Tiêu chí hoàn tất: e2e chạy liền **5 lần** trên Windows, cả 5 lần đạt. Orchestrator chạy lại trên Linux.

## 4. UI-5 — Kiểm "hàng liên hệ thiếu một ô" và "tên chỉ có khoảng trắng" không có trong hợp đồng (cần Project Owner quyết)

Agent nêu đúng. Hợp đồng ghi `display_name: string (1..120 characters)` và `contacts: list[object { channel: string, value: string }]`. Backend (phiên 15) nhận tên `"   "` và liên hệ có ô rỗng. Luật "bỏ khoảng trắng hai đầu; thiếu một ô là lỗi" do Orchestrator viết trong `ui_decomposition.md` §5, và đó là luật dữ liệu, không phải luật trình bày. Nếu chỉ giao diện giữ luật này, dữ liệu rác vẫn vào được qua mọi đường khác (công cụ kiểm thử, khôi phục bản sao lưu cũ, và các bên gọi sau này).

**Đề xuất của Orchestrator — CT-2, Data Schema 6.2.0 → 6.3.0** (`manage_client.input_expected.client_input`):

```
display_name: string (1..120 characters, not blank: at least one non-whitespace character)
contacts: list[object { channel: string (1.. characters, not blank; free label, e.g. email, facebook, discord, zalo), value: string (1.. characters, not blank) }]
```

- Backend: một phiên nhỏ thêm ràng buộc và kiểm thử cho `create_client` và `edit_client`; trả `400 ERR_VALIDATION`, không đổi nhãn nào.
- Giao diện: luật hiện có trở thành bản sao của hợp đồng. Bỏ khoảng trắng hai đầu vẫn là việc chuẩn hóa của giao diện trước khi gửi, ghi rõ là `[UI-ONLY]`.
- Ảnh hưởng: API Contract không đổi, vì nhãn và mã lỗi giữ nguyên. Dữ liệu cũ không cần chuyển đổi: chưa có dữ liệu thật, và luật chỉ áp khi ghi.

**Phương án thay thế:** giữ hợp đồng, ghi luật này thành ngoại lệ `[UI-ONLY]` trong `ui_decomposition.md` §5. Rẻ hơn, nhưng để hở tầng dữ liệu. Orchestrator **không khuyến nghị**, vì ưu tiên số một của V1 là nền tảng vững.

## 5. Các điểm khác của phiên

- **Đảo thứ tự việc 4 và việc 6** (làm `NavMenu`, `Inline`, `AppFrame` cùng lúc với điều hướng): hợp lý, có ghi trong checkpoint, không bỏ việc nào.
- **Routers phát hiện lỗi, Services chọn câu:** đúng iWCA I3.4/I3.5. Plan ghi "Services kiểm dữ liệu form" là Orchestrator viết lỏng; không phải lỗi của agent.
- **Checkpoint:** cả bốn khối đọc được, không khối nào có `UNSOLVED_PROBLEMS`. Đề xuất trạng thái trang nằm ở NOTE, agent không tự sửa `ui_decomposition.md`. Đúng giao thức.
- **Ngoại lệ lint:** chỉ một (tệp kiểm thử miễn R13), đúng plan. Không có `eslint-disable`.

## 6. Quan sát cho V2 (không làm ở V1; ghi để không mất)

Mã quan sát: UI-6.

1. **Tương phản phi văn bản** (WCAG 1.4.11, cần ≥ 3:1): viền ô nhập `#454545` trên nền trang chỉ đạt **1.78:1**, trên nền ô 1.44:1; nền ô so với nền trang 1.24:1. Nhãn ở ngay trên ô nên V1 vẫn dùng được. Hai cặp đạt: vòng focus 7.74:1, viền lỗi 3.66:1.
2. **Nút "Lưu" nằm dưới mép cửa sổ** khi form có ghi chú hoặc vài liên hệ (cửa sổ 1200×800); agent cũng đã tự nêu. Nút "Hủy" cũng vậy.
3. **Enter không lưu form**, vì không dùng thẻ `<form>`.
4. **Mất focus khi bấm "Lưu":** nút bị vô hiệu lúc đang lưu nên focus rơi về `body`. Khi có lỗi, focus cũng không chuyển tới ô lỗi đầu tiên.
5. **Thứ bậc trang chi tiết:** tên khách, là chủ thể của trang, là tiêu đề cấp nhóm, nhỏ hơn tiêu đề chung "Chi tiết khách hàng".
6. **Gửi `POST` lại sau `unreachable`:** nếu backend đã ghi nhưng câu trả lời bị mất (ví dụ quá thời gian chờ), bấm "Lưu" lần nữa sẽ tạo trùng. Trên loopback trong một máy thì hiếm; chấp nhận ở V1.
7. **Thông báo lưu trữ còn lại sau "Tải lại"** ở trang chi tiết. Vô hại.

## 7. Trạng thái trang

`client_list`, `client_detail`, `client_form`: **giữ `đang_làm`**. Chuyển sang `hoàn_tất` khi đủ ba điều:
1. UI-4 đã sửa và Orchestrator chạy lại được e2e ổn định;
2. UI-5 đã được quyết, và nếu duyệt CT-2 thì backend đã làm xong;
3. Project Owner tự chạy tay ba kịch bản.

## Phụ lục — sau quyết định của Project Owner (2026-09-28, 11:37)

- **CT-2 đã duyệt và ghi, ở Data Schema 7.0.0, không phải 6.3.0 như §4 đề xuất.** Theo `02-contract.md` (số phiên bản) và tiền lệ v5.0.0, thu hẹp giá trị đầu vào được chấp nhận là thay đổi phá vỡ. Kèm theo:
  - `formats.not_blank`;
  - `manage_client` chuyển `đã_hoàn_thiện` → `đang_triển_khai`, chờ backend áp dụng (BE-5).
- **Đính chính §6 mục 7:** "thông báo lưu trữ còn lại sau Tải lại" không xảy ra được. Trang chi tiết chỉ có nút tải lại khi tải thất bại, lúc đó chưa thể có kết quả lưu trữ. Rút lại.
- **Đính chính §7, điều kiện 2:** trạng thái của ba trang không phụ thuộc phần backend của CT-2. Luật "not blank" ở giao diện không đổi hành vi khi backend thay đổi. BE-5 là điều kiện để `manage_client` (backend) trở lại `đã_hoàn_thiện`, không phải điều kiện của trang. Ba trang chuyển `hoàn_tất` khi:
  1. phiên 17 xong và Orchestrator audit đạt;
  2. Project Owner tự chạy tay ba kịch bản.
- **Phạm vi phiên 17** (Project Owner yêu cầu vá mọi chỗ chưa đạt chuẩn): UI-4; CT-2 phía giao diện; và từ UI-6: tương phản 3:1 cho thành phần tương tác, hàng nút của form dưới tiêu đề, focus tới ô lỗi đầu tiên. Chuẩn tương ứng đã được ghi vào `ui_decomposition.md` §7.1 và §7.2. Các mục UI-6 còn lại để V2, lý do ở `.plan/open_issues.md`.
