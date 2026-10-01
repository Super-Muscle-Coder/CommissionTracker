# AUDIT — PHIÊN 24 (LAYER GIAO DIỆN, CHẶNG D5: THU NHẬP; THU DỮ LIỆU UI-11)

*Orchestrator, 2026-10-01. Đối chiếu với `.plan/ui_plan.md` (plan phiên 24), `.design/ui_decomposition.md` mục "Chặng D5 — Thu nhập", Data Schema 9.0.1, API Contract 4.0.0, skill `iwca-implementation`, và các khối checkpoint `main`, `kit`, `screens`, `view_income_report`. Định danh phiên của agent: `coding-agent@2026-09-30#3`. Mốc so sánh: commit `6216e4a` cộng commit `OS - I1 for D5; plan and prompt for session 24` trên máy Project Owner.*

## 1. Kết luận

**Đạt về chức năng.** Mọi con số của báo cáo được xác nhận độc lập trên máy thứ hai, ổn định qua nhiều lần chạy. Trang `income_report` đúng đặc tả D5.

**Có một chỗ sai trong đặc tả, lỗi của Orchestrator, không phải của agent** (§5.1): đặc tả D5 bắt giao diện kiểm "ngày bắt đầu sau ngày kết thúc", trong khi iWCA §5 cấm kiểm điều không viết trong `type`. Agent đã làm đúng đặc tả và nêu câu hỏi đúng chỗ. Orchestrator đề xuất **CT-5** (Data Schema 9.0.2) để đưa luật vào `type`, chờ Project Owner quyết.

`income_report` **đủ điều kiện `hoàn_tất`** sau khi Project Owner chạy tay D5 và quyết CT-5. Nếu CT-5 được duyệt, hành vi không đổi.

## 2. Phạm vi sửa

- So mọi tệp trong `UI/src`, `UI/tests`, `UI/scripts` có thời điểm ghi trong phiên với bản đã commit. Danh sách khớp `git status` của báo cáo.
- Sửa ở tệp cũ, đều đúng phạm vi:
  - `main.tsx`: ráp nối `view_income_report` với nguồn "bây giờ" riêng (`() => new Date()`), không dùng chung với `record_payment`;
  - `navigation.ts`, `logic_context.ts`: khóa `income_report`, mục "Thu nhập" đứng thứ tư;
  - `kit/index.ts`, `check_contrast.mjs`: component `Caption` mới; cặp màu của nó đã có sẵn (`--color-text-muted` trên `--color-surface`);
  - `commission_list` và `progress_board` spec: mỗi chỗ chỉ thêm `['Thu nhập', null]` vào danh sách mục điều hướng mong đợi. Không đổi hành vi;
  - `app_root.test.tsx`, `fake_logic.tsx`: thêm trang mới vào bảng thử;
  - `walkthrough_harness.ts`, `walkthrough_lib.mjs`, `walkthrough_app.mjs`: hàm hỗ trợ D5 và dữ liệu mẫu `--income`, mở rộng từ mẫu D4.
- Các trang đã `hoàn_tất` không đổi hành vi.

## 3. Những gì đã tự chạy lại

Môi trường: Linux, Node 24, Xvfb; Backend ở trạng thái phiên 23.

| Hạng mục | Báo cáo agent | Orchestrator chạy lại | Kết quả |
|---|---|---|---|
| `npm run check` | 1303 | **1303/1303, hai lần**; 19 + 13 cặp tương phản đạt; 147 tệp không vi phạm R1–R14; `lint:e2e` sạch | khớp |
| Vitest lặp lại | một lần `StageChange.test.tsx:183` hỏng ở mốc | **10/10 lần** đều 1303/1303 | không tái hiện (§5.4) |
| Spec `income_report` riêng | 10/10 | **10/10** | ổn định |
| `npm run e2e` | 5/5, 59 ca | **5/5, mỗi lần 59 ca**, không đặt runner | ổn định |
| UI-8 | `UI/evidence` không đổi | Băm toàn bộ `UI/evidence` trước và sau 15 lần chạy: giống hệt | đạt |
| Cắn: bỏ luật thứ tự ngày | — | **3 ca hỏng** | đạt |
| Cắn: đảo thứ tự tháng | — | **2 ca hỏng** | đạt |
| Cắn: bỏ dấu trừ của số âm | — | **6 ca hỏng** | đạt |
| Số liệu của dữ liệu mẫu | USD 20,05 / 0,00 / −7,55; VND 5.100.000 / 500.000 / 6.000.000 | Tự tính từ dữ liệu mẫu (§4) | khớp |
| Checkpoint | không `UNSOLVED_PROBLEMS` | Parse YAML cả bốn khối: hợp lệ, không trùng id, `UNSOLVED_PROBLEMS: []` | đạt (§5.5) |
| Dữ liệu UI-11 | 1280 lần chụp, 4 lần hết giờ | Đọc lại nhật ký gộp: 1280 lần, trung bình 217 ms, 4 lần > 2,5 s, đều ~30 s | khớp |
| Thời gian chụp trên Linux | — | 87 lần (lần chạy cuối), lớn nhất 104 ms | ghi nhận |

## 4. Đối chiếu với đặc tả D5

- **Lời gọi:** đúng một lời gọi; `period_from`, `period_to` đi qua tham số truy vấn. Adapters kiểm đủ các điều plan yêu cầu, gồm `refunded_minor >= 0` và số nguyên an toàn. Không kiểm thứ tự.
- **Khoảng mặc định:** ngày 1/1 tới hôm nay, đọc theo giờ máy (`getFullYear`, `getMonth`, `getDate`). Có ca 00:30 ngày 1/1 giờ Việt Nam.
- **Số tiền:** cắt từ chuỗi chữ số, không chia số thực; số âm có dấu trừ; mã tiền lạ hiện đơn vị nhỏ nhất.
- **Dòng "Từ … đến … · Lập lúc …"** lấy từ kết quả, không từ ô nhập. Ảnh `S4-from-after-to` cho thấy ô "Từ ngày" đã sửa thành 01/10 mà dòng vẫn ghi 01/08: đúng.
- **Lỗi nhập giữ báo cáo cũ; lỗi tải bỏ báo cáo cũ.** Đúng đặc tả, có kiểm thử cắn của agent.
- **Ba nhãn** đúng chữ; "Còn phải thu" ghi rõ "(mọi đơn chưa hủy, tính tới lúc lập)", kèm dòng giải thích.
- **Số liệu mẫu, Orchestrator tự tính** cho khoảng 01/08–30/09/2026:
  - VND thực nhận = 3.000.000 + 2.000.000 + 100.000 (tip) − 500.000 (hoàn) + 500.000 (đơn đã hủy, tháng 8) = **5.100.000**;
  - VND còn phải thu = 4.500.000 ("Minh họa bìa sách") + 1.500.000 ("Chân dung bán thân") = **6.000.000**; đơn đã hủy không tính;
  - USD thực nhận = 15,00 + 5,05 = **20,05**; còn phải thu = 12,50 − 20,05 = **−7,55**.
- **Hai chỗ trình bày khác đặc tả, Orchestrator chấp nhận:**
  1. Dòng "Từ … đến …" nằm trong phần báo cáo, dưới hai ô ngày, không phải ngay dưới tiêu đề. Hợp lý: dòng này thuộc về báo cáo, và mất đi cùng báo cáo khi tải lỗi.
  2. Routers có hai lối vào (`defaultPeriod`, `viewIncomeReport`) thay vì "mở trang" gộp: để tải lỗi vẫn giữ được hai ngày mặc định trong ô.
- **Năm 0000** bị coi là ngày không có thật, khớp với backend (Python không có năm 0). Chấp nhận.

## 5. Phát hiện

### 5.1 CT-5 (trung bình) — đặc tả D5 trái iWCA §5; lỗi của Orchestrator

iWCA §5 viết: phía giao diện "**không bao giờ kiểm** bất cứ điều gì không viết trong `type`", và lấy ví dụ đúng loại này, "một điều kiện giữa hai trường". Luật "`period_from` sau `period_to` là không hợp lệ" nằm trong `description` của `view_income_report`, không trong `type`. Khi viết đặc tả D5, Orchestrator vẫn gọi đó là "bản sao của luật hợp đồng" và bắt giao diện kiểm. Agent làm đúng đặc tả và nêu câu hỏi trong NOTES. Đây là lỗi của Orchestrator.

Lý do của luật iWCA là tránh một nguồn sự thật thứ hai. Ở đây luật đã nằm trong hợp đồng, chỉ sai chỗ. Hai cách sửa:

- **(A, Orchestrator đề xuất) Data Schema 9.0.2:** đưa luật vào `type`: `period_to: { type: "date (on or after period_from)", from: end_user }`. Giá trị đầu vào được chấp nhận không đổi, nên chỉ tăng số cuối. Backend không đổi gì. Giao diện giữ nguyên hành vi; phiên giao diện kế tiếp chỉ đổi số phiên bản và chú thích trong Configs.
- **(B)** Bỏ phép kiểm ở giao diện. Ngày đảo ngược sẽ đi tới backend và nhận 400; trang hiện "Máy chủ không nhận khoảng thời gian này.", một câu kém rõ hơn, và không còn chỉ ra ô sai.

### 5.2 UI-11 (trung bình, không chặn) — giả thuyết datalist bị bác; dữ liệu chỉ về phía "cửa sổ ngừng vẽ"

Orchestrator mở hai trace (`payment_form-S1-errors`, `client_form-S5-saved`). Cả hai cho cùng một nhật ký:

```
- taking page screenshot
- waiting for fonts to load...
- fonts loaded
```

Sau đó lệnh treo đủ 30 s. Ngay sau đó, ảnh chụp khi hỏng của chính Playwright chụp được trong khoảng 2,2 s.

**Kết luận từ dữ liệu:**
- **Giả thuyết datalist (phiên 22) bị bác.** `payment_form-S1-errors` hết giờ lại, **dù** cú bấm vào tiêu đề đã chạy xong 2 s trước đó (trace có bước này).
- **Không liên quan backend:** 3 trong 4 lần xảy ra khi backend đang bật.
- **Không phải "chậm":** phân bố có hai mode. Mọi lần chụp khác dưới 2,5 s; bốn lần này đều ~30 s. Đây là treo, không phải chậm dần.
- **Đi thành cụm khi máy nghẽn.** Trong trace, mỗi cú bấm mất khoảng 1,8–2 s (bình thường vài chục ms).
- Phù hợp nhất với giả thuyết thứ ba đã ghi từ phiên 21: **cửa sổ Electron không vẽ khung hình mới**. Lệnh chụp chờ một khung hình không bao giờ tới. Trên Windows, Chromium có thể ngừng vẽ cửa sổ mà nó cho là bị che hoặc ở nền.

**Orchestrator không nắm chắc** cơ chế cụ thể, cũng như cờ dòng lệnh nào của Chromium tắt được việc đó. Đề xuất một thí nghiệm có kiểm soát cho phiên giao diện kế tiếp (ghi ở `open_issues` UI-11):
- chỉ trong lệnh khởi chạy Electron của harness kiểm thử, không ở ứng dụng thật, bật các cờ tắt cơ chế "cửa sổ bị che thì ngừng vẽ";
- so số lần hết giờ trên cùng máy với và không có cờ.

Ghi chú: đó là thay đổi điều kiện môi trường kiểm thử, không phải nới thời gian chờ.

### 5.3 DSK-15 nâng mức (thấp → trung bình) — ô ngày và dòng báo cáo dùng hai kiểu ngày trên cùng một màn hình

Ảnh `S4-from-after-to`: ô "Từ ngày" hiện `10/01/2026` (tháng/ngày, do Electron dùng `en-US`), ngay trên dòng báo cáo "Từ 01/08/2026 …" (ngày/tháng). Họa sĩ Việt Nam đọc `10/01/2026` thành 10 tháng 1. Ở D2 (hạn giao) điều này chỉ khó chịu; ở D5, nơi người dùng chọn khoảng thời gian rồi đọc số, nó dễ dẫn tới **đọc sai báo cáo**.

Đề xuất: đưa phiên dọn desktop (DSK-12, 13, 14, 15) lên **trước D6**.

### 5.4 UI-12 (thấp) — ca focus `StageChange.test.tsx:183` không tất định trên Windows

Agent gặp ca này hỏng một lần ở lần chạy mốc đầu phiên; phiên 22 cũng gặp một lần. Orchestrator chạy 20 lần qua hai phiên trên Linux, không lần nào hỏng. Hai lần trên Windows là đủ để ghi sổ. Việc: phiên giao diện kế tiếp đọc ca này, tìm chỗ phụ thuộc thời điểm (focus sau khi vẽ lại).

### 5.5 Thời điểm trong checkpoint lại muộn hơn thời điểm ghi tệp (thấp)

| Khối | Ghi trong checkpoint | Tệp được ghi lúc |
|---|---|---|
| `view_income_report` | 20:20 | 20:17:48 |
| `kit` | 20:22 | 20:18:42 |
| `screens` | 20:22 | 20:18:14 |
| `main` | 20:25 | 20:19:55 |

Lệch 2–5 phút, cùng chiều với BE-8 (phiên 23). Không ảnh hưởng hành vi. Plan sau thêm một dòng: lấy giờ bằng lệnh (`Get-Date -Format o`) ngay trước khi ghi, không ước lượng. Gộp vào BE-8 thành một mục quy trình.

### 5.6 Hai điểm trình bày cho V2 (thấp, ghi vào UI-6)

- Lỗi "ngày kết thúc trước ngày bắt đầu" kèm khung tổng "Một số ô chưa đúng định dạng". Câu tổng là của layer, và với lỗi thứ tự thì chữ "định dạng" không đúng nghĩa.
- Danh sách theo tháng không có tiêu đề nhìn thấy, chỉ có `aria-label` (câu hỏi của agent). Đặc tả D5 không đòi; người đọc vẫn hiểu nhờ chữ "Tháng M/YYYY". Để V2.

### 5.7 Giai đoạn máy nghẽn (ghi nhận)

Agent ghi lại 7 lượt e2e hỏng liên tiếp (23:55–00:31). Trong đó có hai lỗi không phải chụp ảnh: một `locator.click` hết giờ, và "backend không bật lại trong 60 s". Sau đó 5 lượt cuối sạch. Cách xử lý đúng: không tính, không che, ghi rõ, chạy lại khi máy ổn định. Nghi ENV-2 (AVG). Không kết luận thêm khi chưa có dữ liệu.

## 6. Trạng thái trang

`income_report`: **đủ điều kiện `hoàn_tất`**, chờ hai việc của Project Owner:
1. chạy tay D5 (báo cáo agent, phần "Các bước bấm tay");
2. quyết CT-5 (A hay B).

## 7. Commit

`CAS24`, gồm cả `UI/evidence`. **Không** gồm `UI/test-results/` (đã bị git bỏ qua; trace UI-11 nằm ở đó, giữ lại trên máy).
